/**
 * challenge_m2_concurrency_routes.test.js
 * 
 * Empirical Adversarial Challenge Test Suite for Milestone 2:
 * 1. API Contract Preservation across Category Route Endpoints:
 *    - GET /api/platforms/woocommerce/categories
 *    - GET /api/platforms/categories
 *    - GET /api/platforms/fifozone/categories
 *    - Schema verification: Ant Design TreeSelect format parity ({ title, value, key, children })
 * 2. Settings Endpoint Diagnostics & Failure Modes:
 *    - POST /api/settings/test-fifozone-oms under Success, Network Timeout, Invalid API Key
 *    - Credential precedence: Body overrides -> DB Settings -> process.env fallback
 * 3. Concurrency Stress Testing (50 Concurrent Requests):
 *    - Category tree retrieval under cold and warm cache (cache hit rate, latency, memory stability)
 *    - Concurrent route requests via supertest across all three route aliases
 * 4. Concurrent Category Resolution with Empty Cache:
 *    - resolveCategoryId & resolveSubCategoryId under simultaneous cold-cache execution
 *    - Cache race condition and memory resilience verification
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretfifozonekeychangeinproduction';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const FifozoneOmsService = require('../src/services/fifozoneOms.service');
const User = require('../src/models/User.model');
const Settings = require('../src/models/Settings.model');
const InventoryLog = require('../src/models/InventoryLog.model');
const platformController = require('../src/controllers/platform.controller');

describe('Empirical Adversarial Challenge Suite (m2_challenger_2)', () => {
  const jwtSecret = process.env.JWT_SECRET;
  const testUserId = '6639f7a9d023b12345678901';
  let authToken;

  const mockRawCategoryTree = [
    {
      id: 184,
      name: 'Dog Food &amp; Nutrition',
      slug: 'dog-food',
      parent_id: 0,
      subcategories: [
        {
          id: 185,
          name: 'Dry Dog Food',
          slug: 'dry-dog-food',
          parent_id: 184,
          subcategories: []
        },
        {
          id: 186,
          name: 'Wet Dog Food',
          slug: 'wet-dog-food',
          parent_id: 184,
          subcategories: [
            {
              id: 187,
              name: 'Puppy Gravy Pouches',
              slug: 'puppy-gravy-pouches',
              parent_id: 186,
              subcategories: []
            }
          ]
        }
      ]
    },
    {
      id: 200,
      name: 'Cat Food &amp; Treats',
      slug: 'cat-food',
      parent_id: 0,
      subcategories: [
        {
          id: 201,
          name: 'Adult Cat Food',
          slug: 'adult-cat-food',
          parent_id: 200,
          subcategories: []
        }
      ]
    }
  ];

  const mockFlatCategories = [
    { id: 184, name: 'Dog Food & Nutrition', slug: 'dog-food', parent_id: 0 },
    { id: 185, name: 'Dry Dog Food', slug: 'dry-dog-food', parent_id: 184 },
    { id: 186, name: 'Wet Dog Food', slug: 'wet-dog-food', parent_id: 184 },
    { id: 187, name: 'Puppy Gravy Pouches', slug: 'puppy-gravy-pouches', parent_id: 186 },
    { id: 200, name: 'Cat Food & Treats', slug: 'cat-food', parent_id: 0 },
    { id: 201, name: 'Adult Cat Food', slug: 'adult-cat-food', parent_id: 200 }
  ];

  beforeAll(() => {
    authToken = jwt.sign({ id: testUserId, role: 'admin' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    // Mock user auth lookup
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: testUserId,
      name: 'Admin Tester',
      email: 'admin@fifozone.com',
      role: 'admin',
      isActive: true
    });

    // Mock Settings lookup
    jest.spyOn(Settings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        fifozoneOms: {
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'oms_live_9f8d2b7e61a4c035824e87901bcdf562',
          isConfigured: true
        }
      })
    });

    // Prevent buffer hanging on unmocked InventoryLog
    jest.spyOn(InventoryLog, 'create').mockResolvedValue({});

    // Reset caches
    FifozoneOmsService.clearCategoryCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    FifozoneOmsService.clearCategoryCache();
  });

  // Helper function to recursively validate Ant Design TreeSelect schema
  function validateAntdTreeNode(node) {
    expect(node).toBeDefined();
    expect(typeof node).toBe('object');

    // Title validation: must be string, non-empty, and free of unescaped HTML entities
    expect(typeof node.title).toBe('string');
    expect(node.title.length).toBeGreaterThan(0);
    expect(node.title).not.toContain('&amp;');
    expect(node.title).not.toContain('&quot;');

    // Value validation: format must be "id|name"
    expect(typeof node.value).toBe('string');
    expect(node.value).toContain('|');
    const [valId, valName] = node.value.split('|');
    expect(Number(valId)).toBeGreaterThan(0);
    expect(valName.length).toBeGreaterThan(0);

    // Key validation: stringified numeric ID
    expect(typeof node.key).toBe('string');
    expect(node.key).toBe(String(valId));

    // Children validation (if present)
    if (node.children !== undefined) {
      expect(Array.isArray(node.children)).toBe(true);
      node.children.forEach(child => validateAntdTreeNode(child));
    }
  }

  // ==========================================================================
  // SECTION 1: ROUTE CONTRACT PARITY & ANT DESIGN SCHEMA VALIDATION
  // ==========================================================================
  describe('1. API Route Contract Parity & Ant Design TreeSelect Schema', () => {

    test('1.1 GET /woocommerce/categories, /categories, and /fifozone/categories return identical TreeSelect schema', async () => {
      // Mock OMS client GET /categories?format=tree
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          categories_tree: mockRawCategoryTree,
          categories_flat: mockFlatCategories
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Request all three endpoints
      const resWoo = await request(app)
        .get('/api/platforms/woocommerce/categories')
        .set('Authorization', `Bearer ${authToken}`);

      const resCat = await request(app)
        .get('/api/platforms/categories')
        .set('Authorization', `Bearer ${authToken}`);

      const resFifo = await request(app)
        .get('/api/platforms/fifozone/categories')
        .set('Authorization', `Bearer ${authToken}`);

      // All must return HTTP 200
      expect(resWoo.status).toBe(200);
      expect(resCat.status).toBe(200);
      expect(resFifo.status).toBe(200);

      // Verify envelope structure
      expect(resWoo.body.success).toBe(true);
      expect(resWoo.body.statusCode).toBe(200);
      expect(resWoo.body.message).toBe('Categories retrieved successfully');

      expect(resCat.body.success).toBe(true);
      expect(resCat.body.statusCode).toBe(200);

      expect(resFifo.body.success).toBe(true);
      expect(resFifo.body.statusCode).toBe(200);

      // Exact data payload parity
      expect(resWoo.body.data).toEqual(resCat.body.data);
      expect(resWoo.body.data).toEqual(resFifo.body.data);

      // Validate TreeSelect schema on returned nodes
      expect(Array.isArray(resWoo.body.data)).toBe(true);
      expect(resWoo.body.data.length).toBe(2);

      resWoo.body.data.forEach(node => validateAntdTreeNode(node));

      // Specific node checks
      const dogNode = resWoo.body.data[0];
      expect(dogNode.title).toBe('Dog Food & Nutrition'); // decoded &amp;
      expect(dogNode.value).toBe('184|Dog Food &amp; Nutrition');
      expect(dogNode.key).toBe('184');
      expect(dogNode.children.length).toBe(2);
      expect(dogNode.children[0].title).toBe('Dry Dog Food');
      expect(dogNode.children[0].value).toBe('185|Dry Dog Food');
      expect(dogNode.children[0].key).toBe('185');

      const wetDogNode = dogNode.children[1];
      expect(wetDogNode.title).toBe('Wet Dog Food');
      expect(wetDogNode.children.length).toBe(1);
      expect(wetDogNode.children[0].title).toBe('Puppy Gravy Pouches');
      expect(wetDogNode.children[0].key).toBe('187');
    });

    test('1.2 Unauthenticated requests to category endpoints are rejected with HTTP 401', async () => {
      const endpoints = [
        '/api/platforms/woocommerce/categories',
        '/api/platforms/categories',
        '/api/platforms/fifozone/categories'
      ];

      for (const endpoint of endpoints) {
        const res = await request(app).get(endpoint);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    test('1.3 Controller method export identity verification', () => {
      expect(typeof platformController.getWooCommerceCategories).toBe('function');
      expect(platformController.getOmsCategories).toBe(platformController.getWooCommerceCategories);
      expect(platformController.getFifozoneCategories).toBe(platformController.getWooCommerceCategories);
    });
  });

  // ==========================================================================
  // SECTION 2: SETTINGS TEST-FIFOZONE-OMS ROUTE RESILIENCE & FAILURE MODES
  // ==========================================================================
  describe('2. POST /api/settings/test-fifozone-oms Diagnostics & Error Handling', () => {

    test('2.1 Success Mode: returns HTTP 200 with connection confirmation and product count', async () => {
      const testSpy = jest.spyOn(FifozoneOmsService, 'testConnection').mockResolvedValue({
        success: true,
        productCount: 13599
      });

      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'oms_live_9f8d2b7e61a4c035824e87901bcdf562'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('✅ Fifozone OMS connected successfully!');
      expect(res.body.message).toContain('13599 products');
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.productCount).toBe(13599);

      expect(testSpy).toHaveBeenCalledWith({
        baseURL: 'https://fifozone.com/wp-json/oms/v1',
        apiKey: 'oms_live_9f8d2b7e61a4c035824e87901bcdf562'
      });
    });

    test('2.2 Network Timeout Mode: returns HTTP 400 with descriptive timeout error message', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      jest.spyOn(FifozoneOmsService, 'testConnection').mockRejectedValue(timeoutError);

      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'oms_live_9f8d2b7e61a4c035824e87901bcdf562'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Fifozone OMS connection test failed:.*timeout/i);
    });

    test('2.3 Invalid API Key Mode: returns HTTP 400 with unauthorized/invalid key error message', async () => {
      const authError = new Error('Fifozone OMS API Error (401): Invalid or missing OMS API Key');
      authError.response = { status: 401, data: { message: 'Invalid OMS API Key' } };
      jest.spyOn(FifozoneOmsService, 'testConnection').mockRejectedValue(authError);

      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: 'invalid_key_abc123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Fifozone OMS connection test failed:.*Invalid or missing OMS API Key/i);
    });

    test('2.4 Unauthenticated access to /test-fifozone-oms is rejected with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .send({ apiKey: 'any_key' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('2.5 Credential Precedence: Body overrides DB Settings and Env variables', async () => {
      const testSpy = jest.spyOn(FifozoneOmsService, 'testConnection').mockResolvedValue({
        success: true,
        productCount: 500
      });

      // Settings doc has default values
      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fifozoneOms: {
            baseURL: 'https://db-stored.com/wp-json/oms/v1',
            apiKey: 'db_stored_key'
          }
        })
      });

      // Request supplies explicit body credentials
      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          baseURL: 'https://body-override.com/wp-json/oms/v1',
          apiKey: 'body_override_key'
        });

      expect(res.status).toBe(200);
      expect(testSpy).toHaveBeenCalledWith({
        baseURL: 'https://body-override.com/wp-json/oms/v1',
        apiKey: 'body_override_key'
      });
    });

    test('2.6 Fallback to DB Settings when body has no credentials', async () => {
      const testSpy = jest.spyOn(FifozoneOmsService, 'testConnection').mockResolvedValue({
        success: true,
        productCount: 1000
      });

      jest.spyOn(Settings, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fifozoneOms: {
            baseURL: 'https://db-fallback.com/wp-json/oms/v1',
            apiKey: 'db_fallback_key'
          }
        })
      });

      // Send empty body
      const res = await request(app)
        .post('/api/settings/test-fifozone-oms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(testSpy).toHaveBeenCalledWith({
        baseURL: 'https://db-fallback.com/wp-json/oms/v1',
        apiKey: 'db_fallback_key'
      });
    });
  });

  // ==========================================================================
  // SECTION 3: CONCURRENCY STRESS TESTING — 50 CONCURRENT CATEGORY TREE REQUESTS
  // ==========================================================================
  describe('3. Concurrency Stress: 50 Simultaneous Category Tree Requests', () => {

    test('3.1 50 concurrent calls to getCategoryTree() with cold cache maintain integrity and stability', async () => {
      let networkCallsCount = 0;
      const mockGet = jest.fn().mockImplementation(async () => {
        networkCallsCount++;
        // Small async delay to simulate network latency
        await new Promise(r => setTimeout(r, 20));
        return {
          data: {
            categories_tree: mockRawCategoryTree,
            categories_flat: mockFlatCategories
          }
        };
      });

      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Ensure cache is completely cold
      FifozoneOmsService.clearCategoryCache();

      // Measure memory and time before firing 50 concurrent requests
      const memBefore = process.memoryUsage().heapUsed;
      const startTime = Date.now();

      // Fire 50 concurrent requests
      const concurrentPromises = Array.from({ length: 50 }, () => FifozoneOmsService.getCategoryTree());
      const results = await Promise.all(concurrentPromises);

      const totalDuration = Date.now() - startTime;
      const memAfter = process.memoryUsage().heapUsed;
      const memDeltaMB = (memAfter - memBefore) / (1024 * 1024);

      // Verify all 50 completed successfully
      expect(results.length).toBe(50);

      // All 50 results must be strictly equal in structure
      const referenceTree = results[0];
      expect(Array.isArray(referenceTree)).toBe(true);
      expect(referenceTree.length).toBe(2);

      results.forEach((tree, idx) => {
        expect(tree).toEqual(referenceTree);
        expect(tree[0].title).toBe('Dog Food & Nutrition');
        expect(tree[0].children[0].title).toBe('Dry Dog Food');
      });

      // Assert memory stability (heap delta must be reasonable, < 64MB)
      expect(memDeltaMB).toBeLessThan(64);

      // Subsequent 50 concurrent calls with warmed cache must make 0 network calls (100% cache hit rate)
      const networkCallsAtWarm = networkCallsCount;
      const warmStartTime = Date.now();
      const warmResults = await Promise.all(Array.from({ length: 50 }, () => FifozoneOmsService.getCategoryTree()));
      const warmDuration = Date.now() - warmStartTime;

      expect(warmResults.length).toBe(50);
      expect(networkCallsCount).toBe(networkCallsAtWarm); // Zero additional network calls!
      expect(warmDuration).toBeLessThan(200); // Super-fast memory lookup (< 4ms per request avg)
    });

    test('3.2 50 concurrent HTTP requests via supertest across route aliases (/woocommerce, /categories, /fifozone)', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          categories_tree: mockRawCategoryTree,
          categories_flat: mockFlatCategories
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const endpoints = [
        '/api/platforms/woocommerce/categories',
        '/api/platforms/categories',
        '/api/platforms/fifozone/categories'
      ];

      // Distribute 50 requests across the 3 endpoints
      const requests = Array.from({ length: 50 }, (_, i) => {
        const route = endpoints[i % endpoints.length];
        return request(app)
          .get(route)
          .set('Authorization', `Bearer ${authToken}`);
      });

      const responses = await Promise.all(requests);

      // Verify all 50 returned HTTP 200
      expect(responses.length).toBe(50);
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data[0].title).toBe('Dog Food & Nutrition');
      });
    });
  });

  // ==========================================================================
  // SECTION 4: CONCURRENT CATEGORY RESOLUTION WITH EMPTY CACHE
  // ==========================================================================
  describe('4. Concurrent Category Resolution with Empty Cache', () => {

    test('4.1 50 concurrent resolutions (resolveCategoryId & resolveSubCategoryId) execute cleanly without race conditions', async () => {
      let categoriesFetchCount = 0;
      const mockGet = jest.fn().mockImplementation(async (path, config) => {
        if (path === '/categories') {
          categoriesFetchCount++;
          await new Promise(r => setTimeout(r, 15));
          return {
            data: {
              categories_tree: mockRawCategoryTree,
              categories_flat: mockFlatCategories
            }
          };
        }
        return { data: {} };
      });

      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Start with empty cache
      FifozoneOmsService.clearCategoryCache();

      // Formulate 50 heterogeneous resolution tasks
      const resolutionTasks = [];

      for (let i = 0; i < 10; i++) {
        // Task A: Standard root category
        resolutionTasks.push(FifozoneOmsService.resolveCategoryId('Dog Food & Nutrition'));
        // Task B: Subcategory under parent
        resolutionTasks.push(FifozoneOmsService.resolveSubCategoryId('Dog Food & Nutrition', 'Dry Dog Food'));
        // Task C: Pre-formatted composite value
        resolutionTasks.push(FifozoneOmsService.resolveCategoryId('186|Wet Dog Food'));
        // Task D: Case and whitespace insensitive lookup
        resolutionTasks.push(FifozoneOmsService.resolveCategoryId('   dOg FoOd & nUtRiTiOn  '));
        // Task E: Non-existent category
        resolutionTasks.push(FifozoneOmsService.resolveCategoryId(`NonExistentCategory_${i}`));
      }

      expect(resolutionTasks.length).toBe(50);

      // Execute all 50 concurrently
      const results = await Promise.all(resolutionTasks);

      expect(results.length).toBe(50);

      // Validate results across each of the 10 iterations
      for (let i = 0; i < 10; i++) {
        const rootId = results[i * 5];
        const subResult = results[i * 5 + 1];
        const compositeId = results[i * 5 + 2];
        const caseInsensitiveId = results[i * 5 + 3];
        const nonExistentId = results[i * 5 + 4];

        // Root category ID
        expect(rootId).toBe(184);

        // Subcategory resolution
        expect(subResult).toEqual({ categoryId: 184, subCategoryId: 185 });

        // Composite pipe format
        expect(compositeId).toBe(186);

        // Case/whitespace insensitivity
        expect(caseInsensitiveId).toBe(184);

        // Non-existent must be null (not crash or undefined)
        expect(nonExistentId).toBeNull();
      }

      // Verify that cache is properly warmed
      expect(FifozoneOmsService._categoryCache.size).toBeGreaterThan(0);

      // Verify subsequent 50 calls result in 100% cache hit (0 extra network calls for resolved keys)
      const fetchCountAfterFirstWave = categoriesFetchCount;
      const secondWave = await Promise.all(
        Array.from({ length: 50 }, () => FifozoneOmsService.resolveCategoryId('Dog Food & Nutrition'))
      );

      expect(secondWave.every(id => id === 184)).toBe(true);
      expect(categoriesFetchCount).toBe(fetchCountAfterFirstWave); // ZERO new network calls!
    });

    test('4.2 Boundary inputs under concurrency (null, undefined, empty string, non-strings)', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          categories_tree: mockRawCategoryTree,
          categories_flat: mockFlatCategories
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });
      FifozoneOmsService.clearCategoryCache();

      const edgeCalls = [
        FifozoneOmsService.resolveCategoryId(null),
        FifozoneOmsService.resolveCategoryId(undefined),
        FifozoneOmsService.resolveCategoryId(''),
        FifozoneOmsService.resolveCategoryId('    '),
        FifozoneOmsService.resolveCategoryId(12345),
        FifozoneOmsService.resolveCategoryId({}),
        FifozoneOmsService.resolveSubCategoryId(null, null),
        FifozoneOmsService.resolveSubCategoryId('Dog Food & Nutrition', null),
        FifozoneOmsService.resolveSubCategoryId('', ''),
        FifozoneOmsService.resolveSubCategoryId('Dog Food & Nutrition', '')
      ];

      const results = await Promise.all(edgeCalls);

      expect(results[0]).toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();
      expect(results[3]).toBeNull();
      expect(results[4]).toBeNull();
      expect(results[5]).toBeNull();
      expect(results[6]).toEqual({ categoryId: null, subCategoryId: null });
      expect(results[7]).toEqual({ categoryId: 184, subCategoryId: null });
      expect(results[8]).toEqual({ categoryId: null, subCategoryId: null });
      expect(results[9]).toEqual({ categoryId: 184, subCategoryId: null });
    });
  });
});
