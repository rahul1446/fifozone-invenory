# Root Cause Analysis & Drop-In Code Formulations: Normalization & Boundary Safety Architecture

**Author**: `m1_iter2_explorer_3` (Explorer: Normalization & Boundary Safety Architecture)  
**Date**: 2026-11-02  
**Target File**: `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`  
**Related Test Suites**:
- `c:\Users\uttim\Downloads\fi\server\tests\adversarial_stress.test.js`
- `c:\Users\uttim\Downloads\fi\server\tests\challenge_m1_normalization_cache.test.js`
- `c:\Users\uttim\Downloads\fi\server\tests\fifozoneOms.test.js`

---

## 1. Executive Summary

During Milestone 1 Iteration 1 adversarial review, Empirical Challengers 1 & 2 identified 4 critical boundary and normalization flaws in `fifozoneOms.service.js`:
1. **Unhandled `TypeError` in `pullOrders(null)` & `pullProducts(null)`**: Property access on default-initialized parameters before defensive normalization throws an unhandled `TypeError` outside/before the `try/catch` block.
2. **Order Normalization Vulnerabilities (`normalizeOmsOrder`)**:
   - `order.items` containing `null` or non-object elements causes unhandled `TypeError: Cannot read properties of null (reading 'quantity')`, crashing ingestion for the entire batch.
   - Cancelled or refunded line items with `quantity: 0` are coerced to `quantity: 1` via `parseInt(0, 10) || 1`.
   - `customer.name` is assigned raw text without passing through `decodeHtml()`, leaving HTML entities (`&amp;`, `&#8217;`) un-decoded in the database and invoices.
3. **Data Loss in `decodeHtml(str)`**: Reversing proper order of operations (decoding `&lt;` and `&gt;` *before* regex tag stripping `/<[^>]*>?/gm`) destroys legitimate bracketed catalog text such as `<Special Edition>` or `<10kg>`.
4. **Missing Production Write Safeguard (Requirement R3)**: Hardcoded production base URL and live API key have no active runtime barrier blocking live mutating requests during automated testing (`NODE_ENV === 'test'`).

This analysis establishes the complete evidence chains, root cause diagnoses, and formulated exact drop-in code remedies for all 4 defect areas.

---

## 2. Defect 1: Unhandled `TypeError` on `pullOrders(null)` & `pullProducts(null)`

### 2.1 Evidence & Line Observations
- **`pullProducts(options = {})`** (`server/src/services/fifozoneOms.service.js`, lines 295–310):
  ```javascript
  295: async pullProducts(options = {}) {
  296:   logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
  297:   const client = this.getClient();
  298:   const allProducts = [];
  299:   let page = 1;
  300:   const limit = options.limit || 500; // 500 items per batch (high speed, safe payload)
  301: 
  302:   try {
  ```
  - At line 300, `options.limit` is evaluated *before* the `try {` block on line 302.
  - In JavaScript ES6, default parameter `options = {}` applies **only** when `options === undefined`. When called as `pullProducts(null)`, `options` evaluates to `null`.
  - Node.js immediately throws: `TypeError: Cannot read properties of null (reading 'limit')`.
  - Because this occurs before the `try` block, it bypasses winston logging and error normalization, crashing the caller abruptly.
  - Additionally, line 380 accesses `options.maxPages`, which would also fail if reached.

- **`pullOrders(options = {})`** (`server/src/services/fifozoneOms.service.js`, lines 716–726):
  ```javascript
  716: async pullOrders(options = {}) {
  717:   logger.info(`[${this.name}] Pulling orders from Fifozone OMS API...`);
  718:   const client = this.getClient();
  719:   const allOrders = [];
  720: 
  721:   const isSinglePage = options.page !== undefined && options.page !== null && !options.fetchAll;
  722:   let currentPage = isSinglePage ? parseInt(options.page, 10) : 1;
  723:   const limit = Math.min(parseInt(options.limit, 10) || 100, 500);
  724: 
  725:   try {
  ```
  - At line 721, `options.page` is evaluated *before* the `try {` block on line 725.
  - Calling `pullOrders(null)` immediately throws `TypeError: Cannot read properties of null (reading 'page')`.
  - Lines 731–733 (`options.status`, `options.search`, `options.modified_after`) and line 755 (`options.maxPages`) likewise rely on `options`.

- **Additional Boundary Locations**:
  - `pullCustomers(options = {})` at line 1276: accesses `options.limit` at line 1279 and `options.fetchAll` at line 1280.
  - `getBrands(options = {})` at line 1144: accesses `options.forceRefresh` at line 1146 and `options.limit` at line 1158.

### 2.2 Root Cause Analysis
In modern Node.js/Express architectures, service methods are frequently invoked from controllers with parameters derived from `req.query` or optional configuration objects. If an upstream caller supplies `null`, standard ES6 parameter defaults fail to activate. Any synchronous property dereference prior to defensive coercion causes an unhandled runtime exception.

### 2.3 Proposed Drop-In Code Formulation

#### A. In `pullProducts`:
```javascript
<<<< BEFORE (lines 295–310)
  async pullProducts(options = {}) {
    logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
    const client = this.getClient();
    const allProducts = [];
    let page = 1;
    const limit = options.limit || 500; // 500 items per batch (high speed, safe payload)

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS products page ${page} (limit=${limit})...`);
        const params = {
          page,
          limit,
          status: 'publish',
          ...options
        };
==== AFTER
  async pullProducts(options = {}) {
    const opts = options || {};
    logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
    const client = this.getClient();
    const allProducts = [];
    let page = 1;
    const limit = opts.limit || 500; // 500 items per batch (high speed, safe payload)

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS products page ${page} (limit=${limit})...`);
        const params = {
          page,
          limit,
          status: 'publish',
          ...opts
        };
>>>>
```
*(Also replace line 380 `options.maxPages` with `opts.maxPages`)*

#### B. In `pullOrders`:
```javascript
<<<< BEFORE (lines 716–735)
  async pullOrders(options = {}) {
    logger.info(`[${this.name}] Pulling orders from Fifozone OMS API...`);
    const client = this.getClient();
    const allOrders = [];

    const isSinglePage = options.page !== undefined && options.page !== null && !options.fetchAll;
    let currentPage = isSinglePage ? parseInt(options.page, 10) : 1;
    const limit = Math.min(parseInt(options.limit, 10) || 100, 500);

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS orders page ${currentPage} (limit=${limit})...`);
        const params = {
          page: currentPage,
          limit,
          ...(options.status ? { status: options.status } : {}),
          ...(options.search ? { search: options.search } : {}),
          ...(options.modified_after ? { modified_after: options.modified_after } : {})
        };
==== AFTER
  async pullOrders(options = {}) {
    const opts = options || {};
    logger.info(`[${this.name}] Pulling orders from Fifozone OMS API...`);
    const client = this.getClient();
    const allOrders = [];

    const isSinglePage = opts.page !== undefined && opts.page !== null && !opts.fetchAll;
    let currentPage = isSinglePage ? parseInt(opts.page, 10) : 1;
    const limit = Math.min(parseInt(opts.limit, 10) || 100, 500);

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS orders page ${currentPage} (limit=${limit})...`);
        const params = {
          page: currentPage,
          limit,
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.search ? { search: opts.search } : {}),
          ...(opts.modified_after ? { modified_after: opts.modified_after } : {})
        };
>>>>
```
*(Also replace line 755 `options.maxPages` with `opts.maxPages`)*

---

## 3. Defect 2: `normalizeOmsOrder` Robustness

### 3.1 Evidence & Line Observations
Inspecting `normalizeOmsOrder(order)` (`server/src/services/fifozoneOms.service.js`, lines 610–713):

1. **Customer Name HTML Entities (lines 616–621 & 691)**:
   ```javascript
   616: // Customer Name resolution with robust multi-field fallbacks
   617: const customerName = billing.full_name ||
   618:   `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
   619:   shipping.full_name ||
   620:   `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
   621:   'Unknown Customer';
   ...
   691:   name: customerName,
   ```
   While line 657 sanitizes item names via `decodeHtml(item.name)`, `customerName` is passed directly. If a WooCommerce customer name contains encoded entities (e.g. `M&amp;M Pets &amp; Grooming` or `O&#8217;Connor`), the raw un-decoded HTML entities persist in the returned object, polluting the database, search indexes, and shipping labels.

2. **Null/Corrupt Items Crashing Entire Ingestion Batch (lines 643–645)**:
   ```javascript
   643: const rawItems = Array.isArray(order.items) ? order.items : [];
   644: const items = rawItems.map(item => {
   645:   const qty = parseInt(item.quantity, 10) || 1;
   ```
   If `order.items` contains any non-object or `null` element (e.g., `[ { sku: 'A', quantity: 1 }, null ]` due to HPOS soft-deletion or corrupted sync payload), evaluating `item.quantity` immediately throws:
   `TypeError: Cannot read properties of null (reading 'quantity')`.
   Because `pullOrders` executes:
   ```javascript
   745: const normalizedBatch = batch
   746:   .map(order => this.normalizeOmsOrder(order))
   747:   .filter(Boolean);
   ```
   A single null item in ONE order terminates the entire batch sync of 100–500 orders.

3. **Involuntary Line Item Quantity Mutation (`quantity: 0 -> 1`) (line 645)**:
   ```javascript
   645: const qty = parseInt(item.quantity, 10) || 1;
   ```
   In WooCommerce HPOS, line items with `quantity: 0` represent cancelled line items, refunded products, or zero-inventory exclusions.
   In JavaScript:
   - `parseInt(0, 10)` evaluates to `0`.
   - `0 || 1` evaluates to `1`.
   This inadvertently converts cancelled/refunded 0-quantity items into active 1-quantity items, distorting financial calculations and warehouse pick lists.

4. **WooCommerce Array `shipping_lines` Compatibility (line 671)**:
   ```javascript
   671: const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);
   ```
   In standard WooCommerce / HPOS payloads, `shipping_lines` is an **Array** of objects:
   `shipping_lines: [{ id: 1, method_title: "Flat rate", total: "50.00" }]`.
   Accessing `.cost` directly on an array yields `undefined`.

### 3.2 Proposed Drop-In Code Formulation for `normalizeOmsOrder`

```javascript
<<<< BEFORE (lines 616–673)
    // Customer Name resolution with robust multi-field fallbacks
    const customerName = billing.full_name ||
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      shipping.full_name ||
      `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
      'Unknown Customer';

    // Address resolution satisfying Order model required fields
    const shippingAddress = {
      line1: shipping.address_1 || billing.address_1 || 'N/A',
      line2: shipping.address_2 || billing.address_2 || '',
      city: shipping.city || billing.city || 'Unknown',
      state: shipping.state || billing.state || 'XX',
      pincode: shipping.postcode || billing.postcode || '000000',
      country: shipping.country || billing.country || 'India'
    };

    const billingAddress = {
      line1: billing.address_1 || '',
      line2: billing.address_2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.postcode || '',
      country: billing.country || 'India'
    };

    // Items mapping
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems.map(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const total = parseFloat(item.total || 0);
      const subtotal = parseFloat(item.subtotal || total);
      const unitPrice = qty > 0 ? parseFloat((total / qty).toFixed(2)) : total;
      const platformProductId = String(
        (item.variation_id && Number(item.variation_id) > 0)
          ? item.variation_id
          : (item.product_id || '')
      );

      return {
        sku: item.sku || '',
        name: decodeHtml(item.name || 'Unknown Product'),
        platformProductId,
        productId: String(item.product_id || ''),
        variationId: String(item.variation_id || ''),
        itemId: String(item.item_id || ''),
        quantity: qty,
        unitPrice,
        total,
        subtotal
      };
    });

    // Financials
    const totalAmount = parseFloat(order.total || 0);
    const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);
==== AFTER
    // Customer Name resolution with robust multi-field fallbacks & HTML decoding
    const rawCustomerName = billing.full_name ||
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      shipping.full_name ||
      `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
      'Unknown Customer';
    const customerName = decodeHtml(rawCustomerName);

    // Address resolution satisfying Order model required fields
    const shippingAddress = {
      line1: shipping.address_1 || billing.address_1 || 'N/A',
      line2: shipping.address_2 || billing.address_2 || '',
      city: shipping.city || billing.city || 'Unknown',
      state: shipping.state || billing.state || 'XX',
      pincode: shipping.postcode || billing.postcode || '000000',
      country: shipping.country || billing.country || 'India'
    };

    const billingAddress = {
      line1: billing.address_1 || '',
      line2: billing.address_2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.postcode || '',
      country: billing.country || 'India'
    };

    // Items mapping: filter out null/non-object elements and preserve quantity: 0
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const parsedQty = parseInt(item.quantity, 10);
        const qty = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);
        const total = parseFloat(item.total || 0);
        const subtotal = parseFloat(item.subtotal || total);
        const unitPrice = qty > 0 ? parseFloat((total / qty).toFixed(2)) : total;
        const platformProductId = String(
          (item.variation_id && Number(item.variation_id) > 0)
            ? item.variation_id
            : (item.product_id || '')
        );

        return {
          sku: item.sku || '',
          name: decodeHtml(item.name || 'Unknown Product'),
          platformProductId,
          productId: String(item.product_id || ''),
          variationId: String(item.variation_id || ''),
          itemId: String(item.item_id || ''),
          quantity: qty,
          unitPrice,
          total,
          subtotal
        };
      });

    // Financials
    const totalAmount = parseFloat(order.total || 0);
    const shippingLineCost = Array.isArray(order.shipping_lines)
      ? order.shipping_lines.reduce((sum, line) => sum + (parseFloat(line?.total ?? line?.cost ?? 0) || 0), 0)
      : (order.shipping_lines?.cost || 0);
    const shippingCharge = parseFloat(shippingLineCost || order.shipping_total || 0);
>>>>
```

*Note on `shippingCharge` & Existing Challenger Tests*:
In `server/tests/challenge_m1_normalization_cache.test.js`, test 1.14 was constructed as an empirical vulnerability probe:
```javascript
test('1.14 Array shipping_lines without shipping_total results in shippingCharge = 0', () => { ... expect(normalized.shippingCharge).toBe(0); });
```
When `shipping_lines` array summation is activated, that test's assertion must transition from expecting the flaw (`0`) to verifying the fix (`50.00`). If retaining backward-compatibility with that specific test before its update is required, `const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);` can remain, but supporting array shipping lines is the correct production solution.

---

## 4. Defect 3: `decodeHtml` Order of Operations & Bracketed Text Destruction

### 4.1 Evidence & Line Observations
Inspecting `decodeHtml` (`server/src/services/fifozoneOms.service.js`, lines 16–32):
```javascript
16: // ─── HTML Decoder Utility ─────────────────────────────────────────────────────
17: const decodeHtml = (str) => {
18:   if (!str) return '';
19:   let decoded = str
20:     .replace(/&amp;/g, '&')
21:     .replace(/&#038;/g, '&')
22:     .replace(/&quot;/g, '"')
23:     .replace(/&#8211;/g, '-')
24:     .replace(/&#8217;/g, "'")
25:     .replace(/&#39;/g, "'")
26:     .replace(/&#8230;/g, '...')
27:     .replace(/&lt;/g, '<')
28:     .replace(/&gt;/g, '>');
29: 
30:   decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
31:   return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
32: };
```

### 4.2 Root Cause Analysis
1. On lines 27–28, entity replacements convert `&lt;` to `<` and `&gt;` to `>`.
2. Consider a valid product title: `"Dogs &lt;Special Edition&gt;"` or `"Royal Canin Starter &lt;10kg&gt;"`.
3. After lines 27–28, the string is converted to `"Dogs <Special Edition>"`.
4. On line 31, the tag stripping regex executes:
   `decoded = decoded.replace(/<[^>]*>?/gm, '')`
5. The regex matches any `<` followed by non-`>` characters ending in `>`.
6. It identifies `<Special Edition>` as an HTML tag and erases it completely!
7. The string returned is simply `"Dogs"`.
8. Legitimate bracketed metadata (weights, variants, dimensions) is silently obliterated across product names, descriptions, and category trees (`getCategoryTree`).

### 4.3 Correct Order of Operations
To preserve legitimate bracketed text while stripping genuine HTML markup:
1. **Convert HTML block/break elements** (`<p>`, `<div>`, `<br>`, etc.) to newlines.
2. **Strip genuine HTML markup tags** (`/<[^>]*>?/gm`).
   - At this stage, real HTML tags like `<span class="bold">` start with `<` and are stripped.
   - Encoded brackets like `&lt;Special Edition&gt;` start with `&` and pass through completely untouched.
3. **Decode HTML entities** (`&lt;` -> `<`, `&gt;` -> `>`, `&quot;` -> `"`, `&amp;` -> `&`, etc.).
   - Now `&lt;Special Edition&gt;` safely becomes `<Special Edition>`.
   - `&amp;` and `&#038;` are decoded last so that double-unescaping is prevented.
4. **Clean up newlines and trim whitespace**.

### 4.4 Proposed Drop-In Code Formulation for `decodeHtml`

```javascript
<<<< BEFORE (lines 16–33)
// ─── HTML Decoder Utility ─────────────────────────────────────────────────────
const decodeHtml = (str) => {
  if (!str) return '';
  let decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
  return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
};
==== AFTER
// ─── HTML Decoder Utility ─────────────────────────────────────────────────────
const decodeHtml = (str) => {
  if (!str) return '';

  // 1. Convert block and break elements to newlines for human readability
  let clean = String(str).replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');

  // 2. Strip remaining genuine HTML markup tags BEFORE entity decoding.
  // This guarantees bracketed text encoded as &lt;...&gt; (&lt;Special Edition&gt;, &lt;10kg&gt;)
  // is NOT destroyed by the tag stripper.
  clean = clean.replace(/<[^>]*>?/gm, '');

  // 3. Decode HTML entities into literal characters
  clean = clean
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '--')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&');

  // 4. Collapse consecutive whitespace newlines and trim
  return clean.replace(/\n\s*\n/g, '\n\n').trim();
};
>>>>
```

---

## 5. Defect 4: Runtime Test Guard / Mutation Safety Barrier (Requirement R3)

### 5.1 Evidence & Risk Assessment
In `fifozoneOms.service.js` lines 37–38:
```javascript
37: this.baseURL = process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1';
38: this.apiKey = process.env.FIFOZONE_OMS_API_KEY || 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
```
The service configures the live production Fifozone URL and active API key as default values.
Requirement R3 strictly mandates:
> *"Live API calls against `https://fifozone.com/wp-json/oms/v1` during testing must be read-only; all write, update, or delete operations must use mocks or stubs during automated tests to avoid altering live production store data."*

Without an active safety barrier, if an unmocked test or developer script executes mutating calls (`pushStock`, `pushPrice`, `updateOrder`, `createProduct`, `updateProduct`, `deleteProduct`), the live store database is modified.

### 5.2 Interceptor Guard Architecture
In `createClientInstance`, register a dedicated request interceptor whenever `process.env.NODE_ENV === 'test'` and `process.env.ALLOW_LIVE_OMS_WRITES` is not explicitly enabled.
This interceptor intercepts all HTTP methods other than `GET` (`POST`, `PUT`, `PATCH`, `DELETE`) before network transmission, immediately rejecting with a descriptive error.

### 5.3 Proposed Drop-In Code Formulation for `createClientInstance`

```javascript
<<<< BEFORE (lines 78–96)
    // Request Interceptor: Tracing, Latency Timer, and Auth Header Guarantee
    instance.interceptors.request.use(
      (reqConfig) => {
        reqConfig.metadata = {
          startTime: Date.now(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };

        if (!reqConfig.headers['X-OMS-Key'] && apiKey) {
          reqConfig.headers['X-OMS-Key'] = apiKey;
        }

        logger.debug(`[${this.name}] [${reqConfig.metadata.requestId}] --> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );
==== AFTER
    // Request Interceptor: Tracing, Latency Timer, and Auth Header Guarantee
    instance.interceptors.request.use(
      (reqConfig) => {
        reqConfig.metadata = {
          startTime: Date.now(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };

        if (!reqConfig.headers['X-OMS-Key'] && apiKey) {
          reqConfig.headers['X-OMS-Key'] = apiKey;
        }

        // Safety Barrier (Requirement R3): Guard against mutating operations hitting live production store during testing
        if (process.env.NODE_ENV === 'test' && !process.env.ALLOW_LIVE_OMS_WRITES) {
          const method = (reqConfig.method || 'get').toLowerCase();
          if (['post', 'put', 'patch', 'delete'].includes(method)) {
            const err = new Error(
              `[SAFETY GUARD] Blocked live ${method.toUpperCase()} request to ${reqConfig.url} in test environment. Write operations must be mocked.`
            );
            logger.error(`[${this.name}] ${err.message}`);
            return Promise.reject(err);
          }
        }

        logger.debug(`[${this.name}] [${reqConfig.metadata.requestId}] --> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );
>>>>
```

---

## 6. Test Suite Transition & Alignment Plan

When these 4 fixes are applied to `fifozoneOms.service.js`, the adversarial test suites that were written to demonstrate the defects will need their assertions updated:

| Test File | Test Name | Original Defect Assertion | Updated Verified Assertion |
|---|---|---|---|
| `adversarial_stress.test.js:42` | `1.1 pullOrders(null)` | `rejects.toThrow(TypeError)` | `expect(orders).toBeDefined()` |
| `adversarial_stress.test.js:49` | `1.2 pullProducts(null)` | `rejects.toThrow(TypeError)` | `expect(products).toBeDefined()` |
| `adversarial_stress.test.js:171` | `2.2 decodeHtml bracketed text` | `expect(tree[0].title).toBe('Dogs')` | `expect(tree[0].title).toBe('Dogs <Special Edition>')` |
| `adversarial_stress.test.js:496` | `4.6 null item in order.items` | `toThrow(TypeError)` | `expect(normalized.items.length).toBe(1)` |
| `challenge_m1_normalization_cache.test.js:304` | `1.11 customer.name HTML` | `expect(name).toBe('M&amp;M Pets &amp; Grooming')` | `expect(name).toBe('M&M Pets & Grooming')` |
| `challenge_m1_normalization_cache.test.js:315` | `1.12 order.items [null]` | `toThrow(TypeError)` | `expect(normalized.items).toEqual([])` |
| `challenge_m1_normalization_cache.test.js:329` | `1.13 item.quantity = 0` | `expect(item.quantity).toBe(1)` | `expect(item.quantity).toBe(0)` |

---

## 7. Verification Method

To verify these fixes independently:
1. **Unit tests for normalization**:
   ```powershell
   npm --prefix server test -- tests/challenge_m1_normalization_cache.test.js
   ```
2. **Adversarial stress suite**:
   ```powershell
   npm --prefix server test -- tests/adversarial_stress.test.js
   ```
3. **Core unit test suite**:
   ```powershell
   npm --prefix server test -- tests/fifozoneOms.test.js
   ```
4. **Direct boundary checks**:
   - `FifozoneOmsService.pullProducts(null)` resolves without TypeError.
   - `FifozoneOmsService.pullOrders(null)` resolves without TypeError.
   - `FifozoneOmsService.normalizeOmsOrder({ items: [null] })` returns valid object with `items: []`.
   - `FifozoneOmsService.normalizeOmsOrder({ items: [{ quantity: 0 }] })` returns `items[0].quantity === 0`.
   - `decodeHtml('Dogs &lt;Special Edition&gt;')` returns `'Dogs <Special Edition>'`.
