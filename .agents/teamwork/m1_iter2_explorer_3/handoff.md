# Handoff Report: Normalization & Boundary Safety Architecture

**Agent**: `m1_iter2_explorer_3` (teamwork_explorer)  
**Milestone**: M1 Iteration 2  
**Target File**: `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`  
**Working Directory**: `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_3\`

---

## 1. Observation

Direct code observations from `server/src/services/fifozoneOms.service.js`:

1. **`pullProducts(options = {})` at line 295 & 300**:
   ```javascript
   295:   async pullProducts(options = {}) {
   ...
   300:     const limit = options.limit || 500; // 500 items per batch (high speed, safe payload)
   301: 
   302:     try {
   ```
   Synchronous dereference `options.limit` executes before `try {` on line 302. In Node.js, `pullProducts(null)` throws verbatim:
   `TypeError: Cannot read properties of null (reading 'limit')`.

2. **`pullOrders(options = {})` at line 716 & 721**:
   ```javascript
   716:   async pullOrders(options = {}) {
   ...
   721:     const isSinglePage = options.page !== undefined && options.page !== null && !options.fetchAll;
   ...
   725:     try {
   ```
   Synchronous dereference `options.page` executes before `try {` on line 725. Calling `pullOrders(null)` throws verbatim:
   `TypeError: Cannot read properties of null (reading 'page')`.

3. **`normalizeOmsOrder(order)` at lines 617–621 and 643–645**:
   ```javascript
   617:     const customerName = billing.full_name ||
   618:       `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
   619:       shipping.full_name ||
   620:       `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
   621:       'Unknown Customer';
   ...
   643:     const rawItems = Array.isArray(order.items) ? order.items : [];
   644:     const items = rawItems.map(item => {
   645:       const qty = parseInt(item.quantity, 10) || 1;
   ```
   - `customerName` is not wrapped in `decodeHtml()`. Raw input `"M&amp;M Pets &amp; Grooming"` retains escaped HTML entities.
   - `rawItems.map` evaluates `item.quantity` without filtering truthy objects. If `order.items` contains `[null]`, it throws verbatim: `TypeError: Cannot read properties of null (reading 'quantity')`.
   - `parseInt(0, 10) || 1` evaluates to `1`. An item with `quantity: 0` (refunded/cancelled) is coerced to `quantity: 1`.

4. **`decodeHtml(str)` at lines 17–31**:
   ```javascript
   17: const decodeHtml = (str) => {
   18:   if (!str) return '';
   19:   let decoded = str
   ...
   27:     .replace(/&lt;/g, '<')
   28:     .replace(/&gt;/g, '>');
   30:   decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
   31:   return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
   32: };
   ```
   Entity replacement at lines 27–28 converts `&lt;Special Edition&gt;` to `<Special Edition>`. Subsequent regex `/<[^>]*>?/gm` at line 31 strips `<Special Edition>` as if it were an HTML markup tag, returning `"Dogs"` instead of `"Dogs <Special Edition>"`.

5. **Mutation Safety Barrier (Requirement R3)**:
   In `createClientInstance` (lines 60–96), there is no check for `process.env.NODE_ENV === 'test'`. Non-mocked mutating requests (`POST /products/update`, `POST /orders/update`, `POST /products/delete`) target the live store URL `https://fifozone.com/wp-json/oms/v1` with production key `oms_live_9f8d2b7e61a4c035824e87901bcdf562`.

---

## 2. Logic Chain

1. **Parameter Coercion**:
   - Observations 1 & 2 show that `options = {}` does not protect against explicit `null`.
   - Assigning `const opts = options || {};` immediately at function entry guarantees that `opts.limit`, `opts.page`, `opts.maxPages`, and other properties evaluate safely as `undefined` rather than throwing `TypeError`.

2. **Order Normalization Guarding**:
   - Observation 3 shows `rawItems.map` crashing when any item is `null`. Adding `.filter(item => item && typeof item === 'object')` guarantees that only valid item objects enter the mapper.
   - In JS, `0` is falsy. `parseInt("0", 10) || 1` yields `1`. Using `const parsedQty = parseInt(item.quantity, 10); const qty = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);` preserves `quantity: 0` while falling back to `1` for invalid or missing values.
   - Applying `decodeHtml(rawCustomerName)` on line 622 mirrors item name decoding on line 657, ensuring clean Unicode text in the database and invoices.

3. **HTML Decoder Order of Operations**:
   - Observation 4 demonstrates that replacing `&lt;` and `&gt;` before `replace(/<[^>]*>?/gm, '')` exposes bracketed text to the tag stripper.
   - By running the tag stripper *first*, genuine HTML tags (`<span>`, `<div>`) are removed while encoded text entities (`&lt;...&gt;`) remain encoded and untouched.
   - Running entity replacement *after* tag stripping decodes `&lt;Special Edition&gt;` into `<Special Edition>` cleanly without data loss.

4. **Runtime Mutation Barrier**:
   - Observation 5 shows live credentials without a test barrier.
   - Injecting an interceptor in `createClientInstance` that checks `process.env.NODE_ENV === 'test' && !process.env.ALLOW_LIVE_OMS_WRITES` intercepts `['post', 'put', 'patch', 'delete']` requests before network dispatch, rejecting with an explicit safety guard error and completely isolating the production store during automated testing.

---

## 3. Caveats

1. **Adversarial Test Suite Inversion**:
   In `server/tests/adversarial_stress.test.js`, tests 1.1, 1.2, 2.2, and 4.6 were written to assert the existence of the defects (`toThrow(TypeError)`, `expect(tree[0].title).toBe('Dogs')`). Once the code is corrected, these tests will fail until their assertions are updated to verify the fixed behavior.
2. **`shipping_lines` Array Compatibility**:
   Standard WooCommerce HPOS sends `shipping_lines` as an array `[{ total: "50.00" }]`. We provided the logic to calculate `shippingCharge` from array lines, but noted that test 1.14 in `server/tests/challenge_m1_normalization_cache.test.js` currently asserts `expect(normalized.shippingCharge).toBe(0)`. The test assertion should be updated alongside the implementation.
3. **Partitioned Explorer Scope**:
   Error extraction normalization (`_extractErrorMessage`) is owned by `m1_iter2_explorer_1`, and false-positive write validation (`updateProduct` / `deleteProduct` error unwrapping) is owned by `m1_iter2_explorer_2`. Our drop-in fixes integrate cleanly with both without overlapping.

---

## 4. Conclusion

The boundary and normalization defects in `fifozoneOms.service.js` are fully resolved by 4 drop-in code updates:

### Fix 1: Default Options Normalization
In `pullProducts` and `pullOrders`:
```javascript
const opts = options || {};
```
Replace all references to `options.limit`, `options.page`, `options.maxPages`, and parameter spreads with `opts.*`.

### Fix 2: `normalizeOmsOrder` Hardening
```javascript
// Customer name HTML decode
const rawCustomerName = billing.full_name ||
  `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
  shipping.full_name ||
  `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
  'Unknown Customer';
const customerName = decodeHtml(rawCustomerName);

// Item filtering and non-destructive quantity parsing
const rawItems = Array.isArray(order.items) ? order.items : [];
const items = rawItems
  .filter(item => item && typeof item === 'object')
  .map(item => {
    const parsedQty = parseInt(item.quantity, 10);
    const qty = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);
    const total = parseFloat(item.total || 0);
    const subtotal = parseFloat(item.subtotal || total);
    const unitPrice = qty > 0 ? parseFloat((total / qty).toFixed(2)) : total;
    ...
```

### Fix 3: `decodeHtml` Order of Operations
```javascript
const decodeHtml = (str) => {
  if (!str) return '';
  let clean = String(str).replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
  clean = clean.replace(/<[^>]*>?/gm, ''); // Strip real tags FIRST
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
    .replace(/&amp;/g, '&'); // Decode entities AFTER
  return clean.replace(/\n\s*\n/g, '\n\n').trim();
};
```

### Fix 4: Runtime Test Mutation Safety Barrier (Requirement R3)
In `createClientInstance`:
```javascript
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
```

---

## 5. Verification Method

### Automated Test Commands
1. **Normalization & Caching Test Suite**:
   ```powershell
   npm --prefix server test -- tests/challenge_m1_normalization_cache.test.js
   ```
2. **Adversarial Stress Test Suite**:
   ```powershell
   npm --prefix server test -- tests/adversarial_stress.test.js
   ```
3. **Core Fifozone OMS Test Suite**:
   ```powershell
   npm --prefix server test -- tests/fifozoneOms.test.js
   ```

### Concrete Assertion Checks
- `FifozoneOmsService.pullProducts(null)` resolves to an array without throwing `TypeError`.
- `FifozoneOmsService.pullOrders(null)` resolves to an array without throwing `TypeError`.
- `FifozoneOmsService.normalizeOmsOrder({ items: [null, { quantity: 0, total: '0.00' }] })` returns `{ items: [{ quantity: 0, unitPrice: 0 }] }`.
- `FifozoneOmsService.normalizeOmsOrder({ billing: { first_name: 'M&amp;M', last_name: 'Pets' } }).customer.name` returns `'M&M Pets'`.
- `decodeHtml('Dogs &lt;Special Edition&gt;')` returns `'Dogs <Special Edition>'`.
- An unmocked `FifozoneOmsService.pushStock('SKU-1', 10)` in `NODE_ENV=test` rejects with `[SAFETY GUARD] Blocked live POST request...`.

### Invalidation Conditions
- Any occurrence of `TypeError: Cannot read properties of null` when passing `null` options.
- Any coercion of `quantity: 0` to `quantity: 1`.
- Any loss of bracketed text when running `decodeHtml`.
