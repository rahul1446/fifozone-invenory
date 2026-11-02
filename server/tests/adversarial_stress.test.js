/**
 * adversarial_stress.test.js
 * 
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS FOR FIFOZONE OMS SERVICE
 * 
 * Focus Areas:
 * 1. Malformed inputs & boundary conditions (null, undefined, negative limits, corrupted types).
 * 2. TreeSelect hierarchy stress & corrupt node resilience (deep recursion, null nodes, missing keys).
 * 3. Network resilience & retry simulation (503, ECONNRESET, ETIMEDOUT, 429 RateLimit, 401 Auth fallback).
 * 4. Safe write barrier & payload contract enforcement (Mocks only for writes, verify schema).
 * 5. Live read-only endpoint verification (Zero writes on live production).
 * 6. Concurrency & cache invalidation stress.
 * 7. Error masking & false success reporting verification.
 */

const axios = require('axios');
const https = require('https');
const FifozoneOmsService = require('../src/services/fifozoneOms.service');

const isLiveDisabled = process.env.SKIP_LIVE_TESTS === 'true';

describe('Adversarial Stress Test Suite: Fifozone OMS Service', () => {
  const testAgent = new https.Agent({ keepAlive: false });

  beforeAll(() => {
    axios.defaults.httpsAgent = testAgent;
  });

  afterAll(() => {
    testAgent.destroy();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // SECTION 1: MALFORMED INPUTS & UNHANDLED TYPE ERRORS
  // ============================================================================
  describe('1. Malformed Inputs & Boundary Conditions', () => {

    test('1.1 pullOrders(null) safely handles null options without TypeError', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', data: [], total: 0, total_pages: 1 }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const orders = await FifozoneOmsService.pullOrders(null);
      expect(Array.isArray(orders)).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/orders', expect.objectContaining({
        params: expect.objectContaining({ page: 1, limit: 100 })
      }));
    });

    test('1.2 pullProducts(null) safely handles null options without TypeError', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', data: [], total: 0, total_pages: 1 }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const products = await FifozoneOmsService.pullProducts(null);
      expect(Array.isArray(products)).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/products', expect.objectContaining({
        params: expect.objectContaining({ page: 1, limit: 500, status: 'publish' })
      }));
    });

    test('1.3 pullOrders({ limit: -5 }) passes negative limit to params', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', data: [], total: 0, total_pages: 1 }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const orders = await FifozoneOmsService.pullOrders({ limit: -5 });
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(0);
      expect(mockGet).toHaveBeenCalledWith('/orders', expect.objectContaining({
        params: expect.objectContaining({ limit: -5 })
      }));
    });

    test('1.4 pullOrders({ limit: 0 }) falls back to limit 100', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', data: [], total: 0, total_pages: 1 }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const orders = await FifozoneOmsService.pullOrders({ limit: 0 });
      expect(Array.isArray(orders)).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('/orders', expect.objectContaining({
        params: expect.objectContaining({ limit: 100 })
      }));
    });

    test('1.5 getOrder invalid orderId checks', async () => {
      await expect(FifozoneOmsService.getOrder(undefined)).rejects.toThrow(/orderId is required/i);
      await expect(FifozoneOmsService.getOrder(null)).rejects.toThrow(/orderId is required/i);
      await expect(FifozoneOmsService.getOrder('')).rejects.toThrow(/orderId is required/i);
      await expect(FifozoneOmsService.getOrder(0)).rejects.toThrow(/orderId is required/i);
    });

    test('1.6 getOrder("NON_EXISTENT") returns null when not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', data: [] }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const order = await FifozoneOmsService.getOrder('999999999');
      expect(order).toBeNull();
    });

    test('1.7 updateOrder invalid arguments rejection', async () => {
      await expect(FifozoneOmsService.updateOrder({})).rejects.toThrow(/valid numeric orderId is required/i);
      await expect(FifozoneOmsService.updateOrder(null)).rejects.toThrow(/valid numeric orderId is required/i);
      await expect(FifozoneOmsService.updateOrder(-1)).rejects.toThrow(/valid numeric orderId is required/i);
      await expect(FifozoneOmsService.updateOrder('not-a-number')).rejects.toThrow(/valid numeric orderId is required/i);
      await expect(FifozoneOmsService.updateOrder(189248, {})).rejects.toThrow(/At least one update field/i);
    });

    test('1.8 resolveCategoryId safe handling of invalid types', async () => {
      expect(await FifozoneOmsService.resolveCategoryId(null)).toBeNull();
      expect(await FifozoneOmsService.resolveCategoryId(undefined)).toBeNull();
      expect(await FifozoneOmsService.resolveCategoryId('')).toBeNull();
      expect(await FifozoneOmsService.resolveCategoryId('   ')).toBeNull();
      expect(await FifozoneOmsService.resolveCategoryId(12345)).toBeNull();
    });

    test('1.9 resolveSubCategoryId safe handling of nulls', async () => {
      const res = await FifozoneOmsService.resolveSubCategoryId(null, null);
      expect(res).toEqual({ categoryId: null, subCategoryId: null });
    });

    test('1.10 formatCategories & formatImages sanitization', () => {
      const corruptCats = [null, undefined, '', '   ', '123|Dog Food', 'Simple Category', 42];
      const resultCats = FifozoneOmsService.formatCategories(corruptCats, 'Sub Cat 1');
      expect(resultCats).toContain('Dog Food');
      expect(resultCats).toContain('Simple Category');
      expect(resultCats).toContain('Sub Cat 1');

      const corruptImgs = [
        null, undefined, '', 'http://localhost/bad.jpg', 'https://example.com/bad.png',
        'https://fifozone.com/valid1.jpg', { url: 'https://fifozone.com/valid2.png' }
      ];
      const cleanImgs = FifozoneOmsService.formatImages(corruptImgs);
      expect(cleanImgs).toEqual(['https://fifozone.com/valid1.jpg', 'https://fifozone.com/valid2.png']);
    });
  });

  // ============================================================================
  // SECTION 2: TREESELECT & HTML DECODER FLAWS
  // ============================================================================
  describe('2. TreeSelect Hierarchy Stress & Decoder Defects', () => {

    test('2.1 Deep hierarchy (30 levels deep) transforms without recursion overflow', async () => {
      FifozoneOmsService.clearCategoryCache();

      let deepTree = { id: 30, name: 'Deep Level 30', subcategories: [] };
      for (let i = 29; i >= 1; i--) {
        deepTree = {
          id: i,
          name: `Level ${i}`,
          subcategories: [deepTree]
        };
      }

      const mockGet = jest.fn().mockResolvedValue({
        data: { status: 'success', categories_tree: [deepTree] }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const tree = await FifozoneOmsService.getCategoryTree(true);
      expect(tree.length).toBe(1);

      let current = tree[0];
      let depth = 1;
      while (current.children && current.children.length > 0) {
        current = current.children[0];
        depth++;
      }
      expect(depth).toBe(30);
    });

    test('2.2 decodeHtml preserves bracketed text enclosed in &lt;...&gt;', async () => {
      FifozoneOmsService.clearCategoryCache();
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          categories_tree: [
            {
              id: 501,
              name: 'Dogs &lt;Special Edition&gt;',
              subcategories: []
            }
          ]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const tree = await FifozoneOmsService.getCategoryTree(true);
      expect(tree[0].title).toBe('Dogs <Special Edition>');
    });

    test('2.3 Corrupt tree nodes: missing id, missing name, null subcategories', async () => {
      FifozoneOmsService.clearCategoryCache();
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          categories_tree: [
            { id: 601 },
            { name: 'No ID Node' },
            { id: 603, name: 'Normal', subcategories: null }
          ]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const tree = await FifozoneOmsService.getCategoryTree(true);
      expect(tree.length).toBe(3);
      expect(tree[0].title).toBe('');
      expect(tree[1].key).toBe('undefined');
    });
  });

  // ============================================================================
  // SECTION 3: NETWORK RESILIENCE & RETRY MECHANISM SIMULATION
  // ============================================================================
  describe('3. Network Resilience & Retry Mechanism Simulation', () => {

    test('3.1 Transient 503 Server Error: succeeds on 3rd retry via adapter simulation', async () => {
      const client = FifozoneOmsService.createClientInstance({
        maxRetries: 3,
        initialRetryDelay: 10,
        maxRetryDelay: 50
      });

      let attempt = 0;
      client.defaults.adapter = async (config) => {
        attempt++;
        if (attempt < 3) {
          const err = new Error('Request failed with status code 503');
          err.config = config;
          err.response = {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {},
            data: { message: 'Temporary overload' }
          };
          throw err;
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 'success', total: 100 }
        };
      };

      const res = await client.get('/test-503-retry');
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('success');
      expect(attempt).toBe(3);
    });

    test('3.2 Transient Network Drop (ECONNRESET): retries and succeeds', async () => {
      const client = FifozoneOmsService.createClientInstance({
        maxRetries: 3,
        initialRetryDelay: 10,
        maxRetryDelay: 50
      });

      let attempt = 0;
      client.defaults.adapter = async (config) => {
        attempt++;
        if (attempt === 1) {
          const netErr = new Error('read ECONNRESET');
          netErr.code = 'ECONNRESET';
          netErr.config = config;
          throw netErr;
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 'success', recovered: true }
        };
      };

      const res = await client.get('/network-drop-probe');
      expect(res.status).toBe(200);
      expect(res.data.recovered).toBe(true);
      expect(attempt).toBe(2);
    });

    test('3.3 429 Rate Limited with Retry-After header: waits and retries successfully', async () => {
      const client = FifozoneOmsService.createClientInstance({
        maxRetries: 2,
        initialRetryDelay: 10,
        maxRetryDelay: 50
      });

      let attempt = 0;
      client.defaults.adapter = async (config) => {
        attempt++;
        if (attempt === 1) {
          const rateErr = new Error('Request failed with status code 429');
          rateErr.config = config;
          rateErr.response = {
            status: 429,
            headers: { 'retry-after': '0' },
            data: { message: 'Too many requests' }
          };
          throw rateErr;
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 'success', rateResolved: true }
        };
      };

      const res = await client.get('/rate-limit-probe');
      expect(res.status).toBe(200);
      expect(res.data.rateResolved).toBe(true);
      expect(attempt).toBe(2);
    });

    test('3.4 401 Unauthorized Header Auth Fallback: retries once with ?oms_key= query param', async () => {
      const client = FifozoneOmsService.createClientInstance({
        apiKey: 'oms_live_test_key_123',
        maxRetries: 1,
        initialRetryDelay: 5
      });

      let attempt = 0;
      let secondRequestParams = null;

      client.defaults.adapter = async (config) => {
        attempt++;
        if (attempt === 1) {
          const authErr = new Error('Request failed with status code 401');
          authErr.config = config;
          authErr.response = {
            status: 401,
            headers: {},
            data: { message: 'Unauthorized: header blocked by WAF' }
          };
          throw authErr;
        }
        secondRequestParams = config.params;
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: { status: 'success', authenticatedViaQuery: true }
        };
      };

      const res = await client.get('/auth-fallback-probe');
      expect(res.status).toBe(200);
      expect(attempt).toBe(2);
      expect(secondRequestParams).toHaveProperty('oms_key', 'oms_live_test_key_123');
    });

    test('3.5 Persistent Failure: exhausted retries reject with FifozoneOmsError', async () => {
      const client = FifozoneOmsService.createClientInstance({
        maxRetries: 2,
        initialRetryDelay: 5,
        maxRetryDelay: 20
      });

      let attempt = 0;
      client.defaults.adapter = async (config) => {
        attempt++;
        const serverErr = new Error('Internal Server Error 500');
        serverErr.config = config;
        serverErr.response = {
          status: 500,
          headers: {},
          data: { code: 'DATABASE_ERROR', message: 'Persistent DB deadlocks' }
        };
        throw serverErr;
      };

      await expect(client.get('/exhausted-retry-probe'))
        .rejects
        .toMatchObject({
          name: 'FifozoneOmsError',
          statusCode: 500,
          code: 'DATABASE_ERROR',
          message: 'Persistent DB deadlocks'
        });

      expect(attempt).toBe(3);
    });
  });

  // ============================================================================
  // SECTION 4: SAFE WRITE BARRIER & FLAW DETECTION IN WRITE OPERATIONS (R3)
  // ============================================================================
  describe('4. Safe Write Barrier & Write Flaw Detection (R3)', () => {

    test('4.1 pushStock constructs valid atomic stock update payload', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          results: [{ id: 189210, sku: 'FAR-DRY-01', stock_quantity: 45, stock_status: 'instock' }]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

      const res = await FifozoneOmsService.pushStock('FAR-DRY-01', 45);
      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/products/update', {
        sku: 'FAR-DRY-01',
        stock_quantity: 45,
        stock_status: 'instock'
      });
    });

    test('4.2 pushPrice sends formatted regular_price string', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          results: [{ id: 189210, sku: 'FAR-DRY-01', regular_price: '1499' }]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

      const res = await FifozoneOmsService.pushPrice('FAR-DRY-01', 1499);
      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/products/update', {
        sku: 'FAR-DRY-01',
        regular_price: '1499'
      });
    });

    test('4.3 updateOrder properly throws when OMS returns partial_success with errors', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          status: 'partial_success',
          total_updated: 0,
          total_failed: 1,
          results: [
            {
              order_id: 189248,
              status: 'error',
              message: 'Order #189248 is already completed'
            }
          ]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

      await expect(FifozoneOmsService.updateOrder(189248, { status: 'processing' }))
        .rejects
        .toThrow(/already completed/i);
    });

    test('4.4 updateProduct properly throws when OMS returns error response', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          status: 'error',
          total_updated: 0,
          results: [
            {
              status: 'error',
              message: 'Product SKU NONEXISTENT does not exist in store catalog'
            }
          ]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

      await expect(FifozoneOmsService.updateProduct({ masterName: 'Test', sku: 'NONEXISTENT' }))
        .rejects
        .toThrow(/Product SKU NONEXISTENT does not exist in store catalog/i);
    });

    test('4.5 deleteProduct properly throws when OMS returns error response', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          status: 'error',
          results: [
            {
              status: 'error',
              message: 'Product #99999 could not be deleted: item does not exist'
            }
          ]
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ post: mockPost });

      await expect(FifozoneOmsService.deleteProduct({
        masterName: 'Ghost Item',
        platformIds: { fifozone: { productId: 99999 } }
      }))
        .rejects
        .toThrow(/item does not exist/i);
    });

    test('4.6 normalizeOmsOrder safely filters null items without crashing', () => {
      const corruptOrder = {
        id: 12345,
        status: 'processing',
        billing: { first_name: 'John' },
        items: [
          { sku: 'ITEM-1', quantity: 2, total: 200 },
          null // Malformed item in batch
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(corruptOrder);
      expect(normalized).toBeDefined();
      expect(normalized.items.length).toBe(1);
      expect(normalized.items[0].sku).toBe('ITEM-1');
    });
  });

  // ============================================================================
  // SECTION 5: LIVE READ-ONLY STORE VERIFICATION (NO WRITES)
  // ============================================================================
  describe('5. Live Read-Only Store Verification (Safe Probes)', () => {

    (isLiveDisabled ? test.skip : test)('5.1 Live testConnection succeeds with positive product count', async () => {
      const result = await FifozoneOmsService.testConnection();
      expect(result.success).toBe(true);
      expect(typeof result.productCount).toBe('number');
      expect(result.productCount).toBeGreaterThan(0);
    }, 15000);

    (isLiveDisabled ? test.skip : test)('5.2 Live pullProducts retrieves real product page (limit: 1, maxPages: 1)', async () => {
      const products = await FifozoneOmsService.pullProducts({ limit: 1, maxPages: 1 });
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBe(1);

      const p = products[0];
      expect(p).toHaveProperty('platformProductId');
      expect(p).toHaveProperty('masterName');
      expect(p).toHaveProperty('sku');
      expect(typeof p.price).toBe('number');
    }, 15000);

    (isLiveDisabled ? test.skip : test)('5.3 Live pullOrders retrieves order schema (limit: 1, maxPages: 1)', async () => {
      const orders = await FifozoneOmsService.pullOrders({ limit: 1, maxPages: 1 });
      expect(Array.isArray(orders)).toBe(true);
      if (orders.length > 0) {
        const o = orders[0];
        expect(o).toHaveProperty('platformOrderId');
        expect(o).toHaveProperty('number');
        expect(o).toHaveProperty('platformStatus');
        expect(o).toHaveProperty('customer');
        expect(o).toHaveProperty('shippingAddress');
        expect(o).toHaveProperty('items');
        expect(Array.isArray(o.items)).toBe(true);
      }
    }, 15000);

    (isLiveDisabled ? test.skip : test)('5.4 Live getCategoryTree returns valid tree structure', async () => {
      const tree = await FifozoneOmsService.getCategoryTree(true);
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);

      const root = tree[0];
      expect(root).toHaveProperty('title');
      expect(root).toHaveProperty('value');
      expect(root).toHaveProperty('key');
      expect(root.value).toContain('|');
    }, 15000);

    (isLiveDisabled ? test.skip : test)('5.5 Live getBrands returns list with options formatting', async () => {
      const brands = await FifozoneOmsService.getBrands({ limit: 5, format: 'options' });
      expect(Array.isArray(brands)).toBe(true);
      if (brands.length > 0) {
        expect(brands[0]).toHaveProperty('label');
        expect(brands[0]).toHaveProperty('value');
        expect(brands[0]).toHaveProperty('key');
      }
    }, 15000);
  });

  // ============================================================================
  // SECTION 6: CONCURRENCY & CACHING INTEGRITY
  // ============================================================================
  describe('6. Concurrency & Caching Integrity', () => {

    test('6.1 20 parallel calls to resolveCategoryId do not crash or corrupt cache', async () => {
      FifozoneOmsService.clearCategoryCache();
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          status: 'success',
          categories_flat: [
            { id: 1640, name: 'DOGS', slug: 'dogs', parent_id: 0 },
            { id: 1650, name: 'Dog Food', slug: 'dog-food', parent_id: 1640 }
          ],
          categories_tree: []
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const calls = Array.from({ length: 20 }, () => FifozoneOmsService.resolveCategoryId('DOGS'));
      const results = await Promise.all(calls);

      results.forEach(id => {
        expect(id).toBe(1640);
      });
      expect(await FifozoneOmsService.resolveCategoryId('DOGS')).toBe(1640);
    });

    test('6.2 clearCategoryCache and clearBrandsCache correctly reset caches', () => {
      FifozoneOmsService._categoryCache.set('test', 999);
      FifozoneOmsService._brandsCache = [{ id: 1, name: 'Test' }];

      FifozoneOmsService.clearCategoryCache();
      expect(FifozoneOmsService._categoryCache.size).toBe(0);
      expect(FifozoneOmsService._categoryTreeCache).toBeNull();

      FifozoneOmsService.clearBrandsCache();
      expect(FifozoneOmsService._brandsCache).toBeNull();
    });
  });
});
