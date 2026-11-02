/**
 * consumer_migration.test.js
 * 
 * Milestone 2 Consumer Migration Test Suite:
 * Validates backend consumer migration away from legacy WooCommerceService to FifozoneOmsService.
 * 
 * Components Verified:
 * 1. server/src/services/sync.service.js
 * 2. server/src/controllers/platform.controller.js & server/src/routes/platform.routes.js
 * 3. server/src/controllers/product.controller.js
 * 4. server/src/controllers/import.controller.js
 * 5. server/src/models/Settings.model.js
 * 6. server/src/controllers/settings.controller.js & server/src/routes/settings.routes.js
 * 
 * Safety Requirement (R3):
 * All mutating external network requests are strictly mocked to prevent altering live production data.
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
const platformRoutes = require('../src/routes/platform.routes');
const settingsRoutes = require('../src/routes/settings.routes');

// Models
const Settings = require('../src/models/Settings.model');
const Order = require('../src/models/Order.model');
const Product = require('../src/models/Product.model');
const PlatformCredential = require('../src/models/PlatformCredential.model');
const PlatformSync = require('../src/models/PlatformSync.model');
const InventoryLog = require('../src/models/InventoryLog.model');
const notificationService = require('../src/services/notification.service');

describe('Milestone 2: Service & Controller Consumer Migration Suite', () => {

  beforeEach(() => {
    // Prevent unmocked InventoryLog creation from buffering
    jest.spyOn(InventoryLog, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: CODEBASE CLEANLINESS — ZERO OCCURRENCES OF WOOCOMMERCE.SERVICE
  // ==========================================================================
  describe('1. Static Decoupling & Module Independence', () => {
    test('1.1 sync.service.js contains zero references to woocommerce.service', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/services/sync.service.js'), 'utf8');
      expect(content).not.toContain('woocommerce.service');
      expect(content).not.toContain('WooCommerceService');
    });

    test('1.2 platform.controller.js contains zero references to woocommerce.service', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/controllers/platform.controller.js'), 'utf8');
      expect(content).not.toContain('woocommerce.service');
      expect(content).not.toContain('WooCommerceService');
    });

    test('1.3 product.controller.js contains zero references to woocommerce.service', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/controllers/product.controller.js'), 'utf8');
      expect(content).not.toContain('woocommerce.service');
      expect(content).not.toContain('WooCommerceService');
    });

    test('1.4 import.controller.js contains zero references to woocommerce.service', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/controllers/import.controller.js'), 'utf8');
      expect(content).not.toContain('woocommerce.service');
      expect(content).not.toContain('WooCommerceService');
    });
  });

  // ==========================================================================
  // SECTION 2: SYNC SERVICE MIGRATION & ORDER INGESTION
  // ==========================================================================
  describe('2. SyncService Order Ingestion & Lifecycle with FifozoneOmsService', () => {

    test('2.1 syncProducts() invokes FifozoneOmsService.clearCategoryCache()', async () => {
      const clearSpy = jest.spyOn(FifozoneOmsService, 'clearCategoryCache').mockImplementation(() => {});
      jest.spyOn(FifozoneOmsService, 'pullProducts').mockResolvedValue([]);
      jest.spyOn(PlatformCredential, 'findOne').mockResolvedValue(null);
      jest.spyOn(PlatformSync, 'findOneAndUpdate').mockResolvedValue({});
      jest.spyOn(Product, 'find').mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

      process.env.FIFOZONE_OMS_API_KEY = 'oms_live_test_key_123';

      await SyncService.syncProducts();
      expect(clearSpy).toHaveBeenCalled();
    });

    test('2.2 syncOrders() invokes FifozoneOmsService.pullOrders() and ingests normalized orders', async () => {
      const mockNormalizedOrders = [
        {
          platformOrderId: '189901',
          number: '189901',
          platformStatus: 'processing',
          orderDate: new Date('2026-11-01T10:00:00Z'),
          customer: {
            name: 'Priya Sharma',
            email: 'priya@example.com',
            phone: '9876543210'
          },
          shippingAddress: {
            line1: '123 Park Avenue',
            line2: 'Apt 4B',
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
            country: 'India'
          },
          billingAddress: {
            line1: '123 Park Avenue',
            line2: 'Apt 4B',
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
            country: 'India'
          },
          items: [
            {
              sku: 'PROD-DOG-001',
              name: 'Royal Canin Maxi Puppy 4kg',
              platformProductId: '189911',
              quantity: 2,
              unitPrice: 1500,
              total: 3000
            }
          ],
          subtotal: 3000,
          shippingCharge: 100,
          totalAmount: 3100,
          paymentMethod: 'Prepaid',
          paymentStatus: 'paid',
          raw: { id: 189901 }
        }
      ];

      const pullOrdersSpy = jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(mockNormalizedOrders);
      jest.spyOn(PlatformCredential, 'findOne').mockResolvedValue(null);
      jest.spyOn(PlatformSync, 'findOneAndUpdate').mockResolvedValue({});
      jest.spyOn(Order, 'findOne').mockResolvedValue(null); // Not existing yet

      const orderSaveSpy = jest.spyOn(Order.prototype, 'save').mockImplementation(function() {
        return Promise.resolve(this);
      });

      jest.spyOn(SyncService, 'generateOrderNumber').mockResolvedValue('FI-ORD-10001');
      const notifSpy = jest.spyOn(notificationService, 'createNotification').mockResolvedValue({});

      // Mock Product resolution
      jest.spyOn(Product, 'findOne').mockResolvedValue({
        _id: 'mock_prod_id_1',
        sku: 'PROD-DOG-001',
        masterName: 'Royal Canin Maxi Puppy 4kg',
        costPrice: 1200,
        mrp: 1800,
        totalStock: 50,
        images: [],
        stockByPlatform: { fifozone: 20 },
        lowStockThreshold: 5,
        save: jest.fn().mockResolvedValue({})
      });

      process.env.FIFOZONE_OMS_API_KEY = 'oms_live_test_key_123';

      await SyncService.syncOrders();

      expect(pullOrdersSpy).toHaveBeenCalled();
      expect(orderSaveSpy).toHaveBeenCalled();
      expect(notifSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'new_order',
        title: expect.stringContaining('FIFOZONE')
      }));
    });

    test('2.3 syncOrders() maps HPOS statuses correctly to internal statuses', async () => {
      const statusesToTest = [
        { platformStatus: 'processing', expectedInternal: 'processing' },
        { platformStatus: 'completed', expectedInternal: 'delivered' },
        { platformStatus: 'delivered', expectedInternal: 'delivered' },
        { platformStatus: 'shipped', expectedInternal: 'shipped' },
        { platformStatus: 'cancelled', expectedInternal: 'cancelled' },
        { platformStatus: 'failed', expectedInternal: 'failed' },
        { platformStatus: 'refunded', expectedInternal: 'refunded' },
        { platformStatus: 'packed', expectedInternal: 'packed' },
        { platformStatus: 'checkout-draft', expectedInternal: 'draft' },
      ];

      jest.spyOn(PlatformCredential, 'findOne').mockResolvedValue(null);
      jest.spyOn(PlatformSync, 'findOneAndUpdate').mockResolvedValue({});
      jest.spyOn(Order, 'findOne').mockResolvedValue(null);
      jest.spyOn(SyncService, 'generateOrderNumber').mockResolvedValue('FI-ORD-10001');
      jest.spyOn(notificationService, 'createNotification').mockResolvedValue({});

      for (let i = 0; i < statusesToTest.length; i++) {
        const { platformStatus, expectedInternal } = statusesToTest[i];
        let capturedOrder = null;

        jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValueOnce([
          {
            platformOrderId: `STATUS-TEST-${i}`,
            platformStatus,
            items: [],
            customer: { name: 'Test' },
            shippingAddress: { line1: 'Test', city: 'Test', state: 'XX', pincode: '000000' },
            billingAddress: { line1: 'Test', city: 'Test', state: 'XX', pincode: '000000' },
            subtotal: 0,
            totalAmount: 0
          }
        ]);

        jest.spyOn(Order.prototype, 'save').mockImplementation(function() {
          capturedOrder = this;
          return Promise.resolve(this);
        });

        await SyncService.syncOrders();

        expect(capturedOrder).not.toBeNull();
        expect(capturedOrder.status).toBe(expectedInternal);
      }
    });

    test('2.4 pushOrderUpdate delegates to FifozoneOmsService.updateOrder', async () => {
      const updateOrderSpy = jest.spyOn(FifozoneOmsService, 'updateOrder').mockResolvedValue({
        success: true,
        orderId: 189248,
        status: 'completed',
        trackingNumber: 'TRK-999-XYZ'
      });

      const res = await SyncService.pushOrderUpdate(189248, {
        status: 'completed',
        tracking_number: 'TRK-999-XYZ',
        carrier: 'BlueDart'
      });

      expect(updateOrderSpy).toHaveBeenCalledWith(189248, {
        status: 'completed',
        tracking_number: 'TRK-999-XYZ',
        carrier: 'BlueDart'
      });
      expect(res.success).toBe(true);
      expect(res.orderId).toBe(189248);
    });

    test('2.5 pushOrderUpdate throws and logs error on FifozoneOmsService failure', async () => {
      jest.spyOn(FifozoneOmsService, 'updateOrder').mockRejectedValue(new Error('Network Timeout'));

      await expect(
        SyncService.pushOrderUpdate(999999, { status: 'cancelled' })
      ).rejects.toThrow('Network Timeout');
    });
  });

  // ==========================================================================
  // SECTION 3: PLATFORM CONTROLLER & ROUTES MIGRATION
  // ==========================================================================
  describe('3. Platform Controller Category Tree & Routes', () => {

    test('3.1 getWooCommerceCategories calls FifozoneOmsService.getCategoryTree and formats response', async () => {
      const mockTree = [
        {
          title: 'Dog Food',
          value: '184|Dog Food',
          key: '184',
          children: [
            {
              title: 'Dry Dog Food',
              value: '210|Dry Dog Food',
              key: '210',
              children: []
            }
          ]
        }
      ];

      const treeSpy = jest.spyOn(FifozoneOmsService, 'getCategoryTree').mockResolvedValue(mockTree);

      const req = {};
      let jsonResponse = null;
      let statusCode = 0;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              resolveDone();
            }
          };
        }
      };

      platformController.getWooCommerceCategories(req, res);
      await donePromise;

      expect(treeSpy).toHaveBeenCalled();
      expect(statusCode).toBe(200);
      expect(jsonResponse.statusCode).toBe(200);
      expect(jsonResponse.data).toEqual(mockTree);
      expect(jsonResponse.data[0].title).toBe('Dog Food');
      expect(jsonResponse.data[0].value).toBe('184|Dog Food');
      expect(jsonResponse.data[0].children[0].title).toBe('Dry Dog Food');
    });

    test('3.2 controller exports backward and forward compatible aliases', () => {
      expect(platformController.getWooCommerceCategories).toBeDefined();
      expect(platformController.getOmsCategories).toBe(platformController.getWooCommerceCategories);
      expect(platformController.getFifozoneCategories).toBe(platformController.getWooCommerceCategories);
    });

    test('3.3 platform.routes.js registers /woocommerce/categories, /categories, and /fifozone/categories', () => {
      const registeredGetPaths = platformRoutes.stack
        .filter(r => r.route && r.route.methods.get)
        .map(r => r.route.path);

      expect(registeredGetPaths).toContain('/woocommerce/categories');
      expect(registeredGetPaths).toContain('/categories');
      expect(registeredGetPaths).toContain('/fifozone/categories');
    });

    test('3.4 testConnection for fifozone platform invokes FifozoneOmsService.testConnection', async () => {
      const testSpy = jest.spyOn(FifozoneOmsService, 'testConnection').mockResolvedValue({
        success: true,
        productCount: 4250
      });

      const req = { body: { platform: 'fifozone' } };
      let jsonResponse = null;
      let statusCode = 0;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              resolveDone();
            }
          };
        }
      };

      platformController.testConnection(req, res);
      await donePromise;

      expect(testSpy).toHaveBeenCalled();
      expect(statusCode).toBe(200);
      expect(jsonResponse.data.success).toBe(true);
      expect(jsonResponse.data.productCount).toBe(4250);
    });
  });

  // ==========================================================================
  // SECTION 4: PRODUCT CONTROLLER CATEGORY RESOLUTION (importCSV)
  // ==========================================================================
  describe('4. Product Controller CSV Import Category Resolution', () => {

    test('4.1 importCSV resolves plain category names via FifozoneOmsService.resolveCategoryId', async () => {
      const resolveSpy = jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockImplementation(async (name) => {
        if (name.toLowerCase() === 'dog food') return 184;
        if (name.toLowerCase() === 'dry dog food') return 210;
        return null;
      });

      let updatedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue({
        sku: 'TEST-SKU-1',
        masterName: 'Existing Product',
        totalStock: 10,
        stockByPlatform: { warehouse: 10 },
        category: [],
        save: jest.fn().mockImplementation(function() {
          updatedProduct = this;
          return Promise.resolve(this);
        })
      });
      jest.spyOn(SyncService, 'pushStockToPlatforms').mockImplementation(() => {});

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              sku: 'TEST-SKU-1',
              masterName: 'Existing Product Updated',
              category: 'Dog Food, Dry Dog Food',
              totalStock: 10
            }
          ]
        }
      };

      let jsonResponse = null;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: () => ({
          json: (data) => {
            jsonResponse = data;
            resolveDone();
          }
        })
      };

      productController.importCSV(req, res);
      await donePromise;

      expect(resolveSpy).toHaveBeenCalledWith('Dog Food');
      expect(resolveSpy).toHaveBeenCalledWith('Dry Dog Food');
      expect(updatedProduct.category).toEqual(['184|Dog Food', '210|Dry Dog Food']);
    });

    test('4.2 importCSV preserves composite "id|name" strings without duplicate lookup', async () => {
      const resolveSpy = jest.spyOn(FifozoneOmsService, 'resolveCategoryId');

      let updatedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue({
        sku: 'TEST-SKU-2',
        masterName: 'Existing Product 2',
        totalStock: 5,
        stockByPlatform: { warehouse: 5 },
        category: [],
        save: jest.fn().mockImplementation(function() {
          updatedProduct = this;
          return Promise.resolve(this);
        })
      });
      jest.spyOn(SyncService, 'pushStockToPlatforms').mockImplementation(() => {});

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              sku: 'TEST-SKU-2',
              masterName: 'Existing Product 2',
              category: '184|Dog Food, 210|Dry Dog Food',
              totalStock: 5
            }
          ]
        }
      };

      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });
      const res = { status: () => ({ json: () => { resolveDone(); } }) };

      productController.importCSV(req, res);
      await donePromise;

      expect(resolveSpy).not.toHaveBeenCalled();
      expect(updatedProduct.category).toEqual(['184|Dog Food', '210|Dry Dog Food']);
    });

    test('4.3 importCSV falls back gracefully when category cannot be resolved', async () => {
      jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockResolvedValue(null);

      let updatedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue({
        sku: 'TEST-SKU-3',
        masterName: 'Product 3',
        totalStock: 1,
        stockByPlatform: { warehouse: 1 },
        category: [],
        save: jest.fn().mockImplementation(function() {
          updatedProduct = this;
          return Promise.resolve(this);
        })
      });
      jest.spyOn(SyncService, 'pushStockToPlatforms').mockImplementation(() => {});

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              sku: 'TEST-SKU-3',
              masterName: 'Product 3',
              category: 'Rare Exotic Category',
              totalStock: 1
            }
          ]
        }
      };

      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });
      const res = { status: () => ({ json: () => { resolveDone(); } }) };

      productController.importCSV(req, res);
      await donePromise;

      expect(updatedProduct.category).toEqual(['Rare Exotic Category']);
    });
  });

  // ==========================================================================
  // SECTION 5: IMPORT CONTROLLER CATEGORY & SUBCATEGORY RESOLUTION
  // ==========================================================================
  describe('5. Import Controller Category & Subcategory Resolution (uploadImport)', () => {

    test('5.1 uploadImport resolves category + subcategory via resolveSubCategoryId', async () => {
      const resolveSubSpy = jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockResolvedValue({
        categoryId: 184,
        subCategoryId: 210
      });

      let savedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue(null); // Create new
      jest.spyOn(Product, 'create').mockImplementation(function(data) {
        savedProduct = { ...data };
        return Promise.resolve(savedProduct);
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({ success: true });

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              masterName: 'Royal Canin Puppy',
              category: 'Dog Food',
              subCategory: 'Dry Food',
              sku: 'RC-PUP-001',
              totalStock: 15,
              mrp: 999
            }
          ]
        }
      };

      let jsonResponse = null;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });
      const res = {
        status: () => ({
          json: (data) => {
            jsonResponse = data;
            resolveDone();
          }
        })
      };

      importController.uploadImport(req, res);
      await donePromise;

      expect(resolveSubSpy).toHaveBeenCalledWith('Dog Food', 'Dry Food');
      expect(savedProduct).not.toBeNull();
      expect(savedProduct.category).toEqual(['184|Dog Food', '210|Dry Food']);
    });

    test('5.2 uploadImport resolves standalone category via resolveCategoryId', async () => {
      const resolveSpy = jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockResolvedValue(184);

      let savedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(function(data) {
        savedProduct = { ...data };
        return Promise.resolve(savedProduct);
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({ success: true });

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              masterName: 'Pedigree Adult',
              category: 'Dog Food',
              sku: 'PED-AD-001',
              totalStock: 20
            }
          ]
        }
      };

      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });
      const res = { status: () => ({ json: () => { resolveDone(); } }) };

      importController.uploadImport(req, res);
      await donePromise;

      expect(resolveSpy).toHaveBeenCalledWith('Dog Food');
      expect(savedProduct.category).toEqual(['184|Dog Food']);
    });

    test('5.3 uploadImport resolves standalone subcategory when parent category is omitted', async () => {
      const resolveSpy = jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockResolvedValue(305);

      let savedProduct = null;
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(function(data) {
        savedProduct = { ...data };
        return Promise.resolve(savedProduct);
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({ success: true });

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          products: [
            {
              masterName: 'Dental Sticks',
              subCategory: 'Dental Care',
              sku: 'DENT-001',
              totalStock: 10
            }
          ]
        }
      };

      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });
      const res = { status: () => ({ json: () => { resolveDone(); } }) };

      importController.uploadImport(req, res);
      await donePromise;

      expect(resolveSpy).toHaveBeenCalledWith('Dental Care');
      expect(savedProduct.category).toEqual(['305|Dental Care']);
    });
  });

  // ==========================================================================
  // SECTION 6: SETTINGS MODEL & CONTROLLER ALIGNMENT
  // ==========================================================================
  describe('6. Settings Model, Controller & Route Alignment', () => {

    test('6.1 Settings schema contains fifozoneOms sub-schema', () => {
      const paths = Settings.schema.paths;
      expect(paths['fifozoneOms.baseURL']).toBeDefined();
      expect(paths['fifozoneOms.apiKey']).toBeDefined();
      expect(paths['fifozoneOms.isConfigured']).toBeDefined();

      // Legacy woocommerce sub-schema retained for backward compatibility
      expect(paths['woocommerce.siteUrl']).toBeDefined();
      expect(paths['woocommerce.consumerKey']).toBeDefined();
      expect(paths['woocommerce.consumerSecret']).toBeDefined();
    });

    test('6.2 getSettings returns fifozoneOms credentials with env fallback', async () => {
      process.env.FIFOZONE_OMS_BASE_URL = 'https://fifozone.com/wp-json/oms/v1';
      process.env.FIFOZONE_OMS_API_KEY = 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';

      jest.spyOn(Settings, 'findOne').mockResolvedValue({
        toObject: () => ({
          companyName: 'Fifozone',
          fifozoneOms: {
            baseURL: '',
            apiKey: '',
            isConfigured: false
          }
        })
      });

      const req = {};
      let jsonResponse = null;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => ({
          json: (data) => {
            jsonResponse = data;
            resolveDone();
          }
        })
      };

      settingsController.getSettings(req, res);
      await donePromise;

      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.data.fifozoneOms).toBeDefined();
      expect(jsonResponse.data.fifozoneOms.baseURL).toBe('https://fifozone.com/wp-json/oms/v1');
      expect(jsonResponse.data.fifozoneOms.apiKey).toBe('oms_live_9f8d2b7e61a4c035824e87901bcdf562');
      expect(jsonResponse.data.fifozoneOms.isConfigured).toBe(true);
    });

    test('6.3 updateSettings persists fifozoneOms credentials and computes isConfigured', async () => {
      let savedSettingsDoc = null;
      const mockSettings = {
        companyName: 'Fifozone',
        fifozoneOms: { baseURL: '', apiKey: '', isConfigured: false },
        save: jest.fn().mockImplementation(function() {
          savedSettingsDoc = this;
          return Promise.resolve(this);
        }),
        toObject: function() { return { ...this }; }
      };

      jest.spyOn(Settings, 'findOne').mockResolvedValue(mockSettings);

      const req = {
        user: { _id: 'admin_user_123' },
        body: {
          fifozoneOms: {
            baseURL: 'https://fifozone.com/wp-json/oms/v1',
            apiKey: 'oms_live_new_key_789'
          }
        }
      };

      let jsonResponse = null;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => ({
          json: (data) => {
            jsonResponse = data;
            resolveDone();
          }
        })
      };

      settingsController.updateSettings(req, res);
      await donePromise;

      expect(mockSettings.save).toHaveBeenCalled();
      expect(savedSettingsDoc.fifozoneOms.baseURL).toBe('https://fifozone.com/wp-json/oms/v1');
      expect(savedSettingsDoc.fifozoneOms.apiKey).toBe('oms_live_new_key_789');
      expect(savedSettingsDoc.fifozoneOms.isConfigured).toBe(true);
    });

    test('6.4 testFifozoneOmsConnection invokes FifozoneOmsService.testConnection and returns success', async () => {
      const testSpy = jest.spyOn(FifozoneOmsService, 'testConnection').mockResolvedValue({
        success: true,
        productCount: 13599
      });

      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fifozoneOms: {
            baseURL: 'https://fifozone.com/wp-json/oms/v1',
            apiKey: 'oms_live_test_123'
          }
        })
      });

      const req = {
        body: {
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'oms_live_test_123'
        }
      };

      let jsonResponse = null;
      let statusCode = 0;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              resolveDone();
            }
          };
        }
      };

      settingsController.testFifozoneOmsConnection(req, res);
      await donePromise;

      expect(testSpy).toHaveBeenCalledWith({
        baseURL: 'https://fifozone.com/wp-json/oms/v1',
        apiKey: 'oms_live_test_123'
      });
      expect(statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);
      expect(jsonResponse.message).toContain('13599 products');
    });

    test('6.5 testFifozoneOmsConnection returns 400 on failure', async () => {
      jest.spyOn(FifozoneOmsService, 'testConnection').mockRejectedValue(new Error('Invalid OMS API Key'));

      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({})
      });

      const req = {
        body: {
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'invalid_key'
        }
      };

      let jsonResponse = null;
      let statusCode = 0;
      let resolveDone;
      const donePromise = new Promise(r => { resolveDone = r; });

      const res = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => {
              jsonResponse = data;
              resolveDone();
            }
          };
        }
      };

      settingsController.testFifozoneOmsConnection(req, res);
      await donePromise;

      expect(statusCode).toBe(400);
      expect(jsonResponse.success).toBe(false);
      expect(jsonResponse.message).toContain('Invalid OMS API Key');
    });

    test('6.6 settings.routes.js registers /test-fifozone-oms', () => {
      const registeredPostPaths = settingsRoutes.stack
        .filter(r => r.route && r.route.methods.post)
        .map(r => r.route.path);

      expect(registeredPostPaths).toContain('/test-fifozone-oms');
    });
  });

});
