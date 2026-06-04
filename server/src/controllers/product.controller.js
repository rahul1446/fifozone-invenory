const Product = require('../models/Product.model');
const InventoryLog = require('../models/InventoryLog.model');
const SyncService = require('../services/sync.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const WooCommerceService = require('../services/woocommerce.service');

// Retrieve all products with filters
const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    platform,
    status,
    category,
    brand,
    animalType,
    stock,
    isDead,
    page = 1,
    limit = 25
  } = req.query;

  const query = { isActive: true };

  // Text search
  if (search) {
    query.$or = [
      { masterName: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { alternateNames: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by Platform listing
  if (platform && platform !== 'All') {
    query[`platformStatus.${platform.toLowerCase()}`] = { $ne: 'not_listed' };
  }

  // Filter by Status
  if (status && status !== 'All') {
    if (platform && platform !== 'All') {
      query[`platformStatus.${platform.toLowerCase()}`] = status.toLowerCase();
    } else {
      query.$or = [
        { 'platformStatus.fifozone': status.toLowerCase() },
        { 'platformStatus.amazon': status.toLowerCase() },
        { 'platformStatus.flipkart': status.toLowerCase() }
      ];
    }
  }

  // Category and Brand
  if (category && category !== 'All') {
    query.category = category;
  }
  if (brand && brand !== 'All') {
    query.brand = brand;
  }

  // Animal Type
  if (animalType && animalType !== 'All') {
    query.animalType = animalType.toLowerCase();
  }

  // Dead products toggle
  if (isDead !== undefined) {
    query.isDead = isDead === 'true';
  }

  // Filter by Stock Health
  if (stock) {
    if (stock === 'Low Stock') {
      query.$expr = { $lte: ['$totalStock', '$lowStockThreshold'] };
      query.totalStock = { $gt: 0 };
    } else if (stock === 'Out of Stock') {
      query.totalStock = 0;
    } else if (stock === 'In Stock') {
      query.totalStock = { $gt: 0 };
      query.$expr = { $gt: ['$totalStock', '$lowStockThreshold'] };
    }
  }

  // Pagination parameters
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Dynamic filter lists for frontend select boxes
  const categoriesList = await Product.distinct('category', { isActive: true });
  const brandsList = await Product.distinct('brand', { isActive: true });

  res.status(200).json(
    new ApiResponse(200, {
      products,
      categories: categoriesList,
      brands: brandsList,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Products fetched successfully')
  );
});

// Single Product detail
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  res.status(200).json(new ApiResponse(200, product, 'Product details retrieved'));
});

// Add Product
const createProduct = asyncHandler(async (req, res) => {
  const productData = req.body;

  // Generate SKU if blank
  if (!productData.sku) {
    const count = await Product.countDocuments();
    productData.sku = `FI-SKU-${1000 + count}`;
  }

  // Calculate unified total stock
  const fzStock = parseInt(productData.stockByPlatform?.fifozone || 0);
  const amzStock = parseInt(productData.stockByPlatform?.amazon || 0);
  const fkStock = parseInt(productData.stockByPlatform?.flipkart || 0);
  const whStock = parseInt(productData.stockByPlatform?.warehouse || 0);
  productData.totalStock = fzStock + amzStock + fkStock + whStock;

  // Set QR code mock
  productData.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${productData.sku}`;
  productData.createdBy = req.user._id;

  const product = new Product(productData);
  await product.save();

  // Create initial log
  await InventoryLog.create({
    product: product._id,
    productName: product.masterName,
    sku: product.sku,
    changeType: 'manual_add',
    platform: 'warehouse',
    previousStock: 0,
    changeQuantity: product.totalStock,
    newStock: product.totalStock,
    performedBy: req.user._id,
    note: 'Initial inventory ingestion'
  });

  // Push full product to WooCommerce — awaited so errors surface
  let wooSyncResult = null;
  try {
    wooSyncResult = await SyncService.pushProductCreate(product);
  } catch (wooErr) {
    logger.error(`WooCommerce create push failed for ${product.masterName}: ${wooErr.message}`);
  }

  res.status(201).json(new ApiResponse(201, { ...product.toObject(), wooSyncResult }, 'Product created and synced successfully'));
});

// Edit Product
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const prevStock = product.totalStock;
  const updates = req.body;

  // ── Protect WooCommerce ID: never overwrite with empty/invalid value ──────────
  // If the form sends platformIds.fifozone.productId as empty, keep the stored ID
  if (updates.platformIds?.fifozone?.productId === '' || updates.platformIds?.fifozone?.productId === undefined) {
    if (updates.platformIds) {
      updates.platformIds.fifozone = {
        ...updates.platformIds.fifozone,
        productId: product.platformIds?.fifozone?.productId || '',
      };
    }
  }

  // ── Recalculate stock values ──────────────────────────────────────────────────
  if (updates.stockByPlatform) {
    const fzStock = parseInt(updates.stockByPlatform.fifozone || 0);
    const amzStock = parseInt(updates.stockByPlatform.amazon || 0);
    const fkStock = parseInt(updates.stockByPlatform.flipkart || 0);
    const whStock = parseInt(updates.stockByPlatform.warehouse || 0);
    updates.totalStock = fzStock + amzStock + fkStock + whStock;

    // If fifozone stock is 0 but totalStock > 0, distribute to fifozone
    if (fzStock === 0 && updates.totalStock === 0 && (amzStock + fkStock + whStock) === 0) {
      // Keep existing stock if form sent all zeros (don't wipe stock accidentally)
      updates.stockByPlatform.fifozone = product.stockByPlatform?.fifozone || 0;
      updates.totalStock = product.totalStock || 0;
    }
  }

  // Mark as manually edited so sync cron doesn't overwrite seller changes
  updates.manualOverride = true;
  updates.updatedBy = req.user._id;

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  // If stock counts were edited, log audit trail
  if (updates.totalStock !== undefined && updates.totalStock !== prevStock) {
    await InventoryLog.create({
      product: product._id,
      productName: product.masterName,
      sku: product.sku,
      changeType: 'adjustment',
      platform: 'internal',
      previousStock: prevStock,
      changeQuantity: updates.totalStock - prevStock,
      newStock: updates.totalStock,
      performedBy: req.user._id,
      note: updates.stockNote || 'Manual inventory correction'
    });
  }

  // Sync full product update to WooCommerce
  try {
    await SyncService.pushProductUpdate(updatedProduct);
  } catch (wooErr) {
    logger.error(`WooCommerce update push failed for ${updatedProduct.masterName}: ${wooErr.message}`);
  }

  res.status(200).json(new ApiResponse(200, updatedProduct, 'Product details updated and synced'));
});

// Delete Product (Soft delete)
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // 1. Delete from WooCommerce FIRST while original SKU/WooID are still intact
  try {
    await SyncService.pushProductDelete(product);
  } catch (wooErr) {
    logger.error(`WooCommerce delete push failed for ${product.masterName}: ${wooErr.message}`);
  }

  // 2. Soft-delete: keep original SKU intact so sync can find & skip this record.
  //    DO NOT rename SKU — renaming breaks the deletedBySeller guard in sync.service.js
  //    because sync looks up by original SKU and can't find the renamed record,
  //    causing it to re-create the product from scratch.
  product.isActive = false;
  product.deletedBySeller = true;
  await product.save();

  res.status(200).json(new ApiResponse(200, null, 'Product deleted successfully'));
});

// Bulk Edit selected catalog rows
const bulkEdit = asyncHandler(async (req, res) => {
  const { productIds, updates } = req.body;

  if (!productIds || !productIds.length) {
    throw new ApiError(400, 'Product IDs array required');
  }

  const bulkOps = [];
  const updatedProducts = [];

  for (const id of productIds) {
    const product = await Product.findById(id);
    if (!product) continue;

    const currentUpdates = { ...updates };
    let previousStock = product.totalStock;

    // If incremental stock update is requested
    if (updates.stockAddQty) {
      const addQty = parseInt(updates.stockAddQty);
      currentUpdates.totalStock = product.totalStock + addQty;
      // allocate to warehouse buffer stock
      currentUpdates['stockByPlatform.warehouse'] = product.stockByPlatform.warehouse + addQty;

      // Write inventory audit log
      await InventoryLog.create({
        product: product._id,
        productName: product.masterName,
        sku: product.sku,
        changeType: 'manual_add',
        platform: 'warehouse',
        previousStock,
        changeQuantity: addQty,
        newStock: currentUpdates.totalStock,
        performedBy: req.user._id,
        note: 'Bulk restock adjustment'
      });
    }

    delete currentUpdates.stockAddQty;

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: currentUpdates },
      { new: true }
    );

    if (updated) {
      updatedProducts.push(updated);
      // Trigger API syncs
      SyncService.pushStockToPlatforms(updated);
      SyncService.pushPriceToPlatforms(updated);
    }
  }

  res.status(200).json(new ApiResponse(200, null, `Successfully bulk updated ${updatedProducts.length} products`));
});

// Bulk Delete selected items
const bulkDelete = asyncHandler(async (req, res) => {
  const { productIds } = req.body;

  if (!productIds || !productIds.length) {
    throw new ApiError(400, 'Product IDs required');
  }

  const products = await Product.find({ _id: { $in: productIds } });

  for (const product of products) {
    // Soft-delete: keep original SKU intact so the sync guard works correctly.
    // Renaming the SKU causes sync to re-create the product from scratch.
    product.isActive = false;
    product.deletedBySeller = true;
    await product.save();
  }

  res.status(200).json(new ApiResponse(200, null, 'Selected products deleted successfully'));
});

// Bulk Sync Products
const bulkSync = asyncHandler(async (req, res) => {
  const { productIds } = req.body;

  if (!productIds || !productIds.length) {
    throw new ApiError(400, 'Product IDs required');
  }

  const products = await Product.find({ _id: { $in: productIds } });
  for (const product of products) {
    SyncService.pushStockToPlatforms(product);
    SyncService.pushPriceToPlatforms(product);
  }

  res.status(200).json(new ApiResponse(200, null, 'Selected products sync triggered'));
});

// Bulk CSV Import
const importCSV = asyncHandler(async (req, res) => {
  const { products } = req.body; // Array parsed on frontend

  if (!products || !products.length) {
    throw new ApiError(400, 'No products found to import');
  }

  const parseNumber = (val, fallback) => {
    if (val === undefined || val === null || val === '') return fallback;
    const cleanStr = String(val).replace(/[^0-9.-]/g, '');
    if (!cleanStr) return fallback;
    const n = parseFloat(cleanStr);
    return isNaN(n) ? fallback : n;
  };

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of products) {
    if (!row.sku || !row.masterName) continue;

    let product = await Product.findOne({ sku: row.sku });

    let categoryData = [];
    if (row.category) {
      const catNames = typeof row.category === 'string' ? row.category.split(',').map(c => c.trim()).filter(Boolean) : (Array.isArray(row.category) ? row.category : [row.category]);
      try {
        const client = await WooCommerceService.getClient();
        for (const catName of catNames) {
          if (catName.includes('|')) {
            categoryData.push(catName);
          } else {
            const id = await WooCommerceService.resolveCategoryId(client, catName);
            if (id) {
              categoryData.push(`${id}|${catName}`);
            } else {
              categoryData.push(catName);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to resolve WooCommerce categories during CSV import: ${err.message}`);
        categoryData = catNames;
      }
    }

    if (product) {
      // Update
      product.masterName = row.masterName || product.masterName;
      product.mrp = parseNumber(row.mrp, product.mrp);
      product.costPrice = parseNumber(row.costPrice, product.costPrice);
      product.brand = row.brand || product.brand;
      product.category = categoryData.length > 0 ? categoryData : product.category;
      
      const prevStock = product.totalStock;
      const csvStock = parseInt(row.totalStock);
      
      if (!isNaN(csvStock) && csvStock !== prevStock) {
        product.totalStock = csvStock;
        product.stockByPlatform.warehouse = csvStock; // default dump to warehouse buffer
        
        await InventoryLog.create({
          product: product._id,
          productName: product.masterName,
          sku: product.sku,
          changeType: 'adjustment',
          platform: 'warehouse',
          previousStock: prevStock,
          changeQuantity: csvStock - prevStock,
          newStock: csvStock,
          performedBy: req.user._id,
          note: 'CSV Import inventory correction'
        });
      }
      
      await product.save();
      updatedCount++;
    } else {
      // Create
      const stockVal = parseInt(row.totalStock) || 0;
      product = new Product({
        masterName: row.masterName,
        sku: row.sku,
        barcode: row.barcode || '',
        brand: row.brand || 'Generic',
        category: categoryData.length > 0 ? categoryData : ['Uncategorized'],
        mrp: parseNumber(row.mrp, 0),
        costPrice: parseNumber(row.costPrice, 0),
        totalStock: stockVal,
        stockByPlatform: {
          fifozone: 0,
          amazon: 0,
          flipkart: 0,
          warehouse: stockVal
        },
        createdBy: req.user._id
      });
      
      await product.save();
      
      await InventoryLog.create({
        product: product._id,
        productName: product.masterName,
        sku: product.sku,
        changeType: 'manual_add',
        platform: 'warehouse',
        previousStock: 0,
        changeQuantity: stockVal,
        newStock: stockVal,
        performedBy: req.user._id,
        note: 'CSV Import initial ingestion'
      });
      
      createdCount++;
    }

    // Trigger platform sync
    SyncService.pushStockToPlatforms(product);
  }

  res.status(200).json(
    new ApiResponse(200, { createdCount, updatedCount }, 'CSV catalog import processed successfully')
  );
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkEdit,
  bulkDelete,
  bulkSync,
  importCSV
};
