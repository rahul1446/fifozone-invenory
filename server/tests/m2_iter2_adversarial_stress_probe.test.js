/**
 * m2_iter2_adversarial_stress_probe.test.js
 * 
 * EMPIRICAL ADVERSARIAL STRESS PROBE SUITE FOR MILESTONE 2 ITERATION 2
 * 
 * Objectives:
 * 1. Challenge Inventory Double-Deduction:
 *    - Probe repeated sync calls with existing orders.
 *    - Verify that Product.save() and InventoryLog.create() are NEVER called when an order already exists in the database.
 * 2. Challenge Corrupt & Hostile Order Payloads:
 *    - Execute sync with items: undefined, null, [null], empty array, strings, and non-numeric quantities.
 *    - Verify that no unhandled TypeError escapes and the batch continues processing without aborting.
 * 3. Challenge Category Deduplication:
 *    - Verify that importController.uploadImport does not insert duplicate subcategory strings when multiple parent categories share a subcategory.
 */

const SyncService = require('../src/services/sync.service');
const FifozoneOmsService = require('../src/services/fifozoneOms.service');
const importController = require('../src/controllers/import.controller');

// Models
const Order = require('../src/models/Order.model');
const Product = require('../src/models/Product.model');
const PlatformCredential = require('../src/models/PlatformCredential.model');
const PlatformSync = require('../src/models/PlatformSync.model');
const InventoryLog = require('../src/models/InventoryLog.model');
const notificationService = require('../src/services/notification.service');

// Helper to execute asyncHandler controllers
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

describe('Milestone 2 Iteration 2 Empirical Adversarial Stress Probe', () => {

  beforeEach(() => {
    jest.spyOn(PlatformSync, 'findOneAndUpdate').mockResolvedValue({});
    jest.spyOn(PlatformCredential, 'findOne').mockResolvedValue(null);
    jest.spyOn(notificationService, 'createNotification').mockResolvedValue({});
    jest.spyOn(SyncService, 'generateOrderNumber').mockImplementation(async () => 'FI-TEST-' + Math.floor(Math.random() * 100000));
    process.env.FIFOZONE_OMS_API_KEY = 'oms_live_stress_key_888';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FifozoneOmsService.clearCategoryCache();
    FifozoneOmsService.clearBrandsCache();
  });

  // ============================================================================
  // SUITE 1: INVENTORY DOUBLE-DEDUCTION PREVENTION
  // ============================================================================
  describe('Suite 1: Inventory Double-Deduction Prevention on Repeated Sync', () => {

    test('1.1 Multi-cycle sync simulation: Existing orders NEVER trigger Product.save() or InventoryLog.create()', async () => {
      const mockProduct = {
        _id: 'prod_stress_1',
        sku: 'SKU-STRESS-1',
        masterName: 'Stress Product 1',
        totalStock: 100,
        stockByPlatform: { fifozone: 50 },
        totalSold: 10,
        soldThisMonth: 10,
        lowStockThreshold: 15,
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
      };

      const mockOrderInDb = {
        _id: 'db_ord_repeat_9901',
        platformOrderId: 'ORD-REPEAT-9901',
        status: 'processing',
        items: [{ sku: 'SKU-STRESS-1', quantity: 5 }],
        save: jest.fn().mockResolvedValue({})
      };

      const inventoryLogSpy = jest.spyOn(InventoryLog, 'create').mockResolvedValue({});

      // Simulate order returned from Fifozone OMS
      const pullOrdersMock = jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: 'ORD-REPEAT-9901',
          platformStatus: 'processing',
          customer: { name: 'Repeat Buyer' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-STRESS-1', quantity: 5, unitPrice: 100 }]
        }
      ]);

      // Order already exists in DB
      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

      // Execute Sync Run 1 (Simulating repeated cron polling)
      await SyncService.syncOrders();
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(inventoryLogSpy).not.toHaveBeenCalled();
      expect(mockProduct.totalStock).toBe(100);

      // Execute Sync Run 2
      await SyncService.syncOrders();
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(inventoryLogSpy).not.toHaveBeenCalled();
      expect(mockProduct.totalStock).toBe(100);

      // Execute Sync Run 3
      await SyncService.syncOrders();
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(inventoryLogSpy).not.toHaveBeenCalled();
      expect(mockProduct.totalStock).toBe(100);
    });

    test('1.2 Existing order status & tracking update: Updates Order record but NEVER touches Product or InventoryLog', async () => {
      const mockProduct = {
        _id: 'prod_stress_2',
        sku: 'SKU-STRESS-2',
        totalStock: 50,
        save: jest.fn().mockResolvedValue({})
      };

      const mockOrderInDb = {
        _id: 'db_ord_update_88',
        platformOrderId: 'ORD-UPDATE-88',
        status: 'processing',
        statusHistory: [{ status: 'processing', timestamp: new Date() }],
        trackingNumber: '',
        courierPartner: '',
        trackingUrl: '',
        items: [{ sku: 'SKU-STRESS-2', quantity: 2 }],
        save: jest.fn().mockResolvedValue({})
      };

      const inventoryLogSpy = jest.spyOn(InventoryLog, 'create').mockResolvedValue({});
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: 'ORD-UPDATE-88',
          platformStatus: 'completed',
          shippingTracking: {
            trackingNumber: 'TRACK-999-XYZ',
            courierPartner: 'BlueDart',
            trackingUrl: 'https://track.bluedart.com/999'
          },
          items: [{ sku: 'SKU-STRESS-2', quantity: 2, unitPrice: 200 }]
        }
      ]);

      await SyncService.syncOrders();

      // Order was updated and saved
      expect(mockOrderInDb.status).toBe('delivered');
      expect(mockOrderInDb.trackingNumber).toBe('TRACK-999-XYZ');
      expect(mockOrderInDb.courierPartner).toBe('BlueDart');
      expect(mockOrderInDb.trackingUrl).toBe('https://track.bluedart.com/999');
      expect(mockOrderInDb.deliveredAt).toBeDefined();
      expect(mockOrderInDb.save).toHaveBeenCalledTimes(1);

      // Product and InventoryLog are UNTOUCHED
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(inventoryLogSpy).not.toHaveBeenCalled();
      expect(mockProduct.totalStock).toBe(50);
    });

    test('1.3 Existing order backfills empty items without stock deduction', async () => {
      const mockProduct = {
        _id: 'prod_stress_3',
        sku: 'SKU-STRESS-3',
        masterName: 'Product 3',
        totalStock: 75,
        save: jest.fn().mockResolvedValue({})
      };

      const mockOrderInDb = {
        _id: 'db_ord_empty_items',
        platformOrderId: 'ORD-EMPTY-ITEMS',
        status: 'processing',
        items: [], // empty items array from earlier sync
        save: jest.fn().mockResolvedValue({})
      };

      const inventoryLogSpy = jest.spyOn(InventoryLog, 'create').mockResolvedValue({});
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);
      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: 'ORD-EMPTY-ITEMS',
          platformStatus: 'processing',
          items: [{ sku: 'SKU-STRESS-3', quantity: 3, unitPrice: 150 }]
        }
      ]);

      await SyncService.syncOrders();

      // Items were backfilled
      expect(mockOrderInDb.items.length).toBe(1);
      expect(mockOrderInDb.items[0].quantity).toBe(3);
      expect(mockOrderInDb.save).toHaveBeenCalledTimes(1);

      // But NO stock deduction occurred!
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(inventoryLogSpy).not.toHaveBeenCalled();
      expect(mockProduct.totalStock).toBe(75);
    });

    test('1.4 Batch with mixed new and existing orders deducts ONLY for new orders', async () => {
      const productNew = {
        _id: 'prod_new',
        sku: 'SKU-NEW',
        masterName: 'New Product',
        totalStock: 50,
        stockByPlatform: { fifozone: 30 },
        totalSold: 0,
        soldThisMonth: 0,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };

      const productExisting = {
        _id: 'prod_existing',
        sku: 'SKU-EXISTING',
        masterName: 'Existing Product',
        totalStock: 100,
        stockByPlatform: { fifozone: 50 },
        totalSold: 20,
        soldThisMonth: 10,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };

      const existingOrderInDb = {
        _id: 'db_existing_ord',
        platformOrderId: 'ORD-EXISTING-1',
        status: 'processing',
        items: [{ sku: 'SKU-EXISTING', quantity: 4 }],
        save: jest.fn().mockResolvedValue({})
      };

      jest.spyOn(Order, 'findOne').mockImplementation(({ platformOrderId }) => {
        if (platformOrderId === 'ORD-EXISTING-1') return Promise.resolve(existingOrderInDb);
        return Promise.resolve(null);
      });

      jest.spyOn(Product, 'findOne').mockImplementation(({ sku }) => {
        if (sku === 'SKU-NEW') return Promise.resolve(productNew);
        if (sku === 'SKU-EXISTING') return Promise.resolve(productExisting);
        return Promise.resolve(null);
      });

      const inventoryLogSpy = jest.spyOn(InventoryLog, 'create').mockResolvedValue({});
      jest.spyOn(Order.prototype, 'save').mockImplementation(function() { return Promise.resolve(this); });

      const batch = [
        {
          platformOrderId: 'ORD-EXISTING-1',
          platformStatus: 'processing',
          items: [{ sku: 'SKU-EXISTING', quantity: 4, unitPrice: 200 }]
        },
        {
          platformOrderId: 'ORD-NEW-1',
          platformStatus: 'processing',
          customer: { name: 'New Buyer' },
          shippingAddress: { line1: 'Addr' },
          items: [{ sku: 'SKU-NEW', quantity: 5, unitPrice: 100 }]
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(batch);

      await SyncService.syncOrders();

      // productExisting: 0 save calls, stock unchanged at 100
      expect(productExisting.save).not.toHaveBeenCalled();
      expect(productExisting.totalStock).toBe(100);

      // productNew: exactly 1 save call, stock deducted from 50 to 45
      expect(productNew.save).toHaveBeenCalledTimes(1);
      expect(productNew.totalStock).toBe(45);

      // InventoryLog was created exactly ONCE (for the new order only)
      expect(inventoryLogSpy).toHaveBeenCalledTimes(1);
      expect(inventoryLogSpy).toHaveBeenCalledWith(expect.objectContaining({
        sku: 'SKU-NEW',
        changeQuantity: -5,
        newStock: 45
      }));
    });
  });

  // ============================================================================
  // SUITE 2: HOSTILE & CORRUPT ORDER PAYLOAD RESILIENCE
  // ============================================================================
  describe('Suite 2: Hostile & Corrupt Order Payload Resilience', () => {

    test('2.1 Batch with 10 corrupt/hostile payloads does NOT abort: valid tail order is processed', async () => {
      const validProduct = {
        _id: 'prod_valid_tail',
        sku: 'SKU-VALID-TAIL',
        masterName: 'Valid Tail Product',
        totalStock: 20,
        stockByPlatform: { fifozone: 10 },
        totalSold: 0,
        soldThisMonth: 0,
        save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
      };

      jest.spyOn(Order, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'findOne').mockImplementation(({ sku }) => {
        if (sku === 'SKU-VALID-TAIL') return Promise.resolve(validProduct);
        return Promise.resolve(null);
      });
      jest.spyOn(Order.prototype, 'save').mockImplementation(function() { return Promise.resolve(this); });
      const inventoryLogSpy = jest.spyOn(InventoryLog, 'create').mockResolvedValue({});

      const adversarialBatch = [
        null,                                                        // 1. null order
        undefined,                                                   // 2. undefined order
        "string instead of object",                                  // 3. primitive order
        { platformOrderId: null },                                   // 4. null platformOrderId
        { platformOrderId: '' },                                     // 5. empty platformOrderId
        { platformOrderId: 'ORD-NO-ITEMS' },                         // 6. missing items property
        { platformOrderId: 'ORD-NULL-ITEMS', items: null },          // 7. items is null
        { platformOrderId: 'ORD-ARRAY-OF-NULLS', items: [null, undefined, false, 0, 'invalid'] }, // 8. hostile items array
        { platformOrderId: 'ORD-EMPTY-ITEMS', items: [] },           // 9. empty items array
        {
          platformOrderId: 'ORD-VALID-TAIL',                         // 10. valid order at the end of batch!
          platformStatus: 'processing',
          customer: { name: 'Resilient Buyer' },
          shippingAddress: { line1: 'Main St', city: 'Metropolis', state: 'NY', pincode: '10001' },
          items: [{ sku: 'SKU-VALID-TAIL', quantity: 2, unitPrice: 300, totalPrice: 600 }]
        }
      ];

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(adversarialBatch);

      await expect(SyncService.syncOrders()).resolves.not.toThrow();

      // The valid tail order was successfully processed despite all 9 prior failures!
      expect(validProduct.save).toHaveBeenCalledTimes(1);
      expect(validProduct.totalStock).toBe(18);
      expect(inventoryLogSpy).toHaveBeenCalledTimes(1);
      expect(inventoryLogSpy).toHaveBeenCalledWith(expect.objectContaining({
        sku: 'SKU-VALID-TAIL',
        changeQuantity: -2,
        newStock: 18
      }));
    });

    test('2.2 Non-numeric and extreme quantities do not pollute totalStock to NaN', async () => {
      const corruptQuantities = ['abc', NaN, null, undefined, -10, 0, {}, [], '100abc'];

      for (const badQty of corruptQuantities) {
        const mockProd = {
          _id: 'prod_bad_qty',
          sku: 'SKU-BAD-QTY',
          masterName: 'Bad Qty Prod',
          totalStock: 50,
          stockByPlatform: { fifozone: 25 },
          totalSold: 5,
          soldThisMonth: 5,
          save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
        };

        jest.spyOn(Order, 'findOne').mockResolvedValue(null);
        jest.spyOn(Product, 'findOne').mockResolvedValue(mockProd);
        jest.spyOn(Order.prototype, 'save').mockImplementation(function() { return Promise.resolve(this); });

        const batch = [
          {
            platformOrderId: 'ORD-BAD-QTY-' + String(badQty),
            platformStatus: 'processing',
            items: [{ sku: 'SKU-BAD-QTY', quantity: badQty, unitPrice: 50 }]
          }
        ];

        jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(batch);

        await SyncService.syncOrders();

        // totalStock must remain a finite valid number, NEVER NaN
        expect(Number.isNaN(mockProd.totalStock)).toBe(false);
        expect(mockProd.totalStock).toBeGreaterThanOrEqual(0);
      }
    });

    test('2.3 Non-array items properties (strings, numbers, booleans, objects) are safely ignored', async () => {
      const nonArrayItemsCases = [
        "not-an-array-string",
        12345,
        true,
        { item1: 'foo' },
        null
      ];

      jest.spyOn(Order, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Order.prototype, 'save').mockImplementation(function() { return Promise.resolve(this); });

      const batch = nonArrayItemsCases.map((badItems, idx) => ({
        platformOrderId: `ORD-BAD-ITEMS-${idx}`,
        platformStatus: 'processing',
        items: badItems
      }));

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue(batch);

      // Verify no TypeError: items is not iterable or similar occurs
      await expect(SyncService.syncOrders()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // SUITE 3: CATEGORY DEDUPLICATION IN uploadImport
  // ============================================================================
  describe('Suite 3: Category Deduplication in importController.uploadImport', () => {

    test('3.1 Multiple parent categories sharing a subcategory insert the subcategory EXACTLY once', async () => {
      let createdProduct = null;

      // Mock resolveSubCategoryId: multiple parent categories all share subcategoryId 55 ('Dry Food')
      jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockImplementation(async (cat, sub) => {
        if (cat === 'Dogs') return { categoryId: 10, subCategoryId: 55 };
        if (cat === 'Food') return { categoryId: 12, subCategoryId: 55 };
        if (cat === 'Pets') return { categoryId: 14, subCategoryId: 55 };
        if (cat === 'Nutrition') return { categoryId: 16, subCategoryId: 55 };
        return { categoryId: 99, subCategoryId: 55 };
      });

      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => {
        createdProduct = data;
        return Promise.resolve({ ...data, _id: 'created_product_dedup' });
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Multi Parent Product',
              category: 'Dogs, Food, Pets, Nutrition',
              subCategory: 'Dry Food',
              mrp: 800,
              totalStock: 20
            }
          ]
        },
        user: { _id: 'user_admin' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.success).toBe(true);
      expect(createdProduct).toBeDefined();

      // Verify category array
      expect(createdProduct.category).toEqual([
        '10|Dogs',
        '55|Dry Food',
        '12|Food',
        '14|Pets',
        '16|Nutrition'
      ]);

      // Exactly 1 occurrence of '55|Dry Food'
      const dryFoodCount = createdProduct.category.filter(c => c === '55|Dry Food').length;
      expect(dryFoodCount).toBe(1);
    });

    test('3.2 Pre-formatted id|name and duplicate strings are cleanly deduplicated', async () => {
      let createdProduct = null;

      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => {
        createdProduct = data;
        return Promise.resolve({ ...data, _id: 'created_product_preformat' });
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Preformatted Category Product',
              category: ['10|Dogs', '10|Dogs', '12|Food', '10|dogs', '15|Toys'],
              mrp: 500,
              totalStock: 10
            }
          ]
        },
        user: { _id: 'user_admin' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(createdProduct.category).toEqual(['10|Dogs', '12|Food', '15|Toys']);
    });

    test('3.3 Plain category strings without subcategory are deduplicated case-insensitively', async () => {
      let createdProduct = null;

      jest.spyOn(FifozoneOmsService, 'resolveCategoryId').mockResolvedValue(null); // falls back to raw string
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => {
        createdProduct = data;
        return Promise.resolve({ ...data, _id: 'created_product_raw' });
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Raw Categories Product',
              category: 'Dogs, Food, dogs, FOOD, Accessories',
              mrp: 300,
              totalStock: 5
            }
          ]
        },
        user: { _id: 'user_admin' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(createdProduct.category).toEqual(['Dogs', 'Food', 'Accessories']);
    });
  });
});
