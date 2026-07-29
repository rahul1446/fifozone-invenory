const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const Promotion    = require('../models/Promotion.model');
const Product      = require('../models/Product.model');

// ── Helper: auto-update statuses ──
const syncStatuses = async () => {
  const now = new Date();
  await Promotion.updateMany(
    { endDate: { $lt: now }, status: { $in: ['active', 'scheduled'] } },
    { $set: { status: 'expired' } }
  );
  await Promotion.updateMany(
    { startDate: { $lte: now }, endDate: { $gte: now }, status: 'scheduled' },
    { $set: { status: 'active' } }
  );
};

// GET /promotions
exports.getPromotions = asyncHandler(async (req, res) => {
  await syncStatuses();
  const { status, type, targetType } = req.query;
  const query = {};
  if (status)     query.status     = status;
  if (type)       query.type       = type;
  if (targetType) query.targetType = targetType;

  const promotions = await Promotion.find(query)
    .populate('applicableProducts', 'masterName sku mrp')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, promotions, 'Fetched successfully'));
});

// POST /promotions/discount
exports.createDiscount = asyncHandler(async (req, res) => {
  const {
    name, description, platforms, discountType, discountValue, maximumDiscountAmount,
    targetType, productIds, brands, categories, subcategories, startDate, endDate
  } = req.body;

  if (!name || !discountValue || !startDate || !endDate)
    throw new ApiError(400, 'Name, discount value, start and end date are required');
  if (new Date(endDate) <= new Date(startDate))
    throw new ApiError(400, 'End date must be after start date');

  const status = new Date(startDate) <= new Date() ? 'active' : 'scheduled';

  const promotion = await Promotion.create({
    name, description: description || '', type: 'discount',
    platforms: platforms || ['fifozone'],
    discountType: discountType || 'percentage',
    discountValue, maximumDiscountAmount,
    targetType: targetType || 'all',
    applicableProducts:     productIds     || [],
    applicableBrands:       brands         || [],
    applicableCategories:   categories     || [],
    applicableSubcategories:subcategories  || [],
    startDate, endDate, status,
    createdBy: req.user?._id
  });

  res.status(201).json(new ApiResponse(201, promotion, 'Discount created'));
});

// POST /promotions/coupon
exports.createCoupon = asyncHandler(async (req, res) => {
  const {
    name, description, couponCode, platforms,
    discountType, discountValue, maximumDiscountAmount,
    minimumOrderAmount, usageLimit, perCustomerLimit,
    startDate, endDate
  } = req.body;

  if (!name || !couponCode || !discountValue || !startDate || !endDate)
    throw new ApiError(400, 'Name, coupon code, discount value, start and end date are required');
  if (new Date(endDate) <= new Date(startDate))
    throw new ApiError(400, 'End date must be after start date');

  // Check coupon code uniqueness
  const existing = await Promotion.findOne({ couponCode: couponCode.toUpperCase() });
  if (existing) throw new ApiError(409, `Coupon code "${couponCode.toUpperCase()}" already exists`);

  const status = new Date(startDate) <= new Date() ? 'active' : 'scheduled';

  const promotion = await Promotion.create({
    name, description: description || '', type: 'coupon',
    couponCode: couponCode.toUpperCase(),
    platforms: platforms || ['fifozone'],
    discountType: discountType || 'percentage',
    discountValue, maximumDiscountAmount,
    minimumOrderAmount: minimumOrderAmount || 0,
    usageLimit:         usageLimit || null,
    perCustomerLimit:   perCustomerLimit || 1,
    targetType: 'all',
    startDate, endDate, status,
    createdBy: req.user?._id
  });

  res.status(201).json(new ApiResponse(201, promotion, 'Coupon created'));
});

// POST /promotions/validate-coupon
exports.validateCoupon = asyncHandler(async (req, res) => {
  const { couponCode, cartTotal } = req.body;
  if (!couponCode) throw new ApiError(400, 'Coupon code is required');

  await syncStatuses();

  const coupon = await Promotion.findOne({
    couponCode: couponCode.toUpperCase(),
    type: 'coupon',
    status: 'active'
  });

  if (!coupon) throw new ApiError(404, 'Invalid or expired coupon code');

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
    throw new ApiError(400, 'This coupon has reached its usage limit');

  const cart = parseFloat(cartTotal) || 0;
  if (cart < (coupon.minimumOrderAmount || 0))
    throw new ApiError(400, `Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon`);

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cart * coupon.discountValue) / 100;
    if (coupon.maximumDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }
  discountAmount = Math.min(discountAmount, cart); // can't exceed cart total

  res.status(200).json(new ApiResponse(200, {
    valid: true,
    couponCode: coupon.couponCode,
    couponName: coupon.name,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount: Math.round(discountAmount * 100) / 100,
    minimumOrderAmount: coupon.minimumOrderAmount,
    message: `Coupon applied! You save ₹${discountAmount.toFixed(2)}`
  }, 'Coupon valid'));
});

// PATCH /promotions/:id
exports.updatePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!promo) throw new ApiError(404, 'Not found');
  res.status(200).json(new ApiResponse(200, promo, 'Updated'));
});

// PATCH /promotions/:id/pause
exports.pausePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new ApiError(404, 'Not found');
  promo.status = 'paused';
  await promo.save();
  res.status(200).json(new ApiResponse(200, promo, 'Paused'));
});

// PATCH /promotions/:id/resume
exports.resumePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new ApiError(404, 'Not found');
  if (new Date(promo.endDate) < new Date())
    throw new ApiError(400, 'Cannot resume an expired promotion. Update the end date first.');
  promo.status = new Date(promo.startDate) <= new Date() ? 'active' : 'scheduled';
  await promo.save();
  res.status(200).json(new ApiResponse(200, promo, 'Resumed'));
});

// DELETE /promotions/:id
exports.deletePromotion = asyncHandler(async (req, res) => {
  const promo = await Promotion.findByIdAndDelete(req.params.id);
  if (!promo) throw new ApiError(404, 'Not found');
  res.status(200).json(new ApiResponse(200, {}, 'Deleted'));
});

// GET /promotions/:id/performance
exports.getPromotionPerformance = asyncHandler(async (req, res) => {
  const promo = await Promotion.findById(req.params.id);
  if (!promo) throw new ApiError(404, 'Not found');
  res.status(200).json(new ApiResponse(200, promo.performance, 'Performance fetched'));
});

// GET /promotions/meta — brands, categories, subcategories for dropdowns
exports.getDiscountMeta = asyncHandler(async (req, res) => {
  const [brands, categories, subcategories] = await Promise.all([
    Product.distinct('brand',       { isActive: true, brand:       { $ne: '' } }),
    Product.distinct('category',    { isActive: true, category:    { $ne: '' } }),
    Product.distinct('subCategory', { isActive: true, subCategory: { $ne: '' } }),
  ]);
  res.status(200).json(new ApiResponse(200, { brands, categories, subcategories }, 'Meta fetched'));
});
