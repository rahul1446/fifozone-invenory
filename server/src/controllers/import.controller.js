const Product = require('../models/Product.model');
const InventoryLog = require('../models/InventoryLog.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const XLSX = require('xlsx');
const SyncService = require('../services/sync.service');
const WooCommerceService = require('../services/woocommerce.service');

// ─── Helper: parse numbers safely ─────────────────────────────────────────────
const parseNumber = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  // Aggressively strip currency symbols (₹, $), commas, and spaces
  const cleanStr = String(val).replace(/[^0-9.-]/g, '');
  if (!cleanStr) return fallback;
  const n = parseFloat(cleanStr);
  return isNaN(n) ? fallback : n;
};

// ─── Helper: generate a batch ID ───────────────────────────────────────────────
const generateBatchId = () => `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─── Helper: auto-generate SKU ─────────────────────────────────────────────────
const generateSku = (name) => {
  const slug = (name || 'PROD').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
  return `FI-${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// ─── POST /api/products/import/validate ─────────────────────────────────────────
const validateImport = asyncHandler(async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No products provided for validation'));
  }

  if (products.length > 500) {
    return res.status(400).json(new ApiResponse(400, null, 'Maximum 500 products per import batch'));
  }

  const validated = products.map((product, idx) => {
    const missingFields = [];
    const validationErrors = [];
    let status = 'ready'; // ready | incomplete | invalid

    // ── CRITICAL checks ──
    if (!product.masterName || String(product.masterName).trim() === '') {
      validationErrors.push('Product name (masterName) is required');
      status = 'invalid';
    }

    if (product.mrp !== undefined && product.mrp !== null && product.mrp !== '') {
      const mrpNum = parseFloat(product.mrp);
      if (isNaN(mrpNum) || mrpNum <= 0) {
        validationErrors.push('MRP must be a valid positive number');
        status = status === 'ready' ? 'incomplete' : status;
      }
    }

    if (product.totalStock !== undefined && product.totalStock !== null && product.totalStock !== '') {
      const stock = parseInt(product.totalStock);
      if (isNaN(stock) || stock < 0) {
        validationErrors.push('Total stock must be a valid non-negative integer');
        status = status === 'ready' ? 'incomplete' : status;
      }
    }

    // ── WARNING checks (incomplete but uploadable) ──
    if (!product.brand || String(product.brand).trim() === '') {
      missingFields.push('brand');
      if (status === 'ready') status = 'incomplete';
    }

    if (!product.category || String(product.category).trim() === '') {
      missingFields.push('category');
      if (status === 'ready') status = 'incomplete';
    }

    if (product.mrp === undefined || product.mrp === null || product.mrp === '') {
      missingFields.push('mrp');
      if (status === 'ready') status = 'incomplete';
    }

    if (product.totalStock === undefined || product.totalStock === null || product.totalStock === '') {
      missingFields.push('totalStock');
      if (status === 'ready') status = 'incomplete';
    }

    const hasAnyPrice = product.sellingPrice_fifozone || product.sellingPrice_amazon || product.sellingPrice_flipkart;
    if (!hasAnyPrice) {
      missingFields.push('sellingPrice');
      if (status === 'ready') status = 'incomplete';
    }

    const hasAnyImage = product.image_url_1 || product.image_url_2 || product.image_url_3 ||
      product.image_url_4 || product.image_url_5;
    if (!hasAnyImage) {
      missingFields.push('images');
      if (status === 'ready') status = 'incomplete';
    }

    // ── INFO (noted but silent) ──
    if (!product.description) missingFields.push('description');
    if (!product.sku) missingFields.push('sku (will auto-generate)');

    return {
      ...product,
      _rowIndex: idx,
      _status: status,
      _missingFields: missingFields,
      _validationErrors: validationErrors,
    };
  });

  const summary = {
    total: validated.length,
    ready: validated.filter(p => p._status === 'ready').length,
    incomplete: validated.filter(p => p._status === 'incomplete').length,
    invalid: validated.filter(p => p._status === 'invalid').length,
  };

  res.status(200).json(new ApiResponse(200, { products: validated, summary }, 'Validation complete'));
});

// ─── POST /api/products/import/upload ───────────────────────────────────────────
const uploadImport = asyncHandler(async (req, res) => {
  const { products, batchId } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No products to upload'));
  }

  const importBatchId = batchId || generateBatchId();
  const results = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
    incomplete: 0,
    failedProducts: [],
    log: [],
    batchId: importBatchId,
  };

  for (const rawProduct of products) {
    const productName = rawProduct.masterName || 'Unknown Product';

    try {
      // ── Duplicate detection: only check ACTIVE products (isActive:true) ──
      // Ghost records (isActive:false) must NOT block new imports
      const dupQuery = { isActive: true, $or: [] };
      if (rawProduct.barcode && String(rawProduct.barcode).trim()) {
        dupQuery.$or.push({ barcode: String(rawProduct.barcode).trim() });
      }
      if (rawProduct.sku && String(rawProduct.sku).trim()) {
        dupQuery.$or.push({ sku: String(rawProduct.sku).trim() });
      }
      if (rawProduct.platformId_amazon && String(rawProduct.platformId_amazon).trim()) {
        dupQuery.$or.push({ 'platformIds.amazon.asin': String(rawProduct.platformId_amazon).trim() });
      }
      if (rawProduct.platformId_flipkart && String(rawProduct.platformId_flipkart).trim()) {
        dupQuery.$or.push({ 'platformIds.flipkart.fsin': String(rawProduct.platformId_flipkart).trim() });
      }
      // Check by name only if $or has at least one condition
      dupQuery.$or.push({ masterName: { $regex: `^${String(productName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });

      const existing = await Product.findOne(dupQuery);
      // If we found an existing product, we will update it below after categories are resolved


      // ── Build variants ──
      const variants = [];
      for (let v = 1; v <= 5; v++) {
        const vName = rawProduct[`variant_name_${v}`];
        const vValue = rawProduct[`variant_value_${v}`];
        if (vName && vValue) {
          variants.push({
            name: String(vName),
            value: String(vValue),
            sku: generateSku(`${productName}-${vValue}`),
            price: {
              fifozone: parseNumber(rawProduct[`variant_price_${v}`] || rawProduct.sellingPrice_fifozone, 0),
              amazon: parseNumber(rawProduct[`variant_price_${v}`] || rawProduct.sellingPrice_amazon, 0),
              flipkart: parseNumber(rawProduct[`variant_price_${v}`] || rawProduct.sellingPrice_flipkart, 0),
            },
            stock: parseInt(rawProduct[`variant_stock_${v}`] || 0),
            isActive: true,
          });
        }
      }

      // ── Build images ──
      const images = [];
      for (let i = 1; i <= 5; i++) {
        const url = rawProduct[`image_url_${i}`];
        if (url && String(url).trim().startsWith('http')) {
          images.push({
            url: String(url).trim(),
            isPrimary: i === 1,
            platform: 'import',
            cloudinarySynced: false,
          });
        }
      }

      // ── Build tags/features ──
      const tags = rawProduct.tags
        ? String(rawProduct.tags).split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const features = rawProduct.features
        ? String(rawProduct.features).split('|').map(f => f.trim()).filter(Boolean)
        : [];
      const animalTypes = rawProduct.animalType
        ? String(rawProduct.animalType).split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];

      // ── Calculate total stock ──
      let totalStock = parseInt(rawProduct.totalStock || 0);
      if (variants.length > 0) {
        totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      }

      // ── Resolve Categories ──
      let categoryData = [];
      if (rawProduct.category) {
        const catNames = typeof rawProduct.category === 'string' 
          ? rawProduct.category.split(',').map(c => c.trim()).filter(Boolean) 
          : (Array.isArray(rawProduct.category) ? rawProduct.category : [rawProduct.category]);
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
          logger.warn(`[Import] Failed to resolve categories: ${err.message}`);
          categoryData = catNames;
        }
      }

      if (existing) {
        // ── UPDATE existing product ──
        existing.mrp = parseNumber(rawProduct.mrp, existing.mrp);
        existing.costPrice = parseNumber(rawProduct.costPrice, existing.costPrice);
        
        if (rawProduct.brand) existing.brand = String(rawProduct.brand).trim();
        if (categoryData.length > 0) existing.category = categoryData;
        
        if (variants.length > 0) existing.variants = variants;

        if (rawProduct.sellingPrice_fifozone) existing.sellingPrice.fifozone = parseNumber(rawProduct.sellingPrice_fifozone, existing.sellingPrice.fifozone);
        if (rawProduct.sellingPrice_amazon) existing.sellingPrice.amazon = parseNumber(rawProduct.sellingPrice_amazon, existing.sellingPrice.amazon);
        if (rawProduct.sellingPrice_flipkart) existing.sellingPrice.flipkart = parseNumber(rawProduct.sellingPrice_flipkart, existing.sellingPrice.flipkart);
        
        const csvStock = parseInt(rawProduct.totalStock);
        if (!isNaN(csvStock) && csvStock !== existing.totalStock) {
          const prevStock = existing.totalStock;
          existing.totalStock = csvStock;
          existing.stockByPlatform.warehouse = csvStock;
          
          await InventoryLog.create({
            product: existing._id,
            productName: existing.masterName,
            sku: existing.sku,
            changeType: 'adjustment',
            platform: 'internal',
            previousStock: prevStock,
            changeQuantity: csvStock - prevStock,
            newStock: csvStock,
            note: `Stock adjusted via CSV/Excel (Batch: ${importBatchId})`,
            performedBy: req.user?._id,
          });
        }
        
        existing.updatedBy = req.user?._id;
        existing.importBatchId = importBatchId;
        existing.importNote = 'Updated via CSV/Excel import';
        
        await existing.save();
        
        SyncService.pushStockToPlatforms(existing);
        SyncService.pushPriceToPlatforms(existing);
        SyncService.pushProductUpdate(existing).catch(e => logger.error(`[Import] Sync update failed: ${e.message}`));
        
        results.uploaded++;
        results.log.push({ name: productName, status: 'success', message: 'Updated existing product successfully' });
        continue;
      }

      // ── Build new product doc ──
      const productData = {
        masterName: String(productName).trim(),
        sku: rawProduct.sku ? String(rawProduct.sku).trim() : generateSku(productName),
        barcode: rawProduct.barcode ? String(rawProduct.barcode).trim() : undefined,
        brand: rawProduct.brand ? String(rawProduct.brand).trim() : undefined,
        manufacturer: rawProduct.manufacturer ? String(rawProduct.manufacturer).trim() : undefined,
        category: categoryData.length > 0 ? categoryData : undefined,
        subCategory: rawProduct.subCategory ? String(rawProduct.subCategory).trim() : undefined,
        animalType: animalTypes,
        packSize: rawProduct.packSize ? String(rawProduct.packSize).trim() : undefined,
        weight: rawProduct.weight_value ? {
          value: parseNumber(rawProduct.weight_value, 0),
          unit: rawProduct.weight_unit || 'g',
        } : undefined,
        mrp: parseNumber(rawProduct.mrp, 0),
        costPrice: parseNumber(rawProduct.costPrice, 0),
        gstPercent: [0, 5, 12, 18, 28].includes(parseInt(rawProduct.gstPercent)) ? parseInt(rawProduct.gstPercent) : 18,
        sellingPrice: {
          fifozone: parseNumber(rawProduct.sellingPrice_fifozone, 0),
          amazon: parseNumber(rawProduct.sellingPrice_amazon, 0),
          flipkart: parseNumber(rawProduct.sellingPrice_flipkart, 0),
        },
        totalStock,
        stockByPlatform: {
          fifozone: totalStock,
          amazon: 0,
          flipkart: 0,
          warehouse: 0,
        },
        lowStockThreshold: parseInt(rawProduct.lowStockThreshold || 10),
        description: rawProduct.description || undefined,
        shortDescription: rawProduct.shortDescription || undefined,
        composition: rawProduct.composition || undefined,
        usageInstructions: rawProduct.usageInstructions || undefined,
        tags,
        features,
        images,
        variants: variants.length > 0 ? variants : undefined,
        platformIds: {
          fifozone: { productId: rawProduct.platformId_fifozone || '' },
          amazon: { asin: rawProduct.platformId_amazon || '' },
          flipkart: { fsin: rawProduct.platformId_flipkart || '' },
        },
        isActive: true,
        importBatchId,
        importNote: rawProduct._uploadAsIs
          ? `Imported with incomplete data on ${new Date().toLocaleDateString('en-IN')}`
          : `Imported via CSV/Excel on ${new Date().toLocaleDateString('en-IN')}`,
        createdBy: req.user?._id,
      };

      // Retry logic for DB errors
      let product, dbError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          product = await Product.create(productData);
          break;
        } catch (err) {
          dbError = err;
          if (attempt < 3) await new Promise(r => setTimeout(r, 200 * attempt));
        }
      }

      if (!product) throw dbError;

      // Push to WooCommerce asynchronously (don't await — keep import fast)
      SyncService.pushProductCreate(product).catch(e =>
        logger.error(`[Import] WooCommerce push failed for "${productName}": ${e.message}`)
      );

      // ── Create initial inventory log ──
      if (totalStock > 0) {
        await InventoryLog.create({
          product: product._id,
          productName: product.masterName,
          sku: product.sku,
          changeType: 'restock',
          platform: 'internal',
          previousStock: 0,
          changeQuantity: totalStock,
          newStock: totalStock,
          note: `Initial stock from CSV/Excel import (Batch: ${importBatchId})`,
          performedBy: req.user?._id,
        });
      }

      const isIncomplete = rawProduct._uploadAsIs || (rawProduct._status === 'incomplete');
      if (isIncomplete) {
        results.incomplete++;
        results.log.push({ name: productName, status: 'incomplete', message: 'Uploaded with missing data' });
      } else {
        results.uploaded++;
        results.log.push({ name: productName, status: 'success', message: 'Uploaded successfully' });
      }
    } catch (err) {
      logger.error(`[Import] Failed to create product "${productName}": ${err.message}`);
      results.failed++;
      results.failedProducts.push({ name: productName, error: err.message });
      results.log.push({ name: productName, status: 'failed', message: err.message });
    }
  }

  res.status(200).json(new ApiResponse(200, results, 'Import complete'));
});

// ─── GET /api/products/import/template ─────────────────────────────────────────
const downloadTemplate = asyncHandler(async (req, res) => {
  const headers = [
    'Product Name', 'SKU', 'Barcode', 'Brand', 'Manufacturer', 'Category',
    'Sub Category', 'Animal Type', 'Weight Value', 'Weight Unit', 'Pack Size',
    'MRP', 'Cost Price', 'GST%', 'Fifozone Price', 'Amazon Price', 'Flipkart Price',
    'Total Stock', 'Low Stock Threshold', 'Description', 'Short Description',
    'Composition', 'Usage Instructions', 'Tags', 'Features',
    'Fifozone Product ID', 'Amazon ASIN', 'Flipkart FSIN',
    'Variant 1 Name', 'Variant 1 Value', 'Variant 1 Price', 'Variant 1 Stock',
    'Variant 2 Name', 'Variant 2 Value', 'Variant 2 Price', 'Variant 2 Stock',
    'Variant 3 Name', 'Variant 3 Value', 'Variant 3 Price', 'Variant 3 Stock',
    'Image URL 1', 'Image URL 2', 'Image URL 3',
  ];

  const example1 = [
    'Royal Canin Urinary S/O Dog Dry Food', 'RC-URN-001', '3182550911016', 'Royal Canin',
    'Royal Canin SAS', 'Dog Medicine', 'Urinary Care', 'dog', '2', 'kg', '2kg bag',
    '5200', '3800', '12', '5200', '5100', '5050', '50', '10',
    'Vet diet for dogs with urinary issues.', 'Vet-recommended urinary care for dogs',
    'Magnesium: 0.08%', 'Feed as sole diet for 5 weeks',
    'urinary,royal canin,vet diet', 'Dissolves struvite stones|Reduces urine pH',
    'woo_12345', 'B07XYZ1234', 'FSIN87654',
    'Size', '2kg', '5200', '30',
    'Size', '3kg', '7200', '15',
    '', '', '', '',
    'https://cdn.example.com/rc-urinary-1.jpg', 'https://cdn.example.com/rc-urinary-2.jpg', '',
  ];

  const example2 = [
    'Drools VET PRO Adult Dog Dry Food', 'DROOLS-ADT-001', '', 'Drools', 'Drools Pet Food',
    'Dog Food', 'Adult', 'dog', '3', 'kg', '3kg pack',
    '799', '550', '12', '799', '780', '770', '100', '15',
    'Complete balanced nutrition for adult dogs.', 'Premium dry food for adult dogs',
    'Chicken: 26%, Rice: 40%', 'Feed twice daily',
    'drools,adult dog,dry food', 'High protein|No artificial colors',
    '', '', '',
    '', '', '', '',
    '', '', '', '',
    '', '', '', '',
    'https://cdn.example.com/drools-adult.jpg', '', '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);

  // Style header row (bold + background) - XLSX doesn't support full styling without paid libraries
  // but we can set column widths
  ws['!cols'] = headers.map((h, i) => ({ wch: Math.max(h.length + 2, 15) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products Import Template');

  // Add instructions sheet
  const instructions = [
    ['FIFOZONE PRODUCT IMPORT TEMPLATE — INSTRUCTIONS'],
    [''],
    ['REQUIRED FIELDS (cannot be empty):'],
    ['• Product Name — the master product name'],
    [''],
    ['OPTIONAL FIELDS:'],
    ['• All other columns — leave empty if not available'],
    [''],
    ['FORMAT RULES:'],
    ['• Tags: comma-separated (e.g. tag1,tag2,tag3)'],
    ['• Features: pipe-separated (e.g. Feature 1|Feature 2)'],
    ['• Animal Type: lowercase, comma-separated (dog, cat, bird, fish, other)'],
    ['• Weight Unit: exactly one of: g, kg, ml, l, units'],
    ['• GST%: numbers only — 0, 5, 12, 18, or 28'],
    ['• Prices: numbers only, no ₹ symbol (e.g. 5200 not Rs.5200)'],
    ['• Leave cell empty if data unavailable — do NOT write N/A or -'],
    ['• Image URLs: must start with https://'],
    ['• Maximum 500 products per import file'],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  ws2['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="Fifozone_Product_Import_Template.xlsx"',
    'Content-Length': buffer.length,
  });

  res.send(buffer);
});

module.exports = { validateImport, uploadImport, downloadTemplate };
