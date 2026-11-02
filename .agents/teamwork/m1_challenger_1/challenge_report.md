# Empirical Adversarial Challenge Report: `fifozoneOms.service.js`

**Challenger**: `m1_challenger_1` (EMPIRICAL CHALLENGER / critic & specialist)  
**Date**: 2026-11-02  
**Target File**: `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`  
**Test Suite Executed**: `c:\Users\uttim\Downloads\fi\server\tests\adversarial_stress.test.js` (31 tests)  
**Overall Risk Assessment**: **CRITICAL**  
**Verdict**: **REJECT**

---

## 1. Challenge Summary

The `FifozoneOmsService` client demonstrates good design in Axios interceptors (retry logic with exponential backoff and jitter, 429 Retry-After handling, 401 query-param fallback, and memoized category caching). Live read-only tests against the production store (`https://fifozone.com/wp-json/oms/v1`) confirm connectivity and valid schemas.

However, adversarial stress testing and boundary probing uncovered **6 critical and high-severity defects** that cause silent data corruption, false-positive write confirmations, and unhandled runtime crashes during catalog and order sync. Furthermore, the worker's own test suite (`tests/fifozoneOms.test.js`) currently fails with 2 failing tests.

---

## 2. Critical & High Challenges

### [CRITICAL] Challenge 1: `updateProduct` and `deleteProduct` Mask API Errors and Report False Success
- **Assumption challenged**: The service assumes that an HTTP 200 response with `data.results[0]` indicates a successful update or deletion.
- **Attack scenario**: When `POST /products/update` or `POST /products/delete` is invoked with a non-existent or invalid product SKU/ID, the Fifozone OMS API returns HTTP 200 with payload `{ status: "error", results: [{ status: "error", message: "Product SKU NONEXISTENT does not exist" }] }`. In `fifozoneOms.service.js`:
  - `updateProduct` (lines 494–498) extracts `const resolvedId = firstResult?.id || payload.id;` and returns `{ success: true, wooProductId: resolvedId, action: 'updated' }`.
  - `deleteProduct` (lines 578–581) extracts `wooProductId: firstResult?.id || wooId` and returns `{ success: true, wooProductId, action: 'deleted' }`.
- **Blast radius**: The inventory sync engine (`SyncService`) believes products were updated/deleted on Fifozone, marking local database state as synchronized when in reality the remote store rejected the write. This causes silent desynchronization between warehouse inventory and the live store.
- **Mitigation**: Implement the same check used in `updateOrder` (lines 834–838):
  ```javascript
  if (data.status === 'error' || data.total_failed > 0 || firstResult?.status === 'error') {
    throw new Error(`Fifozone OMS updateProduct failed: ${firstResult?.message || 'Update rejected'}`);
  }
  ```

---

### [HIGH] Challenge 2: `pullOrders(null)` & `pullProducts(null)` Throw Unhandled `TypeError` Before `try/catch`
- **Assumption challenged**: Default parameter `options = {}` safely shields against missing or `null` options.
- **Attack scenario**: Calling `pullOrders(null)` or `pullProducts(null)` (common when invoked programmatically without arguments or from external controllers passing `req.query` which can be `null`):
  - In `pullOrders` (line 721): `const isSinglePage = options.page !== undefined...` is evaluated *before* the `try {` block on line 726. It immediately throws `TypeError: Cannot read properties of null (reading 'page')`.
  - In `pullProducts` (line 300): `const limit = options.limit || 500;` is evaluated *before* the `try {` block on line 302. It immediately throws `TypeError: Cannot read properties of null (reading 'limit')`.
- **Blast radius**: Crashes caller without entering service error handling, producing un-normalized raw TypeErrors that bypass winston logging and normalized error wrapping.
- **Mitigation**: Normalize options at the start of both methods: `const opts = options || {};`.

---

### [HIGH] Challenge 3: `decodeHtml` Strips Legitimate Text Enclosed in `&lt;...&gt;` Due to Premature Entity Replacement
- **Assumption challenged**: Replacing HTML entities before regex HTML tag stripping is safe.
- **Attack scenario**: Product names or category names containing bracketed text (e.g. `Puppy Food &lt;10kg&gt;`, `Dogs &lt;Special Edition&gt;` or dimensions like `&lt;50cm`):
  - In `fifozoneOms.service.js` line 27: `decodeHtml` converts `&lt;` to `<` and `&gt;` to `>`. The string becomes `Dogs <Special Edition>`.
  - On line 31: `decoded = decoded.replace(/<[^>]*>?/gm, '')` executes. It treats `<Special Edition>` as an HTML tag and completely erases it, returning `"Dogs"`.
- **Blast radius**: Catalog titles, descriptions, and category tree labels suffer irreversible text truncation and data corruption upon retrieval.
- **Mitigation**: Strip HTML tags `replace(/<[^>]*>?/gm, '')` *first*, and only *then* decode HTML entities (`&lt;`, `&gt;`, `&amp;`, etc.).

---

### [HIGH] Challenge 4: `normalizeOmsOrder` Crashes Entire Batch if Any Order Item is `null` or Corrupt
- **Assumption challenged**: `order.items` always contains non-null objects.
- **Attack scenario**: In `fifozoneOms.service.js` line 645:
  ```javascript
  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items = rawItems.map(item => {
    const qty = parseInt(item.quantity, 10) || 1;
  ```
  If `order.items` contains `[ { ... }, null ]` (e.g. from partial HPOS serialization, corrupted order lines, or deleted line items), `item.quantity` throws `TypeError: Cannot read properties of null (reading 'quantity')`.
- **Blast radius**: Because `pullOrders` runs `batch.map(order => this.normalizeOmsOrder(order))`, a single corrupt line item inside one order causes the ingestion of all 100 or 500 orders on that page to fail completely.
- **Mitigation**: Filter or validate items: `rawItems.filter(Boolean).map(item => ...)`.

---

### [MEDIUM] Challenge 5: HTML Entities in `customer.name` Left Un-Decoded
- **Assumption challenged**: `customerName` in `normalizeOmsOrder` is clean text.
- **Attack scenario**: WooCommerce customer names with ampersands or apostrophes (e.g., `M&amp;M Pets &amp; Grooming` or `O&#8217;Connor`) are assigned directly to `customer.name` without passing through `decodeHtml`.
- **Blast radius**: Database stores raw escaped HTML entities in `customer.name`, showing raw entities in UI order cards and invoices.
- **Mitigation**: Wrap `customerName` resolution with `decodeHtml(...)`.

---

### [MEDIUM] Challenge 6: Pre-existing Test Suite `tests/fifozoneOms.test.js` Has 2 Failing Tests
- **Assumption challenged**: The implementer's test suite passes cleanly out of the box.
- **Attack scenario**: Running `npm --prefix server test -- tests/fifozoneOms.test.js` fails 2 tests:
  1. `mocked testConnection parses total and count fallback properly`: Test expects `{ success: true, productCount: 4250 }`, but `testConnection` returns full object with `message`, `productCount`, `stats`, `timestamp`, `latencyMs`.
  2. `service gracefully catches and formats network / 500 error messages`: Test rejects mock with `{ response: { data: { message: '...' } } }`, but `pullProducts` catches error and accesses `error.message` (which is `undefined`).
- **Blast radius**: CI/CD pipeline and milestone acceptance criteria are broken.
- **Mitigation**: Align test assertions with `testConnection`'s expanded return contract and ensure error extractors check `error.response?.data?.message || error.message`.

---

## 3. Stress Test Results Summary

Executed from `server/tests/adversarial_stress.test.js`:

| # | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---|----------------|-------------------|-----------------|--------|
| 1.1 | `pullOrders(null)` | Reject with normalized error or handle safely | Throws uncaught `TypeError: Cannot read properties of null (reading 'page')` | **FAIL / DEFECT CONFIRMED** |
| 1.2 | `pullProducts(null)` | Reject with normalized error or handle safely | Throws uncaught `TypeError: Cannot read properties of null (reading 'limit')` | **FAIL / DEFECT CONFIRMED** |
| 1.3 | `pullOrders({ limit: -5 })` | Handle negative limit safely | Passes negative limit down to API query params | PASS |
| 1.4 | `pullOrders({ limit: 0 })` | Fallback to safe default limit | Safely defaults to `limit: 100` | PASS |
| 1.5 | `getOrder(undefined / null / '' / 0)` | Throw descriptive error | Rejects with `Fifozone OMS getOrder: orderId is required` | PASS |
| 1.6 | `getOrder('999999999')` | Return `null` when not found | Returns `null` cleanly | PASS |
| 1.7 | `updateOrder({}) / updateOrder(null)` | Reject missing target ID | Rejects with `A valid numeric orderId is required` | PASS |
| 1.8 | `resolveCategoryId(null / undefined / '')` | Return `null` safely | Returns `null` cleanly | PASS |
| 1.9 | `resolveSubCategoryId(null, null)` | Return `{ categoryId: null, subCategoryId: null }` | Returns `{ categoryId: null, subCategoryId: null }` | PASS |
| 1.10 | Corrupt category/image arrays | Sanitize & filter bad elements | Drops non-string, localhost, placeholder URLs cleanly | PASS |
| 2.1 | 30-level deep category hierarchy | Transform without recursion overflow | Transforms 30 levels cleanly, preserves depth | PASS |
| 2.2 | Category name with `&lt;Special Edition&gt;` | Decodes as `<Special Edition>` | Destructively stripped out by tag stripper | **FAIL / DEFECT CONFIRMED** |
| 2.3 | Corrupt tree nodes (null id/name) | Safe defaults without crash | Creates safe tree nodes with defaults | PASS |
| 3.1 | Transient 503 Service Unavailable | Retries with backoff and succeeds | Successfully retries 2 times and returns 200 OK | PASS |
| 3.2 | Transient `ECONNRESET` drop | Retries and succeeds | Successfully retries 1 time and returns 200 OK | PASS |
| 3.3 | 429 Rate Limit + `Retry-After: 0` | Waits and retries | Successfully retries after delay | PASS |
| 3.4 | 401 Header Auth Fallback | Retries once with `?oms_key=` | Injects `oms_key` query param and succeeds | PASS |
| 3.5 | Persistent 500 error exhausted | Rejects with `FifozoneOmsError` | Normalizes to `FifozoneOmsError` with status 500 | PASS |
| 4.1 | `pushStock` write safety (R3) | Mocked atomic payload | POST `/products/update` with SKU, qty, status | PASS |
| 4.2 | `pushPrice` write safety (R3) | Mocked atomic payload | POST `/products/update` with SKU and regular_price | PASS |
| 4.3 | `updateOrder` on partial failure | Throws error when `total_failed > 0` | Correctly catches failure and throws | PASS |
| 4.4 | `updateProduct` on API error response | Throws error | Falsely returns `{ success: true }` | **FAIL / DEFECT CONFIRMED** |
| 4.5 | `deleteProduct` on API error response | Throws error | Falsely returns `{ success: true }` | **FAIL / DEFECT CONFIRMED** |
| 4.6 | `normalizeOmsOrder` with `null` item | Skip null item or handle | Throws unhandled `TypeError` | **FAIL / DEFECT CONFIRMED** |
| 5.1 | Live read-only `testConnection()` | Connected, positive product count | HTTP 200, 13,599 products found, 335ms | PASS |
| 5.2 | Live read-only `pullProducts({ limit: 1 })` | Real product returned | Platform product returned with INR price | PASS |
| 5.3 | Live read-only `pullOrders({ limit: 1 })` | Real order schema verified | Normalized order returned with customer & items | PASS |
| 5.4 | Live read-only `getCategoryTree()` | Valid tree with pipe format | Top-level categories returned with children | PASS |
| 5.5 | Live read-only `getBrands({ limit: 5 })` | Valid brands list | Options format with label, value, key returned | PASS |
| 6.1 | 20 concurrent `resolveCategoryId` calls | Cache warmed without race condition | All 20 return 1640, single query issued | PASS |
| 6.2 | Cache invalidation methods | Reset maps and memoized trees | `clearCategoryCache` and `clearBrandsCache` clear state | PASS |

---

## 4. Unchallenged Areas
- Batch product upload scaling at maximum batch limit (500 items in single payload) was not tested with live data due to write restriction (R3). Mock testing confirmed array payload structure.
- In-depth HPOS refund and partial fee lines were not verified against live orders as none existed in the current 5 store orders.

---

## 5. Final Recommendation
**VERDICT: REJECT**.
The implementation in `server/src/services/fifozoneOms.service.js` must be corrected for Challenges 1 through 6 before Milestone 1 can be signed off.
