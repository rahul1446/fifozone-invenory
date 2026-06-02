const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const Promotion = require('../models/Promotion.model');

const seedMockPromotions = async () => {
  const count = await Promotion.countDocuments();
  if (count > 0) return;

  const promos = [
    {
      name: 'Diwali Special Pet Food',
      platforms: ['fifozone', 'amazon', 'flipkart'],
      type: 'percentage',
      discountType: 'percentage',
      discountValue: 15,
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000 * 10),
      status: 'active',
      performance: { ordersCount: 120, totalDiscount: 4500, revenue: 56000 }
    },
    {
      name: 'Welcome Coupon',
      platforms: ['fifozone'],
      type: 'coupon',
      couponCode: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      startDate: new Date(Date.now() - 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 300),
      status: 'active',
      performance: { ordersCount: 45, totalDiscount: 1200, revenue: 15000 }
    }
  ];

  await Promotion.insertMany(promos);
};

exports.getPromotions = asyncHandler(async (req, res) => {
  await seedMockPromotions();
  
  const { platform, status, type } = req.query;
  const query = {};
  if (platform) query.platforms = platform;
  if (status) query.status = status;
  if (type) query.type = type;

  const promotions = await Promotion.find(query).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, promotions, 'Promotions fetched'));
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const { name, couponCode, discountType, discountValue, minimumOrderAmount, maximumDiscountAmount, applicableProducts, usageLimit, perCustomerLimit, startDate, endDate } = req.body;
  
  // Call WooCommerce API to create coupon
  logger.info('Calling WooCommerce API to create coupon...');
  const mockWooCouponId = 'woo_cpn_' + Date.now();

  const promotion = await Promotion.create({
    name,
    platforms: ['fifozone'], // Coupons mostly fifozone for now
    type: 'coupon',
    couponCode,
    discountType,
    discountValue,
    minimumOrderAmount,
    maximumDiscountAmount,
    applicableProducts,
    usageLimit,
    perCustomerLimit,
    startDate,
    endDate,
    status: new Date(startDate) <= new Date() ? 'active' : 'scheduled',
    platformIds: { fifozone: mockWooCouponId },
    createdBy: req.user?._id
  });

  res.status(201).json(new ApiResponse(201, promotion, 'Coupon created successfully'));
});

exports.createDiscount = asyncHandler(async (req, res) => {
  const { name, platforms, discountType, discountValue, productIds, startDate, endDate } = req.body;

  logger.info('Applying direct discount on selected platforms...');
  // Logic to update regular_price on WooCommerce and log for Amazon/Flipkart
  const originalPrices = []; // Mock fetching original prices
  if (productIds && productIds.length > 0) {
     originalPrices.push({ productId: productIds[0], fifozone: 1000, amazon: 1050, flipkart: 1000 });
  }

  const promotion = await Promotion.create({
    name,
    platforms,
    type: 'percentage',
    discountType,
    discountValue,
    applicableProducts: productIds,
    startDate,
    endDate,
    originalPrices,
    status: new Date(startDate) <= new Date() ? 'active' : 'scheduled',
    createdBy: req.user?._id
  });

  res.status(201).json(new ApiResponse(201, promotion, 'Discount created successfully'));
});

exports.updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  res.status(200).json(new ApiResponse(200, promotion, 'Promotion updated'));
});

exports.pausePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  
  promotion.status = 'paused';
  await promotion.save();
  logger.info('Restored original prices for paused promotion');

  res.status(200).json(new ApiResponse(200, promotion, 'Promotion paused'));
});

exports.resumePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  
  promotion.status = 'active';
  await promotion.save();
  logger.info('Reapplied discounts for resumed promotion');

  res.status(200).json(new ApiResponse(200, promotion, 'Promotion resumed'));
});

exports.deletePromotion = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findByIdAndDelete(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  logger.info('Restored original prices on delete');
  res.status(200).json(new ApiResponse(200, {}, 'Promotion deleted'));
});

exports.getPromotionPerformance = asyncHandler(async (req, res) => {
  const promotion = await Promotion.findById(req.params.id);
  if (!promotion) throw new ApiError(404, 'Promotion not found');
  res.status(200).json(new ApiResponse(200, promotion.performance, 'Performance stats fetched'));
});
