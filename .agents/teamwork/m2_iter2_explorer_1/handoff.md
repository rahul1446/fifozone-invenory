# Handoff Report: Milestone 2 Iteration 2 — Inventory Re-Deduction & Order Sync Lifecycle Analysis

**Agent**: `m2_iter2_explorer_1` (`teamwork_explorer`)  
**Parent Conversation**: `bb81b849-bf53-4df9-b527-b3647e8d0a43`  
**Date**: 2026-11-02  
**Status**: COMPLETE (Hard Handoff — Ready for Implementation)  

---

## 1. Observation

Direct observations, file paths, line numbers, test results, and verbatim code traces:

1. **Defect 1: Unconditional Inventory Deduction Before `existingOrder` Skip**:
   - In `server/src/services/sync.service.js`:
     - Line 283: `let existingOrder = await Order.findOne({ platformOrderId: rawOrd.platformOrderId });`
     - Lines 300–368: Iterates over `rawOrd.items`, fetches `Product.findOne({ sku })`, unconditionally executes:
       ```javascript
       const previousStock = product.totalStock;
       const deductQty = itemRow.quantity;
       product.totalStock = Math.max(0, product.totalStock - deductQty);
       product.totalSold += deductQty;
       await product.save();
       await InventoryLog.create({ ... });
       ```
     - Line 370:
       ```javascript
       if (existingOrder) {
          if (existingOrder.items.length === 0 && resolvedItems.length > 0) { ... }
          if (needsSave) { await existingOrder.save(); }
          continue;
       }
       ```
     - Verbatim test observation from `server/tests/m2_adversarial_challenge.test.js` (lines 149–150):
       `const productSaveCalls = mockProduct.save.mock.calls.length;`
       `expect(productSaveCalls).toBe(1);`
       This test passed because `mockProduct.save()` was actively executed when `Order.findOne` returned an existing database order.

2. **Defect 2: Missing Array Sanitization & Batch Abort Vulnerability**:
   - In `server/src/services/sync.service.js`:
     - Line 300: `for (const itemRow of rawOrd.items)`
     - When `rawOrd.items` is undefined: throws `TypeError: rawOrd.items is not iterable`.
     - When `rawOrd.items` contains `null`: line 302 `if (itemRow.sku)` throws `TypeError: Cannot read properties of null (reading 'sku')`.
     - Because line 300 is outside the per-order `try ... catch` (which only wrapped line 381 `order.save()`), any malformed order aborts the entire platform batch.

3. **Defect 3: Missing Tracking & Status Synchronization on Existing Orders**:
   - Lines 286–296 only checked `existingOrder.status !== internalStatus` and `!existingOrder.orderDate && rawOrd.orderDate`.
   - `FifozoneOmsService.normalizeOmsOrder()` provides `shippingTracking` with `trackingNumber`, `courierPartner`, and `trackingUrl`.
   - In the existing code, when an order transitions from `processing` to `shipped` in Fifozone OMS, the tracking number and carrier are never saved to `existingOrder`.

4. **Current Test Baseline**:
   - Execution command: `npm test --prefix server`
   - Result: `Test Suites: 7 passed, 7 total`, `Tests: 159 passed, 159 total`, `Time: 25.508 s`.

---

## 2. Logic Chain

1. **Tracing the Re-Deduction Loop**:
   - From Observation 1, background cron runs `syncOrders()` every 10 minutes (`server/src/jobs/index.js:15`).
   - `FifozoneOmsService.pullOrders()` fetches active orders (including `processing` orders).
   - Because lines 300–368 run before line 370, every periodic sync run executes `product.totalStock -= deductQty` and `InventoryLog.create()` for all items on every fetched existing order.
   - Therefore, over a 24-hour period, an active order will re-deduct product stock 144 times, artificially draining inventory to 0.

2. **Isolating Branches to Guarantee Zero Double-Deduction**:
   - Moving the `if (existingOrder)` check and update logic **above** the product deduction and order creation blocks ensures that existing orders never enter the product inventory deduction loop.
   - In the existing order branch, when `existingOrder` is detected:
     - Status updates and `statusHistory` logging occur.
     - `trackingNumber`, `courierPartner`, and `trackingUrl` from OMS are persisted.
     - `paymentStatus` is updated if changed in OMS.
     - `deliveredAt` is set when status transitions to `delivered`.
     - `existingOrder.save()` is awaited only when `needsSave === true`.
     - `continue` is executed immediately, completely bypassing product stock deductions and `InventoryLog` creation.

3. **Batch Isolation & Defensive Sanitization**:
   - Wrapping each order loop iteration in `try ... catch (orderErr)` ensures that an unexpected error on a single order is logged via `logger.error` and does not abort the remaining orders in the batch (resolving Observation 2).
   - Sanitizing `rawOrd.items` with `Array.isArray(rawOrd.items) ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object') : []` prevents `TypeError` crashes.
   - Parsing `itemRow.quantity` with `parseInt` and checking `deductQty > 0` guarantees `totalStock` is never corrupted to `NaN`.

---

## 3. Caveats

- **Test 1.3 in `m2_adversarial_challenge.test.js`**:
  Test 1.3 was originally authored by `m2_challenger_1` to empirically prove that `mockProduct.save()` was called (`expect(productSaveCalls).toBe(1)`). Once the fix is applied, `mockProduct.save()` will NOT be called (`productSaveCalls === 0`). Therefore, the implementer must update line 150 in `m2_adversarial_challenge.test.js` from `expect(productSaveCalls).toBe(1);` to `expect(productSaveCalls).toBe(0);` so the test suite verifies the fix instead of asserting the buggy behavior.
- No other caveats.

---

## 4. Conclusion

The inventory double-deduction bug and batch abort vulnerabilities are fully analyzed and root-caused. A surgical drop-in code replacement has been designed for `server/src/services/sync.service.js` (lines 259–417) that:
1. Completely stops stock deduction for existing orders.
2. Synchronizes status, statusHistory, tracking number, carrier, tracking URL, and payment status for existing orders.
3. Defensively sanitizes order items and quantities.
4. Wraps each order in a per-order `try ... catch` block to isolate batch processing.
5. Populates tracking details on new orders.

The complete code replacement is detailed in `c:\Users\uttim\Downloads\fi\.agents\teamwork\m2_iter2_explorer_1\analysis.md`.

---

## 5. Verification Method

To independently verify the fix after implementation:

1. **Verify Adversarial Challenge Suite**:
   ```powershell
   npm test --prefix server -- tests/m2_adversarial_challenge.test.js
   ```
   *Pass Criteria*: All tests pass, including test 1.3 asserting `productSaveCalls === 0` (zero product save calls for existing orders).

2. **Verify Consumer Migration Suite**:
   ```powershell
   npm test --prefix server -- tests/consumer_migration.test.js
   ```
   *Pass Criteria*: All 26 tests in `consumer_migration.test.js` pass.

3. **Verify Full Test Suite**:
   ```powershell
   npm test --prefix server
   ```
   *Pass Criteria*: 7 passed suites, 159 tests passing, 0 failures.

4. **Verify Zero wc/v3 References**:
   ```powershell
   node server/scripts/verify_zero_wc.js
   ```
   *Pass Criteria*: Exits 0, reports 0 `wc/v3` occurrences.
