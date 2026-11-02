/**
 * m2_adversarial_challenge.test.js
 * 
 * EMPIRICAL ADVERSARIAL CHALLENGE TEST SUITE FOR MILESTONE 2:
 * 1. Hostile / corrupted order payloads in syncOrders()
 * 2. Category resolution stress in product.controller.js and import.controller.js
 * 3. Malformed settings updates in settings.controller.js
 * 4. Requirement R3 (Live Store Write Safety Guard) enforcement & bypass resistance
 * 5. Controller error handling & uncaught rejection resilience
 */

const fs = require('fs');
const path = require('path');

// Target modules under test
const SyncService = require('../src/services/sync.service');
const FifozoneOmsService = require('../src/services/fifozoneOms.service');
const platformController = require('../src/controllers/platform.controller');
const productController = require('../src/controllers/product.controller');
const importController = require('../src/controllers/import.controller');
const settingsController = require('../src/controllers/settings.controller');

// Models
const Settings = require('../src/models/Settings.model');
const Order = require('../src/models/Order.model');
const Product = require('../src/models/Product.model');
const PlatformCredential = require('../src/models/PlatformCredential.model');
const PlatformSync = require('../src/models/PlatformSync.model');
const InventoryLog = require('../src/models/InventoryLog.model');
const notificationService = require('../src/services/notification.service');

// Helper to execute asyncHandler-wrapped controllers
const executeHandler = (handler, req = {}) => {
  return new Promise((resolve) => {
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode, data, error: null });
      },
      send(data) {
        resolve({ statusCode, data, error: null });
      }
    };
    const next = (err) => {
      resolve({ statusCode: err?.statusCode || 500, data: null, error: err });
    };
    try {
      handler(req, res, next);
    } catch (err) {
      resolve({ statusCode: 500, data: null, error: err });
    }
  });
};

describe('Milestone 2 Empirical Adversarial Challenge Suite', () => {

  beforeEach(() => {
    jest.spyOn(InventoryLog, 'create').mockResolvedValue({});
    jest.spyOn(PlatformSync, 'findOneAndUpdate').mockResolvedValue({});
    jest.spyOn(PlatformCredential, 'findOne').mockResolvedValue(null);
    jest.spyOn(notificationService, 'createNotification').mockResolvedValue({});
    process.env.FIFOZONE_OMS_API_KEY = 'oms_live_challenge_key_999';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FifozoneOmsService.clearCategoryCache();
    FifozoneOmsService.clearBrandsCache();
  });

  // ============================================================================
  // SECTION 1: HOSTILE / CORRUPTED ORDER PAYLOADS IN syncOrders()
  // ============================================================================
  describe('1. Hostile & Corrupted Order Payloads in syncOrders()', () => {

    test('1.1 Handles missing rawOrd.items (undefined) without uncaught crash', async () => {
      const hostileOrders = [
        {
          platformOrderId: 'ORD-NO-ITEMS',
          platformStatus: 'processing',
          customer: { name: 'John Doe', email: 'john@example.com' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(hostileOrders);
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);

      await expect(SyncService.syncOrders()).resolves.not.toThrow();
    });

    test('1.2 Handles rawOrd.items containing null / undefined elements gracefully', async () => {
      const hostileOrders = [
        {
          platformOrderId: 'ORD-NULL-ITEM',
          platformStatus: 'processing',
          customer: { name: 'John Doe', email: 'john@example.com' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [null, undefined, { sku: '', quantity: 1, unitPrice: 100 }]
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(hostileOrders);
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);

      await expect(SyncService.syncOrders()).resolves.not.toThrow();
    });

    test('1.3 Probes existing order inventory re-deduction behavior on repeated sync', async () => {
      const mockOrderInDb = {
        _id: 'db_order_189001',
        platformOrderId: '189001',
        status: 'processing',
        items: [{ sku: 'SKU-REPEAT-1', quantity: 2 }],
        save: jest.fn().mockResolvedValue({})
      };

      const mockProduct = {
        _id: 'prod_repeat_1',
        sku: 'SKU-REPEAT-1',
        masterName: 'Repeat Test Product',
        totalStock: 50,
        stockByPlatform: { fifozone: 20 },
        totalSold: 10,
        soldThisMonth: 10,
        lowStockThreshold: 5,
        save: jest.fn().mockResolvedValue({})
      };

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: '189001',
          platformStatus: 'processing',
          customer: { name: 'Repeat Buyer' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-REPEAT-1', quantity: 2, unitPrice: 200, totalPrice: 400 }]
        }
      ]);

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

      await SyncService.syncOrders();

      const productSaveCalls = mockProduct.save.mock.calls.length;
      expect(productSaveCalls).toBe(0);
      expect(mockProduct.save).not.toHaveBeenCalled();
    });

    test('1.4 Probes duplicate platformOrderIds within the same batch', async () => {
      const mockProduct = {
        _id: 'prod_dup_1',
        sku: 'SKU-DUP-1',
        masterName: 'Dup Product',
        totalStock: 100,
        stockByPlatform: { fifozone: 50 },
        totalSold: 0,
        soldThisMonth: 0,
        lowStockThreshold: 10,
        save: jest.fn().mockResolvedValue({})
      };

      const duplicateBatch = [
        {
          platformOrderId: 'DUP-BATCH-99',
          platformStatus: 'processing',
          customer: { name: 'Buyer 1' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-DUP-1', quantity: 3, unitPrice: 100 }]
        },
        {
          platformOrderId: 'DUP-BATCH-99',
          platformStatus: 'processing',
          customer: { name: 'Buyer 1' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-DUP-1', quantity: 3, unitPrice: 100 }]
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(duplicateBatch);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

      let callCount = 0;
      jest.spyOn(Order, 'findOne').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(null);
        return Promise.resolve({
          _id: 'db_dup_order',
          platformOrderId: 'DUP-BATCH-99',
          status: 'processing',
          items: [{ sku: 'SKU-DUP-1', quantity: 3 }],
          save: jest.fn().mockResolvedValue({})
        });
      });

      jest.spyOn(Order.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });
      jest.spyOn(SyncService, 'generateOrderNumber').mockResolvedValue('FI-ORD-10099');

      await SyncService.syncOrders();

      expect(callCount).toBe(2);
    });

    test('1.5 Handles customer object missing name property without uncaught crash', async () => {
      const hostileOrders = [
        {
          platformOrderId: 'ORD-NO-NAME',
          platformStatus: 'processing',
          customer: {},
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: []
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(hostileOrders);
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);
      jest.spyOn(Order.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });
      jest.spyOn(SyncService, 'generateOrderNumber').mockResolvedValue('FI-ORD-10100');

      await expect(SyncService.syncOrders()).resolves.not.toThrow();
    });

    test('1.6 Handles corrupt non-numeric / negative quantities in order items', async () => {
      const mockProduct = {
        _id: 'prod_corrupt_qty',
        sku: 'SKU-CORRUPT-QTY',
        masterName: 'Corrupt Qty Product',
        totalStock: 50,
        stockByPlatform: { fifozone: 20 },
        totalSold: 5,
        soldThisMonth: 5,
        lowStockThreshold: 5,
        save: jest.fn().mockResolvedValue({})
      };

      const hostileOrders = [
        {
          platformOrderId: 'ORD-CORRUPT-QTY',
          platformStatus: 'processing',
          customer: { name: 'Test Buyer' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [
            { sku: 'SKU-CORRUPT-QTY', quantity: -10, unitPrice: 100 },
            { sku: 'SKU-CORRUPT-QTY', quantity: 'invalid', unitPrice: 100 }
          ]
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(hostileOrders);
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(Order.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });
      jest.spyOn(SyncService, 'generateOrderNumber').mockResolvedValue('FI-ORD-10101');

      await expect(SyncService.syncOrders()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // SECTION 2: CATEGORY RESOLUTION STRESS IN CONTROLLERS
  // ============================================================================
  describe('2. Category Resolution Stress in product & import controllers', () => {

    test('2.1 product.controller.importCSV: Special characters, SQL/XSS, and unicode categories', async () => {
      const maliciousCategories = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE categories; --",
        "🐶 Dog Food & Nutrition / Biscuits (Special Edition)",
        "Regex *+?^${}()|[]\\ chars",
        "Category with, embedded, commas",
      ];

      jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockImplementation(async (name) => {
        if (name.includes('Dog Food')) return 401;
        return null;
      });

      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });
      jest.spyOn(SyncService, 'pushStockToPlatforms').mockImplementation(() => {});

      const req = {
        body: {
          products: maliciousCategories.map((cat, idx) => ({
            sku: `ADV-CAT-${idx}`,
            masterName: `Product ${idx}`,
            category: cat,
            totalStock: 10,
            mrp: 500,
            costPrice: 300
          }))
        },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(productController.importCSV, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.success).toBe(true);
      expect(result.data.data.createdCount).toBe(maliciousCategories.length);
    });

    test('2.2 product.controller.importCSV: Null, empty string, and whitespace-only categories', async () => {
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });
      jest.spyOn(SyncService, 'pushStockToPlatforms').mockImplementation(() => {});

      const edgeCases = [
        { sku: 'EDGE-EMPTY', masterName: 'Empty Cat', category: '' },
        { sku: 'EDGE-SPACES', masterName: 'Spaces Cat', category: '   ' },
        { sku: 'EDGE-NULL', masterName: 'Null Cat', category: null },
        { sku: 'EDGE-UNDEF', masterName: 'Undef Cat', category: undefined },
        { sku: 'EDGE-ARR-EMPTY', masterName: 'Arr Empty Cat', category: [] },
      ];

      const req = {
        body: { products: edgeCases },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(productController.importCSV, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.createdCount).toBe(edgeCases.length);
    });

    test('2.3 import.controller.uploadImport: Resolves special character categories safely', async () => {
      jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockResolvedValue({
        categoryId: 100,
        subCategoryId: 101
      });
      jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockResolvedValue(200);
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => Promise.resolve({ ...data, _id: 'created_id' }));
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({ wooProductId: 999 });

      const req = {
        body: {
          products: [
            {
              masterName: 'Special Cat Product',
              category: '🐶 Cat & Dog Special / Edition',
              subCategory: 'Sub <Safe> Category',
              mrp: 1000,
              totalStock: 5
            }
          ]
        },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
    });

    test('2.4 import.controller.uploadImport: Handles deep category resolution failures gracefully without crashing import', async () => {
      jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockRejectedValue(new Error('OMS Category API Timeout'));
      jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockRejectedValue(new Error('OMS Category API Network Error'));
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => Promise.resolve({ ...data, _id: 'created_fallback_id' }));
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Fallback Category Product',
              category: 'Dog Food, Cat Food',
              subCategory: 'Dry Food',
              mrp: 1000,
              totalStock: 5
            }
          ]
        },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
    });

    test('2.5 import.controller.uploadImport: Deduplicates categories and subcategories when multiple categories share a subcategory', async () => {
      let createdProductData = null;
      jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockImplementation(async (cat, sub) => {
        if (cat === 'Dogs') return { categoryId: 10, subCategoryId: 55 };
        if (cat === 'Food') return { categoryId: 12, subCategoryId: 55 };
        return { categoryId: 99, subCategoryId: 55 };
      });
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => {
        createdProductData = data;
        return Promise.resolve({ ...data, _id: 'created_dedup_id' });
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Multi Category Product',
              category: 'Dogs, Food',
              subCategory: 'Dry Food',
              mrp: 500,
              totalStock: 10
            }
          ]
        },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
      expect(createdProductData).toBeDefined();
      expect(createdProductData.category).toEqual(['10|Dogs', '55|Dry Food', '12|Food']);
      const occurrences = createdProductData.category.filter(c => c.includes('55|Dry Food')).length;
      expect(occurrences).toBe(1);
    });
  });

  // ============================================================================
  // SECTION 3: MALFORMED SETTINGS UPDATES IN settings.controller.js
  // ============================================================================
  describe('3. Malformed Settings Updates in settings.controller.js', () => {

    test('3.1 updateSettings: Handles empty string credentials and marks isConfigured false', async () => {
      const mockSettings = {
        fifozoneOms: { baseURL: 'https://fifozone.com/wp-json/oms/v1', apiKey: 'old_key', isConfigured: true },
        save: jest.fn().mockResolvedValue({}),
        toObject() { return { fifozoneOms: this.fifozoneOms }; }
      };

      jest.spyOn(Settings, 'findOne').mockResolvedValue(mockSettings);

      const req = {
        body: {
          fifozoneOms: {
            baseURL: '   ',
            apiKey: ''
          }
        },
        user: { _id: 'admin_1' }
      };

      const result = await executeHandler(settingsController.updateSettings, req);

      expect(result.statusCode).toBe(200);
      expect(mockSettings.fifozoneOms.isConfigured).toBe(false);
      expect(mockSettings.fifozoneOms.baseURL).toBe('');
      expect(mockSettings.fifozoneOms.apiKey).toBe('');
    });

    test('3.2 updateSettings: Handles non-object fifozoneOms body safely', async () => {
      const mockSettings = {
        fifozoneOms: { baseURL: 'https://fifozone.com/wp-json/oms/v1', apiKey: 'old_key', isConfigured: true },
        save: jest.fn().mockResolvedValue({}),
        toObject() { return { fifozoneOms: this.fifozoneOms }; }
      };

      jest.spyOn(Settings, 'findOne').mockResolvedValue(mockSettings);

      const req = {
        body: {
          fifozoneOms: 'malformed_string_payload'
        },
        user: { _id: 'admin_1' }
      };

      const result = await executeHandler(settingsController.updateSettings, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.success).toBe(true);
    });

    test('3.3 testFifozoneOmsConnection: Returns HTTP 400 with clear error when connection fails', async () => {
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fifozoneOms: { baseURL: 'https://invalid-nonexistent-domain.xyz', apiKey: 'bad_key' }
        })
      });

      jest.spyOn(FifozoneOmsService, 'testConnection').mockRejectedValue(new Error('getaddrinfo ENOTFOUND invalid-nonexistent-domain.xyz'));

      const req = { body: {} };

      const result = await executeHandler(settingsController.testFifozoneOmsConnection, req);

      expect(result.statusCode).toBe(400);
      expect(result.data.success).toBe(false);
      expect(result.data.message).toContain('Fifozone OMS connection test failed');
    });
  });

  // ============================================================================
  // SECTION 4: REQUIREMENT R3 (LIVE STORE WRITE SAFETY GUARD) VERIFICATION
  // ============================================================================
  describe('4. Requirement R3: Live Store Write Safety Guard Verification', () => {

    test('4.1 Unmocked FifozoneOmsService.pushStock is BLOCKED by Safety Guard in test mode', async () => {
      expect(process.env.NODE_ENV).toBe('test');

      await expect(
        FifozoneOmsService.pushStock('LIVE-SAFETY-TEST-SKU', 15)
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.2 Unmocked FifozoneOmsService.pushPrice is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        FifozoneOmsService.pushPrice('LIVE-SAFETY-TEST-SKU', 999)
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.3 Unmocked FifozoneOmsService.createProduct is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        FifozoneOmsService.createProduct({ masterName: 'Live Test Product', sku: 'SAFETY-001' })
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.4 Unmocked FifozoneOmsService.updateProduct is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        FifozoneOmsService.updateProduct({ masterName: 'Live Test Product', sku: 'SAFETY-001' })
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.5 Unmocked FifozoneOmsService.deleteProduct is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        FifozoneOmsService.deleteProduct({ masterName: 'Live Test Product', sku: 'SAFETY-001' })
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.6 Unmocked FifozoneOmsService.updateOrder is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        FifozoneOmsService.updateOrder(189248, { status: 'completed' })
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });

    test('4.7 Unmocked SyncService.pushOrderUpdate is BLOCKED by Safety Guard in test mode', async () => {
      await expect(
        SyncService.pushOrderUpdate(189248, { status: 'completed' })
      ).rejects.toThrow(/\[SAFETY GUARD\] Blocked live POST request/i);
    });
  });

  // ============================================================================
  // SECTION 5: CONTROLLER RESILIENCE & ERROR PROPAGATION
  // ============================================================================
  describe('5. Controller Resilience & Error Handling', () => {

    test('5.1 platform.controller.getWooCommerceCategories propagates error safely on OMS failure', async () => {
      jest.spyOn(FifozoneOmsService, 'getCategoryTree').mockRejectedValue(new Error('OMS Category Tree Service Unavailable'));

      const req = {};
      const result = await executeHandler(platformController.getWooCommerceCategories, req);

      expect(result.error).not.toBeNull();
      expect(result.error.message).toBe('OMS Category Tree Service Unavailable');
    });

    test('5.2 platform.controller.testConnection gracefully returns success:false when live OMS connection fails', async () => {
      jest.spyOn(FifozoneOmsService, 'testConnection').mockRejectedValue(new Error('Connection timed out'));

      const req = { body: { platform: 'fifozone' } };
      const result = await executeHandler(platformController.testConnection, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.success).toBe(false);
      expect(result.data.message).toContain('Connection failed: Connection timed out');
    });
  });

});
