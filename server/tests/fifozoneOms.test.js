/**
 * fifozoneOms.test.js
 * 
 * Comprehensive E2E and Unit Test Suite for Fifozone Universal OMS API Client.
 * 
 * Tiers Covered:
 *   - Tier 1: Product catalog retrieval (pullProducts), single product lookup,
 *             category tree / root categories, order ingestion (pullOrders), connection test.
 *   - Tier 2: Boundary & error cases (empty payloads, 401 unauthorized, non-existent SKU/ID,
 *             missing parameters, network failures).
 *   - Tier 3: Category resolution (resolveCategoryId, resolveSubCategoryId),
 *             stock push (pushStock), price push (pushPrice).
 *   - Tier 4: Order status update (updateOrder), product creation/update/deletion, batch workflows.
 * 
 * CRITICAL SAFETY REQUIREMENT (R3):
 * All write, update, and delete operations (POST /products/create, POST /products/update,
 * POST /products/delete, POST /orders/update, POST /hub) MUST use Jest mocks to strictly
 * safeguard against modifying live production store data.
 * Live network testing is strictly restricted to read-only GET requests.
 */

const axios = require('axios');
const http = require('http');
const https = require('https');
const FifozoneOmsService = require('../src/services/fifozoneOms.service');

// Helper for conditional execution of M1 methods pending implementer
const hasMethod = (methodName) => typeof FifozoneOmsService[methodName] === 'function';
const itIf = (condition) => (condition ? it : it.skip);
const describeIf = (condition) => (condition ? describe : describe.skip);

describe('Fifozone Universal OMS Service Test Suite', () => {
  const testAgent = new https.Agent({ keepAlive: false });
  const originalGetClient = () => {
    const client = FifozoneOmsService.getClient.bind(FifozoneOmsService)();
    client.defaults.httpsAgent = testAgent;
    return client;
  };

  beforeAll(() => {
    // Ensure axios instances in tests use non-persistent sockets to avoid Jest open handle leaks
    axios.defaults.httpsAgent = testAgent;
  });

  afterAll(() => {
    testAgent.destroy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // TIER 1: CORE READ & CATALOG RETRIEVAL OPERATIONS
  // ============================================================================
  describe('Tier 1: Core Read & Catalog Retrieval', () => {

    describe('1.1 Connection Verification (testConnection)', () => {
      test('live read-only testConnection connects successfully and returns total count', async () => {
        const result = await FifozoneOmsService.testConnection();
        expect(result).toHaveProperty('success', true);
        expect(typeof result.productCount).toBe('number');
        expect(result.productCount).toBeGreaterThan(0);
      }, 15000);

      test('mocked testConnection parses total and count fallback properly', async () => {
        const mockGet = jest.fn().mockResolvedValue({
          data: { status: 'success', total: 4250, count: 1 }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const result = await FifozoneOmsService.testConnection();
        expect(result).toEqual({ success: true, productCount: 4250 });
        expect(mockGet).toHaveBeenCalledWith('/products', { params: { limit: 1 } });
      });
    });

    describe('1.2 Product Catalog Retrieval (pullProducts)', () => {
      test('live read-only pullProducts fetches real product page and returns normalized items', async () => {
        const products = await FifozoneOmsService.pullProducts({ limit: 2, maxPages: 1 });
        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBeGreaterThan(0);

        const first = products[0];
        expect(first).toHaveProperty('platformProductId');
        expect(first).toHaveProperty('masterName');
        expect(first).toHaveProperty('sku');
        expect(first).toHaveProperty('price');
        expect(first).toHaveProperty('stock');
        expect(first).toHaveProperty('stockStatus');
        expect(first).toHaveProperty('images');
        expect(Array.isArray(first.images)).toBe(true);
      }, 20000);

      test('mocked pullProducts normalizes multi-page batch responses and respects maxPages', async () => {
        const mockGet = jest.fn()
          .mockResolvedValueOnce({
            data: {
              status: 'success',
              page: 1,
              total_pages: 3,
              limit: 2,
              data: [
                {
                  id: 101,
                  name: 'Royal Canin Maxi Adult &amp; Junior',
                  sku: 'RC-MAXI-01',
                  price: '1200',
                  regular_price: '1300',
                  stock_quantity: 15,
                  stock_status: 'instock',
                  manage_stock: 1,
                  categories: [{ name: 'Dog Food' }],
                  brands: [{ name: 'Royal Canin' }],
                  image: 'https://fifozone.com/uploads/rc1.jpg',
                  gallery_images: ['https://fifozone.com/uploads/rc2.jpg']
                },
                {
                  id: 102,
                  name: 'Farmina N&amp;D Pumpkin Dog Food',
                  sku: 'FAR-PUMP-02',
                  price: 850,
                  stock_quantity: 0,
                  stock_status: 'outofstock',
                  categories: ['Dry Dog Food'],
                  brand: 'Farmina'
                }
              ]
            }
          })
          .mockResolvedValueOnce({
            data: {
              status: 'success',
              page: 2,
              total_pages: 3,
              limit: 2,
              data: [
                {
                  id: 103,
                  name: 'Drools Focus Starter',
                  sku: 'DROOLS-START-01',
                  price: 550,
                  stock_quantity: 5,
                  stock_status: 'instock'
                }
              ]
            }
          });

        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const products = await FifozoneOmsService.pullProducts({ limit: 2, maxPages: 2 });
        expect(products).toHaveLength(3);
        expect(mockGet).toHaveBeenCalledTimes(2);

        // Verify HTML entity decode in masterName
        expect(products[0].masterName).toBe('Royal Canin Maxi Adult & Junior');
        expect(products[0].sku).toBe('RC-MAXI-01');
        expect(products[0].price).toBe(1200);
        expect(products[0].mrp).toBe(1300);
        expect(products[0].brand).toBe('Royal Canin');
        expect(products[0].category).toBe('Dog Food');
        expect(products[0].images).toEqual([
          'https://fifozone.com/uploads/rc1.jpg',
          'https://fifozone.com/uploads/rc2.jpg'
        ]);

        expect(products[1].masterName).toBe('Farmina N&D Pumpkin Dog Food');
        expect(products[1].brand).toBe('Farmina');
        expect(products[1].stockStatus).toBe('outofstock');
      });

      test('mocked pullProducts stops when empty batch is returned', async () => {
        const mockGet = jest.fn().mockResolvedValueOnce({
          data: { status: 'success', total: 0, data: [] }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const products = await FifozoneOmsService.pullProducts();
        expect(products).toEqual([]);
        expect(mockGet).toHaveBeenCalledTimes(1);
      });
    });

    describe('1.3 Category & Subcategory Navigation (getCategories & getCategoryTree)', () => {
      test('live read-only categories root query returns top-level categories', async () => {
        const client = originalGetClient();
        const res = await client.get('/categories', { params: { parent: 0 } });
        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('categories');
        expect(Array.isArray(res.data.categories)).toBe(true);
        expect(res.data.categories.length).toBeGreaterThan(0);

        const firstCat = res.data.categories[0];
        expect(firstCat).toHaveProperty('id');
        expect(firstCat).toHaveProperty('name');
        expect(firstCat.parent_id).toBe(0);
      }, 15000);

      test('live read-only categories format=tree returns hierarchical category tree', async () => {
        const client = originalGetClient();
        const res = await client.get('/categories', { params: { format: 'tree' } });
        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('categories_tree');
        expect(Array.isArray(res.data.categories_tree)).toBe(true);

        const treeNode = res.data.categories_tree[0];
        expect(treeNode).toHaveProperty('id');
        expect(treeNode).toHaveProperty('name');
        expect(treeNode).toHaveProperty('subcategories');
      }, 15000);

      itIf(hasMethod('getCategoryTree'))('getCategoryTree transforms tree into TreeSelect format', async () => {
        const mockGet = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            categories_tree: [
              {
                id: 1640,
                name: 'DOGS',
                slug: 'dogs',
                subcategories: [
                  { id: 1650, name: 'Dog Food', slug: 'dog-food', subcategories: [] }
                ]
              }
            ]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const tree = await FifozoneOmsService.getCategoryTree();
        expect(Array.isArray(tree)).toBe(true);
        expect(tree[0].title).toBe('DOGS');
        expect(tree[0].value).toBe('1640|DOGS');
        expect(tree[0].children[0].title).toBe('Dog Food');
        expect(tree[0].children[0].value).toBe('1650|Dog Food');
      });
    });

    describe('1.4 Order Ingestion (pullOrders)', () => {
      test('live read-only orders endpoint returns valid HPOS order structures', async () => {
        const client = originalGetClient();
        const res = await client.get('/orders', { params: { limit: 1 } });
        expect(res.status).toBe(200);
        expect(res.data).toHaveProperty('data');
        expect(Array.isArray(res.data.data)).toBe(true);

        if (res.data.data.length > 0) {
          const order = res.data.data[0];
          expect(order).toHaveProperty('id');
          expect(order).toHaveProperty('status');
          expect(order).toHaveProperty('total');
          expect(order).toHaveProperty('billing');
        }
      }, 15000);

      itIf(hasMethod('pullOrders'))('pullOrders normalizes OMS orders to internal Order model schema', async () => {
        const mockGet = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            total: 1,
            data: [
              {
                id: 189248,
                status: 'processing',
                currency: 'INR',
                total: 344,
                payment_method: 'cod',
                payment_method_title: 'Pay On Delivery',
                billing: {
                  full_name: 'Amar Chakraborty',
                  email: 'amar@example.com',
                  phone: '9046488123',
                  address_1: 'Kalyangarh',
                  city: 'Ashoknagar',
                  state: 'WB',
                  postcode: '743272',
                  country: 'IN'
                },
                shipping_tracking: {
                  tracking_number: 'TRK9988',
                  carrier: 'Delhivery'
                },
                items: [
                  {
                    item_id: 10,
                    product_id: 186782,
                    name: 'Drools Focus Puppy',
                    sku: 'DROOLS-PUP-01',
                    quantity: 2,
                    total: 344
                  }
                ],
                date_created: '2026-10-13 05:33:35'
              }
            ]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const orders = await FifozoneOmsService.pullOrders({ limit: 10 });
        expect(Array.isArray(orders)).toBe(true);
        expect(orders).toHaveLength(1);

        const o = orders[0];
        expect(o.platformOrderId).toBe('189248');
        expect(o.platformStatus).toBe('processing');
        expect(o.totalAmount).toBe(344);
        expect(o.customer.name).toBe('Amar Chakraborty');
        expect(o.customer.email).toBe('amar@example.com');
        expect(o.shippingAddress.city).toBe('Ashoknagar');
        expect(o.shippingAddress.pincode).toBe('743272');
        expect(o.items[0].sku).toBe('DROOLS-PUP-01');
        expect(o.items[0].quantity).toBe(2);
      });
    });
  });

  // ============================================================================
  // TIER 2: BOUNDARY, RESILIENCE & ERROR HANDLING
  // ============================================================================
  describe('Tier 2: Boundary, Resilience & Error Handling', () => {

    test('401 Unauthorized handling on missing or invalid API key', async () => {
      const unauthorizedClient = axios.create({
        baseURL: 'https://fifozone.com/wp-json/oms/v1',
        headers: { 'X-OMS-Key': 'invalid_secret_key_probe' }
      });

      await expect(unauthorizedClient.get('/hub', { params: { limit: 1 } }))
        .rejects
        .toMatchObject({
          response: {
            status: 401
          }
        });
    }, 15000);

    test('querying non-existent SKU returns empty results without crashing', async () => {
      const client = originalGetClient();
      const res = await client.get('/products', {
        params: { search: 'NON_EXISTENT_SKU_PROBE_99999999' }
      });
      expect(res.status).toBe(200);
      expect(res.data.count).toBe(0);
      expect(res.data.data).toEqual([]);
    }, 15000);

    test('service gracefully catches and formats network / 500 error messages', async () => {
      const mockGet = jest.fn().mockRejectedValue({
        response: {
          data: { message: 'Database connection timeout on master node' }
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      await expect(FifozoneOmsService.pullProducts())
        .rejects
        .toThrow('Fifozone OMS pullProducts failed: Database connection timeout on master node');
    });

    describe('Payload Builder Normalization & Sanitization', () => {
      test('formatImages filters invalid hosts (example.com, localhost, placeholder) and keeps valid URLs', () => {
        const rawImages = [
          'https://fifozone.com/uploads/photo1.jpg',
          'http://example.com/fake.png',
          'https://localhost:3000/test.jpg',
          { url: 'https://fifozone.com/uploads/photo2.png' },
          { url: 'http://placeholder.org/img.jpg' },
          'invalid-string-not-url'
        ];

        const clean = FifozoneOmsService.formatImages(rawImages);
        expect(clean).toEqual([
          'https://fifozone.com/uploads/photo1.jpg',
          'https://fifozone.com/uploads/photo2.png'
        ]);
      });

      test('formatCategories handles strings, objects, pipe-separated names and subcategories', () => {
        const categories = ['1640|DOGS', 'Dog Food', '1640|DOGS']; // duplicate
        const subCategory = 'Puppy Food';

        const clean = FifozoneOmsService.formatCategories(categories, subCategory);
        expect(clean).toEqual(['DOGS', 'Dog Food', 'Puppy Food']);
      });

      test('buildOmsPayload handles missing optional fields with safe defaults', () => {
        const minimalProduct = {
          masterName: 'Minimal Cat Toy'
        };

        const payload = FifozoneOmsService.buildOmsPayload(minimalProduct);
        expect(payload.name).toBe('Minimal Cat Toy');
        expect(payload.sku).toBe('');
        expect(payload.regular_price).toBe('0');
        expect(payload.stock_quantity).toBe(0);
        expect(payload.stock_status).toBe('outofstock');
        expect(payload.brand).toBe('Generic');
        expect(payload.categories).toEqual([]);
      });

      test('buildOmsPayload extracts barcodes, HSN codes, GST rates, and weights correctly', () => {
        const fullProduct = {
          masterName: 'Drools 10kg',
          sku: 'DR-10KG',
          sellingPrice: { fifozone: 2499 },
          stockByPlatform: { fifozone: 40 },
          isActive: true,
          brand: 'Drools',
          category: ['Dog Food'],
          subCategory: 'Adult Food',
          barcode: '8901234567890',
          hsnCode: '23091000',
          gstPercent: 18,
          weight: { value: 10.5 },
          images: ['https://fifozone.com/drools.jpg']
        };

        const payload = FifozoneOmsService.buildOmsPayload(fullProduct);
        expect(payload.name).toBe('Drools 10kg');
        expect(payload.sku).toBe('DR-10KG');
        expect(payload.regular_price).toBe('2499');
        expect(payload.stock_quantity).toBe(40);
        expect(payload.stock_status).toBe('instock');
        expect(payload.status).toBe('publish');
        expect(payload.hsn_code).toBe('23091000');
        expect(payload.gst_rate).toBe('18');
        expect(payload.weight).toBe('10.5');
        expect(payload.meta_data).toEqual({ barcode_ean: '8901234567890' });
        expect(payload.categories).toEqual(['Dog Food', 'Adult Food']);
      });
    });
  });

  // ============================================================================
  // TIER 3: CATEGORY RESOLUTION & STOCK/PRICE PUSH (SAFE MOCKED WRITES)
  // ============================================================================
  describe('Tier 3: Category Resolution & Stock/Price Push (Safe Mocked)', () => {

    describe('3.1 Stock Push (pushStock) — SAFE MOCKED', () => {
      test('pushStock sends atomic partial stock payload and sets instock for quantity > 0', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: { status: 'success', updated: 1, results: [{ sku: 'TEST-SKU-01', stock_quantity: 45 }] }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const result = await FifozoneOmsService.pushStock('TEST-SKU-01', 45);

        expect(result.success).toBe(true);
        expect(result.sku).toBe('TEST-SKU-01');
        expect(result.quantity).toBe(45);
        expect(result.platform).toBe('fifozone');

        expect(mockPost).toHaveBeenCalledWith('/products/update', {
          sku: 'TEST-SKU-01',
          stock_quantity: 45,
          stock_status: 'instock'
        });
      });

      test('pushStock sets outofstock when quantity is 0 or negative', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: { status: 'success', updated: 1 }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        await FifozoneOmsService.pushStock('ZERO-SKU', 0);

        expect(mockPost).toHaveBeenCalledWith('/products/update', {
          sku: 'ZERO-SKU',
          stock_quantity: 0,
          stock_status: 'outofstock'
        });
      });
    });

    describe('3.2 Price Push (pushPrice) — SAFE MOCKED', () => {
      test('pushPrice sends regular_price update payload to /products/update', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: { status: 'success', updated: 1 }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const result = await FifozoneOmsService.pushPrice('PRICE-SKU-01', 899);

        expect(result.success).toBe(true);
        expect(result.price).toBe(899);
        expect(mockPost).toHaveBeenCalledWith('/products/update', {
          sku: 'PRICE-SKU-01',
          regular_price: '899'
        });
      });
    });

    describe('3.3 Category Resolution (resolveCategoryId & resolveSubCategoryId)', () => {
      itIf(hasMethod('resolveCategoryId'))('resolveCategoryId maps category name to ID', async () => {
        const mockGet = jest.fn().mockResolvedValue({
          data: {
            categories: [
              { id: 1640, name: 'DOGS', parent_id: 0 },
              { id: 1639, name: 'CATS', parent_id: 0 }
            ]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const catId = await FifozoneOmsService.resolveCategoryId('DOGS', 0);
        expect(catId).toBe(1640);
      });

      itIf(hasMethod('resolveSubCategoryId'))('resolveSubCategoryId resolves hierarchical pair', async () => {
        const mockGet = jest.fn()
          .mockResolvedValueOnce({
            data: { categories: [{ id: 1640, name: 'DOGS', parent_id: 0 }] }
          })
          .mockResolvedValueOnce({
            data: { categories: [{ id: 1650, name: 'Dog Food', parent_id: 1640 }] }
          });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

        const pair = await FifozoneOmsService.resolveSubCategoryId('DOGS', 'Dog Food');
        expect(pair).toEqual({ categoryId: 1640, subCategoryId: 1650 });
      });
    });
  });

  // ============================================================================
  // TIER 4: ORDER FULFILLMENT, PRODUCT MUTATIONS & BATCH ACTIONS (SAFE MOCKED)
  // ============================================================================
  describe('Tier 4: Order Fulfillment & Product Mutations (Safe Mocked)', () => {

    describe('4.1 Order Status & Tracking Update (updateOrder) — SAFE MOCKED', () => {
      itIf(hasMethod('updateOrder'))('updateOrder sends fulfillment details to /orders/update', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            order_id: 189248,
            order_status: 'completed',
            tracking: { tracking_number: 'DEL123456', carrier: 'Delhivery' }
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const result = await FifozoneOmsService.updateOrder(189248, {
          status: 'completed',
          tracking_number: 'DEL123456',
          carrier: 'Delhivery'
        });

        expect(result.success).toBe(true);
        expect(result.orderId).toBe(189248);
        expect(result.status).toBe('completed');
        expect(mockPost).toHaveBeenCalledWith('/orders/update', {
          id: 189248,
          status: 'completed',
          tracking_number: 'DEL123456',
          carrier: 'Delhivery'
        });
      });
    });

    describe('4.2 Product Creation & Batch Create — SAFE MOCKED', () => {
      test('createProduct posts payload to /products/create and parses returned ID', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            results: [{ id: 189210, sku: 'NEW-SKU-01', status: 'created' }]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const product = {
          masterName: 'Pedigree Puppy Chicken 3kg',
          sku: 'NEW-SKU-01',
          sellingPrice: { fifozone: 899 },
          stockByPlatform: { fifozone: 20 }
        };

        const res = await FifozoneOmsService.createProduct(product);
        expect(res).toEqual({ success: true, wooProductId: 189210, action: 'created' });
        expect(mockPost).toHaveBeenCalledWith('/products/create', expect.objectContaining({
          name: 'Pedigree Puppy Chicken 3kg',
          sku: 'NEW-SKU-01'
        }));
      });

      test('createProductsBatch posts array of product payloads', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            total_created: 2,
            results: [{ id: 101 }, { id: 102 }]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const products = [
          { masterName: 'Product 1', sku: 'P1' },
          { masterName: 'Product 2', sku: 'P2' }
        ];

        const res = await FifozoneOmsService.createProductsBatch(products);
        expect(res.total_created).toBe(2);
        expect(mockPost).toHaveBeenCalledWith('/products/create', expect.any(Array));
      });
    });

    describe('4.3 Product Update & Batch Update — SAFE MOCKED', () => {
      test('updateProduct sends ID or SKU identifier with partial fields to /products/update', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            results: [{ id: 186782, status: 'updated' }]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const product = {
          masterName: 'Drools Focus Adult',
          sku: 'DROOLS-ADULT',
          platformIds: { fifozone: { productId: '186782' } }
        };

        const res = await FifozoneOmsService.updateProduct(product);
        expect(res).toEqual({ success: true, wooProductId: 186782, action: 'updated' });
        expect(mockPost).toHaveBeenCalledWith('/products/update', expect.objectContaining({
          id: 186782
        }));
      });

      test('updateProductsBatch sends batch updates array to /products/update', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: { status: 'success', total_updated: 2 }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const updates = [
          { sku: 'SKU1', regular_price: '500' },
          { sku: 'SKU2', regular_price: '600' }
        ];

        const res = await FifozoneOmsService.updateProductsBatch(updates);
        expect(res.total_updated).toBe(2);
        expect(mockPost).toHaveBeenCalledWith('/products/update', updates);
      });
    });

    describe('4.4 Product Deletion & Batch Delete — SAFE MOCKED', () => {
      test('deleteProduct sends force delete request with ID or SKU to /products/delete', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: {
            status: 'success',
            results: [{ id: 186782, status: 'deleted' }]
          }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const product = {
          masterName: 'Discontinued Leash',
          sku: 'DISC-LEASH',
          platformIds: { fifozone: { productId: 186782 } }
        };

        const res = await FifozoneOmsService.deleteProduct(product, true);
        expect(res).toEqual({ success: true, wooProductId: 186782, action: 'deleted' });
        expect(mockPost).toHaveBeenCalledWith('/products/delete', {
          id: 186782,
          sku: 'DISC-LEASH',
          force: true
        });
      });

      test('deleteProductsBatch posts list of IDs and SKUs with force flag', async () => {
        const mockPost = jest.fn().mockResolvedValue({
          data: { status: 'success', total_deleted: 2 }
        });
        jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

        const items = [{ id: 101 }, { sku: 'SKU-OLD' }];
        const res = await FifozoneOmsService.deleteProductsBatch(items, true);
        expect(res.total_deleted).toBe(2);
        expect(mockPost).toHaveBeenCalledWith('/products/delete', [
          { id: 101, force: true },
          { sku: 'SKU-OLD', force: true }
        ]);
      });
    });
  });
});
