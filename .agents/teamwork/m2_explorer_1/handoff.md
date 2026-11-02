# Handoff Report: Milestone 2 — Consumer Migration for `server/src/services/sync.service.js`

**Agent**: `m2_explorer_1`  
**Working Directory**: `c:\Users\uttim\Downloads\fi\.agents\teamwork\m2_explorer_1\`  
**Date**: 2026-11-02  
**Handoff Type**: Hard (Investigation complete, actionable surgical plan ready)

---

## 1. Observation

1. **`server/src/services/sync.service.js` Imports and References**:
   Direct inspection and grep across `server/src/services/sync.service.js` identified exactly three lines referencing `WooCommerceService`:
   - Line 1: `const WooCommerceService = require('./woocommerce.service');`
   - Line 38: `WooCommerceService.clearCategoryCache();`
   - Line 249: `{ service: WooCommerceService, key: 'fifozone' },` inside the `platforms` array of `syncOrders()`.

2. **Existing OMS Capabilities in `FifozoneOmsService` (`server/src/services/fifozoneOms.service.js`)**:
   - `pullOrders(options = {})`: Lines 798–856. Ingests HPOS orders via `GET /orders`, paginating up to 500 items per request, and calls `normalizeOmsOrder(order)`.
   - `normalizeOmsOrder(order)`: Lines 688–795. Returns objects containing `platformOrderId`, `number`, `platformStatus`, `orderDate`, `customer` (with HTML decoding and shipping/billing fallbacks), `shippingAddress`, `billingAddress`, `items` (with unitPrice, quantity, SKU, platformProductId), `subtotal`, `shippingCharge`, `totalAmount`, `paymentMethod`, `paymentStatus`, `shippingTracking`, and `raw`.
   - `clearCategoryCache()`: Lines 1025–1030. In-memory cache reset that clears `_categoryCache` and `_categoryTreeCache`.
   - `updateOrder(orderId, updateData)`: Lines 879–940. Dispatches fulfillment status and tracking updates to `POST /orders/update`.

3. **Background Jobs (`server/src/jobs/index.js`)**:
   - Line 2: `const SyncService = require('../services/sync.service');`
   - Line 18: `await SyncService.syncOrders();` (inside 10-minute cron schedule)
   - Line 28: `await SyncService.syncProducts();` (inside 1-hour cron schedule)
   - Direct grep confirmed that `server/src/jobs/index.js` **does not** import or call `woocommerce.service.js`.

4. **Order Status Handling Across Callers (`server/src/controllers/order.controller.js`)**:
   - `updateOrderStatus` (lines 104–203) updates MongoDB orders and calls `SyncService.pushStockToPlatforms(product)` on cancellation.
   - It does not invoke `WooCommerceService` directly.

5. **Existing Automated Test Suite**:
   - Running `npm test --prefix server` executed 4 test suites (`fifozoneOms.test.js`, `verify_zero_wc.test.js`, `adversarial_stress.test.js`, `challenge_m1_normalization_cache.test.js`), resulting in:
     `Test Suites: 4 passed, 4 total; Tests: 99 passed, 99 total`.
   - Unit tests in `server/tests/fifozoneOms.test.js` (lines 257–315) explicitly verify that `FifozoneOmsService.pullOrders()` normalizes OMS orders to match internal Order schema expectations.

---

## 2. Logic Chain

1. **Decoupling Feasibility**:
   From Observation 1, `sync.service.js` references `WooCommerceService` in only 3 locations: the module import (line 1), category cache clearing (line 38), and order pulling provider registration (line 249).
   All other outbound mutations (`pushStock`, `pushPrice`, `pushProductCreate`, `pushProductUpdate`, `pushProductDelete`) and catalog pulling (`syncProducts`) already target `FifozoneOmsService`.
   Therefore, removing line 1 and updating lines 38 and 249 completely decouples `sync.service.js` from `woocommerce.service.js`.

2. **Order Ingestion Compatibility**:
   From Observation 2, `FifozoneOmsService.pullOrders()` normalizes orders into the exact fields consumed by `syncOrders()`:
   - `platformOrderId` (String) matches the unique index in `Order.model.js`.
   - `customer` contains required `name` alongside `email` and `phone`.
   - `shippingAddress` contains required `line1`, `city`, `state`, `pincode`.
   - `items` array contains `sku`, `name`, `unitPrice`, `quantity`, and `platformProductId`.
   - `totalAmount` and `subtotal` are non-negative floats.
   Therefore, switching line 249 from `WooCommerceService` to `FifozoneOmsService` preserves 100% of the downstream deduplication, inventory deduction, and MongoDB creation logic.

3. **Category Cache Parity**:
   From Observation 2, `FifozoneOmsService.clearCategoryCache()` provides an identical interface to `WooCommerceService.clearCategoryCache()`. Replacing the invocation on line 38 guarantees that any category cache maintained by the OMS service is refreshed at the start of product sync.

4. **Background Job Continuity**:
   From Observation 3, background cron jobs call `SyncService.syncOrders()` and `SyncService.syncProducts()`. Because `sync.service.js` is the sole entry point for background order and product sync, updating `sync.service.js` migrates the cron jobs without modifying `server/src/jobs/index.js`.

---

## 3. Caveats

1. **Log String Cleanup**:
   `server/src/jobs/index.js` contains two informational log messages mentioning "WooCommerce" on lines 171 and 188 (`Restored original WooCommerce prices`, `Review Sync from WooCommerce`). These strings do not call any APIs or violate forbidden regex patterns in `server/scripts/verify_zero_wc.js`, but should be cleaned up during Milestone 3.
2. **MongoDB Database Dependency in Production**:
   `syncOrders()` requires an active MongoDB connection when run live to find and save `Order` records. In unit tests, Mongoose methods must be mocked or executed against an in-memory database.
3. **Write Protection in Test Mode**:
   `FifozoneOmsService` enforces a test safety guard (`process.env.NODE_ENV === 'test'`) preventing mutating requests to the live store unless mocked. Unit tests for `syncOrders` that trigger `Product.save()` or `pushStockToPlatforms` must ensure network mutations are safely stubbed.

---

## 4. Conclusion

`server/src/services/sync.service.js` can be fully migrated to `FifozoneOmsService` by executing 6 surgical changes:
1. Delete line 1 (`const WooCommerceService = require('./woocommerce.service');`).
2. Replace line 38 with `FifozoneOmsService.clearCategoryCache();`.
3. Replace line 249 with `{ service: FifozoneOmsService, key: 'fifozone' },`.
4. Align credential check on line 257 to use `const isOmsPlatform = item.key === 'fifozone' && !!(process.env.FIFOZONE_OMS_API_KEY || FifozoneOmsService.apiKey);`.
5. Enhance status translation mapping on line 267 to support `'completed' || 'delivered'` and `'shipped'`.
6. Add `pushOrderUpdate(orderId, updateData)` wrapper to `SyncService` to unify order fulfillment updates.

These changes achieve zero remaining calls to `WooCommerceService` in `sync.service.js`, maintain 100% functional compatibility with order and catalog sync workflows, and require zero modifications to background cron jobs.

---

## 5. Verification Method

1. **Syntax and Import Verification**:
   Verify that `server/src/services/sync.service.js` contains no references to `woocommerce.service.js`:
   ```bash
   grep -n "woocommerce.service" server/src/services/sync.service.js
   ```
   *Expected result*: 0 matches.

2. **Automated Test Suite Execution**:
   Run the full Jest test suite:
   ```bash
   npm test --prefix server
   ```
   *Expected result*: All 4 test suites pass (99 tests passed, 0 failures).

3. **Zero-WooCommerce Codebase Scanner**:
   Run the Milestone 4 audit scanner:
   ```bash
   node server/scripts/verify_zero_wc.js
   ```
   *Expected result*: Verifies no forbidden `wc/v3` or legacy client instantiations are introduced in `sync.service.js`.

4. **Functional Order Ingestion Test**:
   Execute a simulated sync test script (mocking `FifozoneOmsService.pullOrders()` with sample HPOS orders) and verify:
   - `Order` document is created in MongoDB with mapped fields.
   - Associated `Product.totalStock` is decremented by ordered item quantity.
   - An `InventoryLog` entry is generated with `changeType: 'sale'`.
