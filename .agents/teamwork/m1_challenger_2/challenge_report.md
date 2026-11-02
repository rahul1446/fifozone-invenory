# Empirical Challenge Report: Normalization, Caching & Mock Safety

**Agent**: `m1_challenger_2`  
**Target**: `server/src/services/fifozoneOms.service.js`  
**Test Suite**: `server/tests/challenge_m1_normalization_cache.test.js` (29 passed) & `server/tests/fifozoneOms.test.js` (2 failed, 37 passed)  
**Date**: 2026-11-02  
**Final Verdict**: **REJECT** (Defects found in error handling, normalization edge cases, and live store mutation risks)

---

## 1. Executive Summary

As the empirical adversarial challenger, we executed an exhaustive stress-testing matrix across four operational domains:
1. **Order Normalization (`normalizeOmsOrder`)**: Tested missing billing/shipping, 0-price items, decimal rounding, HTML decoding, and malformed line items.
2. **Category Resolution Caching**: Tested concurrency, case-insensitivity, pipe-formatted values (`"1650|Dog Food"`), and cache invalidation via `clearCategoryCache()`.
3. **Brand Caching (`_brandsCache`)**: Tested memoization, TTL, format permutations (`full`, `names`, `options`), and `/taxonomies` fallback.
4. **Safe Mock Testing (R3)**: Tested network isolation and mutation prevention.

While the core functionality is substantially implemented, empirical testing revealed **2 unit test failures in the existing test suite**, **3 data normalization edge case bugs**, **1 unhandled TypeError crash**, and a **critical safety vulnerability regarding live production credentials during unmocked test execution**.

---

## 2. Empirical Test Results Matrix

| # | Test Area | Scenario | Expected Behavior | Actual Behavior | Status |
|---|-----------|----------|-------------------|-----------------|--------|
| **T1.1** | Order Normalization | `order = null`, `order = undefined`, `order = "string"` | Returns `null` without throwing | Returns `null` safely | **PASS** |
| **T1.2** | Order Normalization | Empty object `order = {}` | Normalizes with robust defaults | Complete defaults assigned | **PASS** |
| **T1.3** | Order Normalization | Missing billing object (`billing = null`) | Falls back to shipping address and customer details | Falls back seamlessly | **PASS** |
| **T1.4** | Order Normalization | Missing shipping object (`shipping = null`) | Shipping address falls back to billing address | Falls back seamlessly | **PASS** |
| **T1.5** | Order Normalization | Customer name resolution priority | `billing.full_name` > `billing.first_name + last_name` > `shipping.full_name` > fallback | Correct priority order | **PASS** |
| **T1.6** | Order Normalization | Line item variation vs product ID | `variation_id > 0` uses variation ID; `variation_id = 0` or `"0"` falls back to `product_id` | `platformProductId` mapped correctly | **PASS** |
| **T1.7** | Order Normalization | Zero-price line items (`total = 0.00`, free gifts) | Unit price & total set to 0 without division by zero | `unitPrice: 0`, `total: 0` | **PASS** |
| **T1.8** | Order Normalization | Decimal rounding (`100 / 3`, shipping `49.99`) | Rounded to 2 decimal places (`unitPrice = 33.33`, `subtotal = 50.01`) | Rounded to 2 decimals cleanly | **PASS** |
| **T1.9** | Order Normalization | `shippingCharge > totalAmount` | `subtotal` clamped at `0` (non-negative) | `subtotal: 0` via `Math.max(0, ...)` | **PASS** |
| **T1.10** | Order Normalization | Payment method & status (COD vs Prepaid) | COD pending unless completed/delivered; Prepaid always paid | Status correctly mapped | **PASS** |
| **T1.11** | Order Normalization | HTML entities in item name and customer name | Both decode HTML entities (`&amp;`, `&#8211;`, etc.) | **Item name decodes, but customerName retains raw HTML entities** | **BUG** |
| **T1.12** | Order Normalization | `order.items` containing `null` (`[null]`) | Should skip null entries or handle gracefully | **Throws uncaught `TypeError: Cannot read properties of null (reading 'quantity')`** | **CRASH** |
| **T1.13** | Order Normalization | Line item with `quantity: 0` (cancelled/refunded) | Preserve quantity 0 | **Coerced to `quantity: 1` via `parseInt(0) \|\| 1`** | **BUG** |
| **T1.14** | Order Normalization | WooCommerce array `shipping_lines: [{ total: "50" }]` | Calculate shipping charge | **Evaluates to `0` because code expects object `.cost`** | **BUG** |
| **T2.1** | Category Caching | Pipe-formatted value (`"1650\|Dog Food"`) | Parses ID `1650` directly, 0 network calls | Returns `1650`, zero network calls | **PASS** |
| **T2.2** | Category Caching | Case-insensitivity & whitespace | Matches `'DOG FOOD'`, `'dog food'`, `'  DoG fOoD  '` | Warmed once, hits memory cache | **PASS** |
| **T2.3** | Category Caching | Parent ID scoping for duplicate category names | Distinguishes root category from subcategory with same name | Correctly uses `${parentId}::${nameKey}` | **PASS** |
| **T2.4** | Category Caching | `resolveSubCategoryId(parent, child)` | Resolves hierarchical pair `{ categoryId, subCategoryId }` | Returns correct numeric IDs | **PASS** |
| **T2.5** | Category Caching | Cache invalidation via `clearCategoryCache()` | Clears `_categoryCache`, `_categoryTreeCache`, and timestamp | Cleared, subsequent call refetches | **PASS** |
| **T2.6** | Category Caching | Concurrent lookups on cold cache | Request coalescing to avoid duplicate HTTP requests | **Cache Stampede: Multiple parallel requests fire redundant GET /categories** | **WEAKNESS** |
| **T3.1** | Brand Caching | Brand memoization (`_brandsCache`) | First call queries API, second call served from memory | Cached cleanly, 1 network call | **PASS** |
| **T3.2** | Brand Caching | Format permutations (`full`, `names`, `options`) | Returns full objects, string array, or Ant Design options | All 3 formats properly formatted | **PASS** |
| **T3.3** | Brand Caching | `forceRefresh: true` | Bypasses memory cache and re-queries API | Cache bypassed as expected | **PASS** |
| **T3.4** | Brand Caching | `clearBrandsCache()` | Clears `_brandsCache` and resets expiry to 0 | Cleared cleanly | **PASS** |
| **T3.5** | Brand Caching | Fallback to `/taxonomies` on `/brands` failure | Extracts brands from `taxonomies.brands` | Fallback executed successfully | **PASS** |
| **T4.1** | Safe Mock Testing | Mutating operations interface | 10 write/mutation methods available via POST endpoints | All 10 methods present | **PASS** |
| **T4.2** | Safe Mock Testing | Network leak audit | 0 write calls escape when mocked | Verified 0 write calls leaked | **PASS** |
| **T4.3** | Safe Mock Testing | Validation guards in `updateOrder` | Rejects missing/invalid orderId or empty payload | Validation throws before network | **PASS** |
| **T4.4** | Safe Mock Testing | Default credentials & environment safeguards | Service must not perform writes against live store by default | **CRITICAL: Live production API key hardcoded, no NODE_ENV test guard** | **CRITICAL** |

---

## 3. Detailed Challenge Findings & Defects

### Defect 1: Existing Test Suite Failures in `server/tests/fifozoneOms.test.js`
When running `npm test` in `server/`:
```
FAIL tests/fifozoneOms.test.js (5.791 s)
  ● Fifozone Universal OMS Service Test Suite › Tier 1: Core Read & Catalog Retrieval › 1.1 Connection Verification (testConnection) › mocked testConnection parses total and count fallback properly
    expect(received).toEqual(expected)
    Expected: { success: true, productCount: 4250 }
    Received: { success: true, message: "...", productCount: 4250, stats: { ... }, timestamp: "...", latencyMs: 0 }

  ● Fifozone Universal OMS Service Test Suite › Tier 2: Boundary, Resilience & Error Handling › service gracefully catches and formats network / 500 error messages
    Expected substring: "Fifozone OMS pullProducts failed: Database connection timeout on master node"
    Received message:   "Fifozone OMS pullProducts failed: undefined"
```
**Root Causes**:
1. `testConnection()` queries `/hub` first and returns rich metadata (`message`, `stats`, `latencyMs`, `timestamp`), whereas the test assertion expects a legacy truncated object.
2. In `pullProducts` (and across all methods):
   ```javascript
   const errMsg = error.message;
   throw new Error(`Fifozone OMS pullProducts failed: ${errMsg}`);
   ```
   When Axios or a mock rejects with an object containing `{ response: { data: { message: '...' } } }`, `error.message` is `undefined`, producing `"Fifozone OMS pullProducts failed: undefined"`. The method should check `error.response?.data?.message || error.message || 'Unknown error'`.

---

### Defect 2: Uncaught `TypeError` on Malformed `order.items`
In `fifozoneOms.service.js` line 644:
```javascript
const rawItems = Array.isArray(order.items) ? order.items : [];
const items = rawItems.map(item => {
  const qty = parseInt(item.quantity, 10) || 1; // CRASHES if item is null
```
If an order payload contains `[null]` or a non-object element, `item.quantity` immediately throws an unhandled `TypeError: Cannot read properties of null (reading 'quantity')`.
**Mitigation**:
```javascript
const items = rawItems
  .filter(item => item && typeof item === 'object')
  .map(item => { ... });
```

---

### Defect 3: Involuntary Line Item Quantity Mutation (`quantity: 0 -> 1`)
In `fifozoneOms.service.js` line 645:
```javascript
const qty = parseInt(item.quantity, 10) || 1;
```
If an order contains a refunded, cancelled, or 0-quantity item, `parseInt(0, 10) || 1` evaluates to `1`. This inadvertently mutates a 0-quantity cancelled item into an active item with quantity 1.
**Mitigation**:
```javascript
const parsedQty = parseInt(item.quantity, 10);
const qty = isNaN(parsedQty) ? 1 : parsedQty;
```

---

### Defect 4: Customer Name Retains Raw HTML Entities
In `fifozoneOms.service.js` lines 617-621:
```javascript
const customerName = billing.full_name ||
  `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
  shipping.full_name ||
  `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
  'Unknown Customer';
```
While line 657 runs `decodeHtml(item.name)`, `customerName` does not call `decodeHtml()`. Customers with names containing `&amp;` or `&#038;` (e.g., `"M&amp;M Pets"`) are stored with raw HTML entities.
**Mitigation**:
```javascript
const customerName = decodeHtml(rawCustomerName);
```

---

### Defect 5: Standard WooCommerce Array `shipping_lines` Ignored
In `fifozoneOms.service.js` line 671:
```javascript
const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);
```
In standard WooCommerce REST / HPOS payloads, `shipping_lines` is an **Array** of objects:
`shipping_lines: [{ id: 1, method_title: "Flat rate", total: "50.00" }]`.
Accessing `order.shipping_lines?.cost` on an array returns `undefined`. If `order.shipping_total` is omitted, `shippingCharge` evaluates to `0`.
**Mitigation**:
```javascript
const shippingLineCost = Array.isArray(order.shipping_lines)
  ? order.shipping_lines.reduce((sum, line) => sum + parseFloat(line.total || line.cost || 0), 0)
  : (order.shipping_lines?.cost || 0);
const shippingCharge = parseFloat(shippingLineCost || order.shipping_total || 0);
```

---

### Defect 6: Critical Mutation Risk Under Automated Testing (Requirement R3)
In `fifozoneOms.service.js` lines 37-38:
```javascript
this.baseURL = process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1';
this.apiKey = process.env.FIFOZONE_OMS_API_KEY || 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
```
The service hardcodes the **production base URL** and **live production API key** as defaults.
There is **no built-in guard** (e.g. checking `process.env.NODE_ENV === 'test'` or an `isReadOnly` flag).
If any test or developer script executes mutating calls (`pushStock`, `updateOrder`, `deleteProduct`) without explicitly mocking `getClient()`, **live production store data on fifozone.com will be modified or deleted**.
**Mitigation**:
In `createClientInstance`:
```javascript
if (process.env.NODE_ENV === 'test' && !process.env.ALLOW_LIVE_OMS_WRITES) {
  instance.interceptors.request.use((reqConfig) => {
    if (['post', 'put', 'patch', 'delete'].includes(reqConfig.method.toLowerCase())) {
      throw new Error(`[SAFETY GUARD] Blocked live ${reqConfig.method.toUpperCase()} to ${reqConfig.url} in test environment. Write operations must be mocked.`);
    }
    return reqConfig;
  });
}
```

---

## 4. Final Verdict

**VERDICT: REJECT**

**Reasoning**:
1. **Failing Unit Tests**: `npm test` fails with 2 test failures in `server/tests/fifozoneOms.test.js`.
2. **Crash on Null Items**: `normalizeOmsOrder({ items: [null] })` throws an uncaught `TypeError`.
3. **Data Integrity Flaws**: `quantity: 0` coerced to `1`, HTML entities unescaped in customer names, and array `shipping_lines` not extracted.
4. **Safety Risk**: Lack of an active runtime guard in `fifozoneOms.service.js` leaves production store data vulnerable to unmocked test executions.

All flaws are empirical, documented with reproduction tests in `server/tests/challenge_m1_normalization_cache.test.js`. Remediation is clear and actionable.
