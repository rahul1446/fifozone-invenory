const InventoryLog = require('../models/InventoryLog.model');
const Product = require('../models/Product.model');
const SyncService = require('../services/sync.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getInventoryLogs = asyncHandler(async (req, res) => {
  const { product, changeType, platform, page = 1, limit = 20 } = req.query;
  const query = {};

  if (product) query.product = product;
  if (changeType) query.changeType = changeType;
  if (platform) query.platform = platform;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await InventoryLog.countDocuments(query);
  const logs = await InventoryLog.find(query)
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json(
    new ApiResponse(200, {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Inventory logs fetched successfully')
  );
});

const manualRestock = asyncHandler(async (req, res) => {
  const { productId, addQty, removeQty, reason, note, platformChecks } = req.body;
  // platformChecks is object like { fifozone: true, amazon: true, flipkart: true, warehouse: true }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const prevStock = product.totalStock;
  const addValue = parseInt(addQty) || 0;
  const removeValue = parseInt(removeQty) || 0;
  const finalDelta = addValue - removeValue;

  if (finalDelta === 0) {
    throw new ApiError(400, 'Specify a non-zero restock delta');
  }

  // Calculate new stocks
  product.totalStock = Math.max(0, product.totalStock + finalDelta);

  if (platformChecks) {
    if (platformChecks.fifozone) product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone + finalDelta);
    if (platformChecks.amazon) product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon + finalDelta);
    if (platformChecks.flipkart) product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart + finalDelta);
    if (platformChecks.warehouse) product.stockByPlatform.warehouse = Math.max(0, product.stockByPlatform.warehouse + finalDelta);
  } else {
    // Default dump to warehouse buffer
    product.stockByPlatform.warehouse = Math.max(0, product.stockByPlatform.warehouse + finalDelta);
  }

  await product.save();

  // Create Log
  await InventoryLog.create({
    product: product._id,
    productName: product.masterName,
    sku: product.sku,
    changeType: finalDelta > 0 ? 'manual_add' : 'manual_remove',
    platform: 'warehouse',
    previousStock: prevStock,
    changeQuantity: finalDelta,
    newStock: product.totalStock,
    performedBy: req.user._id,
    note: note || `Manual Restock reason: ${reason}`
  });

  // Push updates to platforms
  SyncService.pushStockToPlatforms(product);

  res.status(200).json(new ApiResponse(200, product, 'Product stock updated and logged successfully'));
});

const stockUpdate = asyncHandler(async (req, res) => {
  const { productId, changeType, platform, changeQuantity, note } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const delta = parseInt(changeQuantity);
  if (isNaN(delta) || delta === 0) throw new ApiError(400, 'changeQuantity must be a non-zero number');

  const prevStock = product.totalStock;
  product.totalStock = Math.max(0, product.totalStock + delta);

  // Update platform-specific stock
  const plat = platform || 'warehouse';
  if (['fifozone', 'amazon', 'flipkart', 'warehouse'].includes(plat)) {
    product.stockByPlatform[plat] = Math.max(0, (product.stockByPlatform[plat] || 0) + delta);
  }

  await product.save();

  await InventoryLog.create({
    product: product._id,
    productName: product.masterName,
    sku: product.sku,
    changeType: changeType || (delta > 0 ? 'manual_add' : 'manual_remove'),
    platform: plat,
    previousStock: prevStock,
    changeQuantity: delta,
    newStock: product.totalStock,
    performedBy: req.user._id,
    note: note || `Stock ${delta > 0 ? 'added' : 'removed'}: ${Math.abs(delta)} units`
  });

  SyncService.pushStockToPlatforms(product);

  res.status(200).json(new ApiResponse(200, product, 'Stock updated and logged successfully'));
});

module.exports = {
  getInventoryLogs,
  manualRestock,
  stockUpdate
};
