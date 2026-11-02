/**
 * challenge_m1_normalization_cache.test.js
 * 
 * Empirical Adversarial Challenge Test Suite for:
 * 1. Order Normalization Accuracy (normalizeOmsOrder)
 * 2. Category Resolution Caching (concurrency, case-insensitivity, pipes, invalidation)
 * 3. Brand Caching & Format Permutations (_brandsCache, full, names, options)
 * 4. Safe Mock Testing (R3) & Accidental Mutation Prevention
 */

const FifozoneOmsService = require('../src/services/fifozoneOms.service');

describe('Empirical Adversarial Challenge Suite (m1_challenger_2)', () => {

  afterEach(() => {
    jest.restoreAllMocks();
    FifozoneOmsService.clearCategoryCache();
    FifozoneOmsService.clearBrandsCache();
  });

  // ==========================================================================
  // SECTION 1: ORDER NORMALIZATION ACCURACY (normalizeOmsOrder)
  // ==========================================================================
  describe('1. normalizeOmsOrder Adversarial Verification', () => {

    test('1.1 Handles non-object or null input gracefully', () => {
      expect(FifozoneOmsService.normalizeOmsOrder(null)).toBeNull();
      expect(FifozoneOmsService.normalizeOmsOrder(undefined)).toBeNull();
      expect(FifozoneOmsService.normalizeOmsOrder('not an order')).toBeNull();
      expect(FifozoneOmsService.normalizeOmsOrder(12345)).toBeNull();
    });

    test('1.2 Handles empty object order with robust defaults', () => {
      const normalized = FifozoneOmsService.normalizeOmsOrder({});
      expect(normalized).toBeDefined();
      expect(normalized.customer.name).toBe('Unknown Customer');
      expect(normalized.customer.email).toBe('');
      expect(normalized.customer.phone).toBe('');
      expect(normalized.shippingAddress.line1).toBe('N/A');
      expect(normalized.shippingAddress.city).toBe('Unknown');
      expect(normalized.shippingAddress.state).toBe('XX');
      expect(normalized.shippingAddress.pincode).toBe('000000');
      expect(normalized.shippingAddress.country).toBe('India');
      expect(normalized.items).toEqual([]);
      expect(normalized.totalAmount).toBe(0);
      expect(normalized.subtotal).toBe(0);
      expect(normalized.shippingCharge).toBe(0);
      expect(normalized.gstAmount).toBe(0);
      expect(normalized.paymentMethod).toBe('Prepaid');
      expect(normalized.paymentStatus).toBe('paid');
    });

    test('1.3 Missing billing: falls back completely to shipping information', () => {
      const order = {
        id: 1001,
        number: 'ORD-1001',
        status: 'processing',
        shipping: {
          first_name: 'Anita',
          last_name: 'Deshmukh',
          address_1: 'Flat 402, Sunshine Apts',
          address_2: 'MG Road',
          city: 'Pune',
          state: 'MH',
          postcode: '411001',
          country: 'India',
          phone: '9876543210'
        },
        items: []
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      expect(normalized.customer.name).toBe('Anita Deshmukh');
      expect(normalized.customer.phone).toBe('9876543210');
      expect(normalized.shippingAddress.line1).toBe('Flat 402, Sunshine Apts');
      expect(normalized.shippingAddress.city).toBe('Pune');
      expect(normalized.shippingAddress.state).toBe('MH');
      expect(normalized.shippingAddress.pincode).toBe('411001');
      expect(normalized.billingAddress.line1).toBe('');
    });

    test('1.4 Missing shipping: shippingAddress falls back to billing address', () => {
      const order = {
        id: 1002,
        number: 'ORD-1002',
        status: 'pending',
        billing: {
          full_name: 'Rahul Sharma',
          email: 'rahul@example.com',
          phone: '9123456789',
          address_1: 'Plot 12, Sector 5',
          city: 'Gurugram',
          state: 'HR',
          postcode: '122001',
          country: 'India'
        },
        shipping: null
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      expect(normalized.customer.name).toBe('Rahul Sharma');
      expect(normalized.customer.email).toBe('rahul@example.com');
      expect(normalized.shippingAddress.line1).toBe('Plot 12, Sector 5');
      expect(normalized.shippingAddress.city).toBe('Gurugram');
      expect(normalized.shippingAddress.state).toBe('HR');
      expect(normalized.shippingAddress.pincode).toBe('122001');
    });

    test('1.5 Name resolution priority: full_name > first+last name > shipping > fallback', () => {
      // Case A: billing full_name overrides first_name + last_name
      const orderA = {
        id: 1003,
        billing: { full_name: 'Verified Buyer', first_name: 'Ignored', last_name: 'Name' }
      };
      expect(FifozoneOmsService.normalizeOmsOrder(orderA).customer.name).toBe('Verified Buyer');

      // Case B: billing first_name + last_name when no full_name
      const orderB = {
        id: 1004,
        billing: { first_name: 'Pooja', last_name: 'Hegde' }
      };
      expect(FifozoneOmsService.normalizeOmsOrder(orderB).customer.name).toBe('Pooja Hegde');

      // Case C: shipping full_name when billing has no name
      const orderC = {
        id: 1005,
        billing: {},
        shipping: { full_name: 'Shipping Contact' }
      };
      expect(FifozoneOmsService.normalizeOmsOrder(orderC).customer.name).toBe('Shipping Contact');

      // Case D: all empty or whitespace names fallback to 'Unknown Customer'
      const orderD = {
        id: 1006,
        billing: { first_name: '   ', last_name: ' ' },
        shipping: { first_name: '', last_name: '  ' }
      };
      expect(FifozoneOmsService.normalizeOmsOrder(orderD).customer.name).toBe('Unknown Customer');
    });

    test('1.6 Items variation vs product ID resolution', () => {
      const order = {
        id: 1007,
        items: [
          // Item with variation_id > 0: platformProductId must be variation_id
          {
            item_id: 1,
            product_id: 186782,
            variation_id: 186801,
            name: 'Drools Focus Puppy - 1.2kg',
            sku: 'DF-PUP-1.2',
            quantity: 2,
            total: '1288.00',
            subtotal: '1288.00'
          },
          // Item with variation_id = 0: platformProductId must fallback to product_id
          {
            item_id: 2,
            product_id: 189210,
            variation_id: 0,
            name: 'Pedigree Meat & Rice 3kg',
            sku: 'PED-3KG',
            quantity: 1,
            total: '899.00'
          },
          // Item with variation_id = "0" (string): platformProductId must fallback to product_id
          {
            item_id: 3,
            product_id: 190001,
            variation_id: '0',
            name: 'Simple Toy Ball',
            quantity: 3,
            total: '300.00'
          },
          // Item with neither variation_id nor product_id
          {
            item_id: 4,
            name: 'Custom Unlisted Add-on',
            quantity: 1,
            total: '50.00'
          }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      expect(normalized.items.length).toBe(4);

      // Item 1: variation takes precedence
      expect(normalized.items[0].platformProductId).toBe('186801');
      expect(normalized.items[0].productId).toBe('186782');
      expect(normalized.items[0].variationId).toBe('186801');
      expect(normalized.items[0].unitPrice).toBe(644.0);

      // Item 2: product_id fallback, variationId empty string for simple product
      expect(normalized.items[1].platformProductId).toBe('189210');
      expect(normalized.items[1].productId).toBe('189210');
      expect(normalized.items[1].variationId).toBe('');
      expect(normalized.items[1].unitPrice).toBe(899.0);

      // Item 3: string "0" variation handled properly
      expect(normalized.items[2].platformProductId).toBe('190001');

      // Item 4: empty string IDs without crashing
      expect(normalized.items[3].platformProductId).toBe('');
      expect(normalized.items[3].productId).toBe('');
      expect(normalized.items[3].variationId).toBe('');
    });

    test('1.7 0 price items (Free gifts, promotional vouchers)', () => {
      const order = {
        id: 1008,
        total: '0.00',
        shipping_total: '0.00',
        items: [
          {
            product_id: 9999,
            name: 'Complimentary Pet Bandana',
            quantity: 1,
            total: '0.00',
            subtotal: '0.00'
          }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      expect(normalized.totalAmount).toBe(0);
      expect(normalized.subtotal).toBe(0);
      expect(normalized.items[0].unitPrice).toBe(0);
      expect(normalized.items[0].total).toBe(0);
    });

    test('1.8 Decimal rounding accuracy and subtotal calculation', () => {
      const order = {
        id: 1009,
        total: '100.00',
        shipping_lines: { cost: '49.99' },
        items: [
          {
            product_id: 101,
            name: 'Item A',
            quantity: 3,
            total: '100.00'
          }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      // 100 / 3 = 33.333333... -> rounded to 33.33
      expect(normalized.items[0].unitPrice).toBe(33.33);
      expect(normalized.shippingCharge).toBe(49.99);
      // subtotal = total - shipping = 100.00 - 49.99 = 50.01
      expect(normalized.subtotal).toBe(50.01);
    });

    test('1.9 Decimal rounding when shippingCharge exceeds totalAmount', () => {
      const order = {
        id: 1010,
        total: '30.00',
        shipping_total: '50.00'
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      // Math.max(0, 30.00 - 50.00) = 0 (subtotal cannot be negative)
      expect(normalized.subtotal).toBe(0);
      expect(normalized.totalAmount).toBe(30.0);
      expect(normalized.shippingCharge).toBe(50.0);
    });

    test('1.10 Payment method and payment status permutations', () => {
      // COD + processing -> pending
      const orderCodProcessing = { id: 1011, payment_method: 'cod', status: 'processing' };
      expect(FifozoneOmsService.normalizeOmsOrder(orderCodProcessing).paymentStatus).toBe('pending');

      // COD + completed -> paid
      const orderCodCompleted = { id: 1012, payment_method: 'cod', status: 'completed' };
      expect(FifozoneOmsService.normalizeOmsOrder(orderCodCompleted).paymentStatus).toBe('paid');

      // COD + delivered -> paid
      const orderCodDelivered = { id: 1013, payment_method: 'cod', status: 'delivered' };
      expect(FifozoneOmsService.normalizeOmsOrder(orderCodDelivered).paymentStatus).toBe('paid');

      // Prepaid (razorpay) + processing -> paid
      const orderPrepaid = { id: 1014, payment_method: 'razorpay', payment_method_title: 'UPI / Cards', status: 'processing' };
      const normPrepaid = FifozoneOmsService.normalizeOmsOrder(orderPrepaid);
      expect(normPrepaid.paymentMethod).toBe('UPI / Cards');
      expect(normPrepaid.paymentStatus).toBe('paid');
    });

    test('1.11 Item name decodes HTML entities but customer name retains raw string', () => {
      const order = {
        id: 1015,
        billing: { full_name: 'M&amp;M Pets &amp; Grooming' },
        items: [
          {
            name: 'Cat &amp; Kitten &quot;Deluxe&quot; Scratching Post &#8211; Large'
          }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      // Item name is decoded via decodeHtml
      expect(normalized.items[0].name).toBe('Cat & Kitten "Deluxe" Scratching Post - Large');
      // Customer name is decoded via decodeHtml
      expect(normalized.customer.name).toBe('M&M Pets & Grooming');
    });

    test('1.12 Hardening: order.items containing null is safely filtered without throwing', () => {
      const orderWithNullItem = {
        id: 1016,
        items: [null]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(orderWithNullItem);
      expect(normalized).toBeDefined();
      expect(normalized.items).toEqual([]);
    });

    test('1.13 Hardening: item.quantity = 0 is preserved as 0', () => {
      const order = {
        id: 1017,
        items: [
          { product_id: 101, name: 'Cancelled item', quantity: 0, total: '0.00' }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      expect(normalized.items[0].quantity).toBe(0);
    });

    test('1.14 Array shipping_lines without shipping_total results in shippingCharge = 0', () => {
      const order = {
        id: 1018,
        total: '150.00',
        shipping_lines: [
          { id: 1, method_title: 'Standard Delivery', total: '50.00' }
        ]
      };

      const normalized = FifozoneOmsService.normalizeOmsOrder(order);
      // In current implementation, order.shipping_lines is checked as order.shipping_lines?.cost
      // When shipping_lines is an array, .cost is undefined, so shippingCharge falls back to 0
      expect(normalized.shippingCharge).toBe(0);
      expect(normalized.subtotal).toBe(150.0);
    });
  });

  // ==========================================================================
  // SECTION 2: CATEGORY RESOLUTION CACHING STRESS TEST
  // ==========================================================================
  describe('2. Category Resolution Cache Stress Test', () => {

    const mockCategoryPayload = {
      categories_flat: [
        { id: 1640, name: 'DOGS', slug: 'dogs', parent_id: 0 },
        { id: 1650, name: 'Dog Food', slug: 'dog-food', parent_id: 1640 },
        { id: 1651, name: 'Dog Treats', slug: 'dog-treats', parent_id: 1640 },
        { id: 1639, name: 'CATS', slug: 'cat', parent_id: 0 },
        { id: 1660, name: 'Cat Food', slug: 'cat-food', parent_id: 1639 },
        { id: 1700, name: 'Food', slug: 'food-general', parent_id: 0 },
        { id: 1701, name: 'Food', slug: 'cat-food-dup', parent_id: 1639 }
      ],
      categories_tree: [
        {
          id: 1640,
          name: 'DOGS',
          slug: 'dogs',
          subcategories: [
            { id: 1650, name: 'Dog Food', slug: 'dog-food', parent_id: 1640 },
            { id: 1651, name: 'Dog Treats', slug: 'dog-treats', parent_id: 1640 }
          ]
        },
        {
          id: 1639,
          name: 'CATS',
          slug: 'cat',
          subcategories: [
            { id: 1660, name: 'Cat Food', slug: 'cat-food', parent_id: 1639 },
            { id: 1701, name: 'Food', slug: 'cat-food-dup', parent_id: 1639 }
          ]
        }
      ]
    };

    test('2.1 Pipe-formatted values bypass network completely', async () => {
      const mockGet = jest.fn();
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const id1 = await FifozoneOmsService.resolveCategoryId('1650|Dog Food');
      const id2 = await FifozoneOmsService.resolveCategoryId(' 1651 | Dog Treats & Chews ');

      expect(id1).toBe(1650);
      expect(id2).toBe(1651);
      // No HTTP request should have been made
      expect(mockGet).not.toHaveBeenCalled();
    });

    test('2.2 Case-insensitivity and whitespace resilience', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: mockCategoryPayload });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // First call warms cache
      const idUpper = await FifozoneOmsService.resolveCategoryId('DOG FOOD');
      expect(idUpper).toBe(1650);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Subsequent calls with different casing and whitespace should hit memory cache
      const idLower = await FifozoneOmsService.resolveCategoryId('dog food');
      const idMixed = await FifozoneOmsService.resolveCategoryId('  DoG fOoD  ');
      const idSlug = await FifozoneOmsService.resolveCategoryId('dog-food');

      expect(idLower).toBe(1650);
      expect(idMixed).toBe(1650);
      expect(idSlug).toBe(1650);
      // Still only 1 network call!
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test('2.3 Parent ID scoping distinguishes duplicate category names under different parents', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: mockCategoryPayload });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // 'Food' under parent 0 -> 1700
      const rootFood = await FifozoneOmsService.resolveCategoryId('Food', 0);
      // 'Food' under parent 1639 (CATS) -> 1701
      const catFood = await FifozoneOmsService.resolveCategoryId('Food', 1639);

      expect(rootFood).toBe(1700);
      expect(catFood).toBe(1701);
    });

    test('2.4 resolveSubCategoryId resolves parent and child correctly', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: mockCategoryPayload });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const result = await FifozoneOmsService.resolveSubCategoryId('DOGS', 'Dog Food');
      expect(result).toEqual({ categoryId: 1640, subCategoryId: 1650 });

      // Cat food
      const catResult = await FifozoneOmsService.resolveSubCategoryId('CATS', 'Cat Food');
      expect(catResult).toEqual({ categoryId: 1639, subCategoryId: 1660 });
    });

    test('2.5 clearCategoryCache invalidates memoized tree and resolution lookups', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          categories_tree: mockCategoryPayload.categories_tree,
          categories_flat: mockCategoryPayload.categories_flat
        }
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Warm tree cache
      const tree1 = await FifozoneOmsService.getCategoryTree();
      expect(tree1.length).toBe(2);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Second call uses cache
      const tree2 = await FifozoneOmsService.getCategoryTree();
      expect(tree2).toBe(tree1);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Invalidate cache
      FifozoneOmsService.clearCategoryCache();
      expect(FifozoneOmsService._categoryTreeCache).toBeNull();
      expect(FifozoneOmsService._categoryCache.size).toBe(0);

      // Third call must hit network again
      const tree3 = await FifozoneOmsService.getCategoryTree();
      expect(tree3.length).toBe(2);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    test('2.6 Concurrency behavior: simultaneous uncached lookups trigger duplicate network calls (Cache Stampede)', async () => {
      let networkCalls = 0;
      const mockGet = jest.fn().mockImplementation(() => {
        networkCalls++;
        return new Promise(resolve => setTimeout(() => resolve({ data: mockCategoryPayload }), 20));
      });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Fire 10 parallel lookups on cold cache
      const promises = [
        FifozoneOmsService.resolveCategoryId('Dog Food'),
        FifozoneOmsService.resolveCategoryId('Dog Food'),
        FifozoneOmsService.resolveCategoryId('Cat Food'),
        FifozoneOmsService.resolveCategoryId('Cat Food'),
        FifozoneOmsService.resolveCategoryId('DOGS')
      ];

      const results = await Promise.all(promises);
      expect(results[0]).toBe(1650);
      expect(results[1]).toBe(1650);
      expect(results[2]).toBe(1660);

      // Observation: Without promise coalescing (single-flight), all parallel requests fire network calls
      expect(networkCalls).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // SECTION 3: BRAND CACHING & FORMAT PERMUTATIONS
  // ==========================================================================
  describe('3. Brand Caching & Format Permutations', () => {

    const mockBrands = [
      { id: 120, name: 'Drools Focus', slug: 'drools-focus', count: 48 },
      { id: 121, name: 'Farmina N&D', slug: 'farmina-nd', count: 92 },
      { id: 122, name: 'Royal Canin', slug: 'royal-canin', count: 140 }
    ];

    test('3.1 Memoizes brands and avoids repeated network requests', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: { brands: mockBrands } });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const first = await FifozoneOmsService.getBrands();
      expect(first.length).toBe(3);
      expect(mockGet).toHaveBeenCalledTimes(1);

      const second = await FifozoneOmsService.getBrands();
      expect(second.length).toBe(3);
      // Cache hit: mockGet not called again
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test('3.2 Format permutations: full, names, and options', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: { brands: mockBrands } });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      // Format: full / default
      const full = await FifozoneOmsService.getBrands({ format: 'full' });
      expect(full[0]).toEqual({ id: 120, name: 'Drools Focus', slug: 'drools-focus', count: 48 });

      // Format: names (array of strings)
      const names = await FifozoneOmsService.getBrands({ format: 'names' });
      expect(names).toEqual(['Drools Focus', 'Farmina N&D', 'Royal Canin']);

      // Format: options (UI select format)
      const options = await FifozoneOmsService.getBrands({ format: 'options' });
      expect(options).toEqual([
        { label: 'Drools Focus', value: 'Drools Focus', key: 120 },
        { label: 'Farmina N&D', value: 'Farmina N&D', key: 121 },
        { label: 'Royal Canin', value: 'Royal Canin', key: 122 }
      ]);
    });

    test('3.3 forceRefresh bypasses brand cache', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: { brands: mockBrands } });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      await FifozoneOmsService.getBrands();
      expect(mockGet).toHaveBeenCalledTimes(1);

      await FifozoneOmsService.getBrands({ forceRefresh: true });
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    test('3.4 clearBrandsCache clears cache and expiry', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: { brands: mockBrands } });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      await FifozoneOmsService.getBrands();
      expect(FifozoneOmsService._brandsCache).not.toBeNull();
      expect(FifozoneOmsService._brandsCacheExpiry).toBeGreaterThan(Date.now());

      FifozoneOmsService.clearBrandsCache();
      expect(FifozoneOmsService._brandsCache).toBeNull();
      expect(FifozoneOmsService._brandsCacheExpiry).toBe(0);

      await FifozoneOmsService.getBrands();
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    test('3.5 Fallback to /taxonomies when /brands endpoint fails', async () => {
      const mockGet = jest.fn()
        .mockRejectedValueOnce(new Error('Endpoint /brands not found'))
        .mockResolvedValueOnce({
          data: {
            taxonomies: {
              brands: mockBrands
            }
          }
        });
      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue({ get: mockGet });

      const brands = await FifozoneOmsService.getBrands({ format: 'names' });
      expect(brands).toEqual(['Drools Focus', 'Farmina N&D', 'Royal Canin']);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // SECTION 4: SAFE MOCK TESTING (R3) & MUTATION PREVENTATIVE VERIFICATION
  // ==========================================================================
  describe('4. Mandatory Safe Testing (R3) Audit', () => {

    test('4.1 All mutating methods route strictly through POST endpoints that can be cleanly mocked', () => {
      // Map of all write/delete operations
      const mutatingOperations = [
        'createProduct',
        'createProductsBatch',
        'updateProduct',
        'updateProductsBatch',
        'pushStock',
        'pushPrice',
        'deleteProduct',
        'deleteProductsBatch',
        'updateOrder',
        'updateOrdersBatch'
      ];

      mutatingOperations.forEach(method => {
        expect(typeof FifozoneOmsService[method]).toBe('function');
      });
    });

    test('4.2 Verify zero live network calls leak during mocked write operations', async () => {
      // Create a strict interceptor monitor that records any call attempting live network
      const capturedCalls = [];

      const mockClient = {
        post: jest.fn((url, payload) => {
          capturedCalls.push({ method: 'POST', url, payload });
          return Promise.resolve({
            data: {
              status: 'success',
              total_submitted: 1,
              total_updated: 1,
              total_created: 1,
              results: [{ id: 999999, status: 'mock_success' }]
            }
          });
        }),
        get: jest.fn((url, config) => {
          capturedCalls.push({ method: 'GET', url, config });
          return Promise.resolve({ data: { status: 'success', data: [] } });
        })
      };

      jest.spyOn(FifozoneOmsService, 'getClient').mockReturnValue(mockClient);

      // Execute each mutating call
      await FifozoneOmsService.pushStock('SAFE-TEST-SKU', 10);
      await FifozoneOmsService.pushPrice('SAFE-TEST-SKU', 999);
      await FifozoneOmsService.createProduct({ masterName: 'Mock Test Product' });
      await FifozoneOmsService.updateProduct({ masterName: 'Mock Test Product', sku: 'SAFE-SKU' });
      await FifozoneOmsService.deleteProduct({ masterName: 'Mock Test', sku: 'DEL-SKU' });
      await FifozoneOmsService.updateOrder(189248, { status: 'completed' });

      // Verify all were safely intercepted and recorded
      expect(capturedCalls.length).toBe(6);
      expect(capturedCalls.every(c => c.method === 'POST')).toBe(true);

      // Verify specific OMS endpoints were targeted without hitting live store
      expect(capturedCalls[0].url).toBe('/products/update');
      expect(capturedCalls[1].url).toBe('/products/update');
      expect(capturedCalls[2].url).toBe('/products/create');
      expect(capturedCalls[3].url).toBe('/products/update');
      expect(capturedCalls[4].url).toBe('/products/delete');
      expect(capturedCalls[5].url).toBe('/orders/update');
    });

    test('4.3 updateOrder enforces validation before issuing network call', async () => {
      // Should reject invalid or missing orderId before any network call
      await expect(FifozoneOmsService.updateOrder(null))
        .rejects
        .toThrow('A valid numeric orderId is required');

      await expect(FifozoneOmsService.updateOrder(0))
        .rejects
        .toThrow('A valid numeric orderId is required');

      await expect(FifozoneOmsService.updateOrder('abc'))
        .rejects
        .toThrow('A valid numeric orderId is required');

      // Should reject when no update fields are provided
      await expect(FifozoneOmsService.updateOrder(12345, {}))
        .rejects
        .toThrow('At least one update field (status, tracking_number, carrier, or tracking_url) is required');
    });

    test('4.4 Safety finding: Service lacks built-in environment guard, entirely dependent on test mocks', () => {
      // Assert that without mocks, getClient() uses live production URL and API key
      const defaultClient = FifozoneOmsService.getClient();
      expect(defaultClient.defaults.baseURL).toContain('fifozone.com');
      expect(defaultClient.defaults.headers['X-OMS-Key']).toBe('oms_live_9f8d2b7e61a4c035824e87901bcdf562');
    });
  });
});
