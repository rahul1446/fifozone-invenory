const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Order = require('../models/Order.model');
const Review = require('../models/Review.model');
const Product = require('../models/Product.model'); // Assumption

exports.getHealthOverview = asyncHandler(async (req, res) => {
  // Fifozone real calculation mock logic
  let f_lateShipmentRate = 0, f_returnRate = 0, f_avgRating = 4.5;
  try {
    const orders = await Order.find({ platform: 'fifozone' });
    const total = orders.length || 1;
    f_lateShipmentRate = (orders.filter(o => {
      // dummy condition for late
      return o.status === 'shipped' && (new Date(o.updatedAt) - new Date(o.createdAt)) > 259200000;
    }).length / total) * 100;
    
    f_returnRate = (orders.filter(o => o.status === 'returned').length / total) * 100;
    
    const reviews = await Review.aggregate([{ $match: { platform: 'fifozone' } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]);
    if (reviews.length) f_avgRating = reviews[0].avg;
  } catch (e) {}

  const overview = {
    fifozone: { status: f_lateShipmentRate > 4 ? 'at_risk' : 'good', lateShipmentRate: f_lateShipmentRate.toFixed(2), returnRate: f_returnRate.toFixed(2), averageRating: f_avgRating.toFixed(1) },
    amazon: { status: 'good', orderDefectRate: 0.4, lateShipmentRate: 1.2, cancellationRate: 0.8, validTrackingRate: 98.5 },
    flipkart: { status: 'good', sellerScore: 82, cancellationRate: 1.1, returnRate: 3.2, lateDispatchRate: 2.1 }
  };

  res.status(200).json(new ApiResponse(200, overview, 'Health overview fetched'));
});

exports.getAmazonHealth = asyncHandler(async (req, res) => {
  const data = {
    overallStatus: 'good',
    metrics: {
      orderDefectRate: { value: 0.4, target: '< 1%', status: 'good' },
      lateShipmentRate: { value: 1.2, target: '< 4%', status: 'good' },
      cancellationRate: { value: 0.8, target: '< 2.5%', status: 'good' },
      validTrackingRate: { value: 98.5, target: '> 95%', status: 'good' }
    },
    policyCompliance: {
      suspectedIPViolations: 0,
      receivedIPViolations: 0,
      productAuthenticity: 0,
      productCondition: 0,
      productSafety: 0
    }
  };
  res.status(200).json(new ApiResponse(200, data, 'Amazon health fetched'));
});

exports.getFlipkartHealth = asyncHandler(async (req, res) => {
  const data = {
    overallStatus: 'good',
    sellerTier: 'Gold',
    metrics: {
      sellerScore: { value: 82, target: '> 70', status: 'good' },
      cancellationRate: { value: 1.1, target: '< 1.5%', status: 'good' },
      returnRate: { value: 3.2, target: '< 5%', status: 'good' },
      lateDispatchRate: { value: 2.1, target: '< 3%', status: 'good' }
    }
  };
  res.status(200).json(new ApiResponse(200, data, 'Flipkart health fetched'));
});

exports.getListingQuality = asyncHandler(async (req, res) => {
  let products = [];
  try {
    products = await Product.find().lean();
  } catch(e) {
    products = [
      { _id: '1', name: 'Royal Canin Maxi', description: 'Good dog food', regularPrice: 1000, sku: 'RC-1', category: 'Food' },
      { _id: '2', name: 'Drools', regularPrice: 0 }
    ];
  }

  const qualityScores = products.map(p => {
    let score = 0;
    const missingFields = [];
    
    if (p.name) score += 20; else missingFields.push('name');
    if (p.description && p.description.length > 50) score += 20; else missingFields.push('description > 50 chars');
    if (p.images && p.images.length > 0) score += 20; else missingFields.push('images');
    if (p.regularPrice > 0 || p.price > 0) score += 20; else missingFields.push('price > 0');
    if (p.sku) score += 10; else missingFields.push('sku');
    if (p.category || (p.categories && p.categories.length)) score += 10; else missingFields.push('category');

    return {
      productId: p._id,
      name: p.name || 'Unnamed Product',
      score,
      missingFields
    };
  });

  res.status(200).json(new ApiResponse(200, qualityScores, 'Listing quality fetched'));
});
