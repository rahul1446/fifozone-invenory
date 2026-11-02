# Milestone 2 Iteration 2: Deep Technical Analysis
## Order Ingestion Lifecycle & Inventory Re-Deduction Defect Fix

**Author**: `m2_iter2_explorer_1` (`teamwork_explorer`)  
**Parent Conversation**: `bb81b849-bf53-4df9-b527-b3647e8d0a43`  
**Date**: 2026-11-02  
**Target Scope**: `server/src/services/sync.service.js` (Lines 259–417) & `server/tests/m2_adversarial_challenge.test.js` (Line 150)

---

## 1. Executive Summary & Root Cause

Milestone 2 Iteration 1 Gate was rejected due to an inventory data corruption vulnerability discovered during adversarial testing (`m2_challenger_1`). In `server/src/services/sync.service.js`, the order sync function `syncOrders()` iterates through orders returned by `FifozoneOmsService.pullOrders()` (and other platform services).

### Root Cause
Lines 300–368 executed product resolution, stock deductions (`product.totalStock -= deductQty`), `InventoryLog` creation, and low stock alert evaluations for every item in `rawOrd.items` **before** line 370 checked:
```javascript
if (existingOrder) {
  if (existingOrder.items.length === 0 && resolvedItems.length > 0) { ... }
  if (needsSave) { await existingOrder.save(); }
  continue;
}
```

Because Fifozone OMS orders in High-Performance Order Storage (HPOS) remain in `processing` status for hours or days, background cron (`server/src/jobs/index.js`, executing every 10 minutes) pulls the same orders repeatedly. On every 10-minute cycle:
1. `existingOrder` was found in MongoDB.
2. The loop nonetheless deducted item quantities from `product.totalStock` and incremented `product.totalSold`.
3. An audit log was written to `InventoryLog` for each deduction.
4. Line 370 skipped creating a new order, but the inventory was already depleted!

### Compounding Defects Discovered by Adversarial Testing
1. **Platform Batch Abort**: Direct iteration `for (const itemRow of rawOrd.items)` threw `TypeError` when `rawOrd.items` was `undefined` or contained `null` elements. Because this loop was outside the per-order `try ... catch`, a single corrupt order aborted the remaining 99 orders in the batch.
2. **NaN Stock Corruption**: `itemRow.quantity` was not validated as a positive integer. String or negative values caused `product.totalStock` to become `NaN` or concatenated strings into `totalSold`.
3. **Missing Tracking & Status Sync**: When existing orders transitioned from `processing` to `shipped` or `completed` in Fifozone OMS, tracking numbers, carriers, and tracking URLs delivered in `shippingTracking` were not synchronized to `existingOrder`.

---

## 2. Trace of Current Order Sync Execution

### Current Code Flow (`server/src/services/sync.service.js:259–417`)
```
[pullOrders()] ──> rawOrders array
   │
   ├── For each rawOrd in rawOrders:
   │     │
   │     ├── Maps platformStatus to internalStatus (lines 262–280)
   │     │
   │     ├── Queries Order.findOne({ platformOrderId }) (line 283)
   │     │     └── If existingOrder: updates status & date only (lines 286–296)
   │     │
   │     ├── Loops over rawOrd.items (line 300) ──> [BUG] NO existingOrder CHECK!
   │     │     ├── Product.findOne({ sku })
   │     │     ├── product.totalStock -= deductQty  <── DEDUCTED FOR EXISTING ORDERS!
   │     │     ├── product.totalSold += deductQty
   │     │     ├── product.save()
   │     │     └── InventoryLog.create(...)
   │     │
   │     ├── Checks if (existingOrder) (line 370)
   │     │     ├── Updates items if empty
   │     │     ├── existingOrder.save()
   │     │     └── continue; <── SKIPS ORDER CREATION, BUT INVENTORY ALREADY REDUCED!
   │     │
   │     └── [try...catch] Creates new Order record & notification (lines 381–416)
```

### Empirical Blast Radius
- If an order with 2 units of SKU `DROOLS-12KG` remains in `processing` status for 24 hours:
  - Background cron runs: `6 cycles/hour * 24 hours = 144 runs`.
  - Inventory deducted: `144 * 2 = 288 units` erroneously removed.
  - Product stock is wiped to `0`, triggering false Low Stock alerts and supplier reorders.

---

## 3. Architecture for the Fix

To permanently resolve this vulnerability and make `syncOrders()` production-resilient, the lifecycle is bifurcated into two independent, isolated branches:

```
[pullOrders()] ──> Array check & sanitize
   │
   ├── try: [PER-ORDER ISOLATION]
   │     │
   │     ├── 1. Normalize internal status & extract tracking metadata
   │     │
   │     ├── 2. Query Order.findOne({ platformOrderId })
   │     │
   │     ├── 3. BRANCH A: IF existingOrder ──> (EXISTING ORDER PIPELINE)
   │     │        ├── Synchronize status changes & append to statusHistory
   │     │        ├── Set deliveredAt timestamp if newly delivered
   │     │        ├── Update trackingNumber, courierPartner, trackingUrl from OMS
   │     │        ├── Update paymentStatus if changed
   │     │        ├── Backfill orderDate if missing
   │     │        ├── Backfill items if previously empty (WITHOUT stock deduction)
   │     │        ├── Save existingOrder if needsSave
   │     │        └── CONTINUE (Immediate exit — ZERO product deduction)
   │     │
   │     └── 4. BRANCH B: IF !existingOrder ──> (NEW ORDER INGESTION PIPELINE)
   │              ├── Sanitize items array (filter null / non-objects)
   │              ├── Validate & parse positive integer quantity (deductQty > 0)
   │              ├── Resolve products via Product.findOne({ sku })
   │              ├── Atomically deduct inventory for products (totalStock, stockByPlatform)
   │              ├── Increment totalSold, soldThisMonth, lastSoldAt
   │              ├── Write audit log to InventoryLog
   │              ├── Dispatch low_stock / out_of_stock alert if below threshold
   │              ├── Construct unified Order with customer/address fallbacks
   │              ├── Save new Order
   │              └── Dispatch new_order notification
   │
   └── catch (orderErr):
         Log error and CONTINUE to next order (Platform batch never aborts!)
```

### Key Architectural Guarantees
1. **Zero Double-Deduction Invariance**: Stock deduction and `InventoryLog` creation reside exclusively inside `Branch B (!existingOrder)`. An existing order can never trigger a deduction.
2. **Full Status & Fulfillment Synchronization**:
   - When an order transitions in Fifozone OMS (e.g., from `processing` to `shipped` or `completed`), `existingOrder.status` is updated.
   - Tracking details (`trackingNumber`, `courierPartner`, `trackingUrl`) from Fifozone OMS HPOS order `shipping_tracking` object are synchronized into `existingOrder`.
   - `statusHistory` records a clear audit trail of the transition.
   - If delivered, `deliveredAt` is timestamped.
3. **Platform Batch Isolation**: Each order in `rawOrders` is enclosed in its own `try ... catch`. An unhandled exception on order `i` logs a warning and allows orders `i+1..N` to process without failure.
4. **Item & Quantity Defensive Sanitization**:
   - `Array.isArray(rawOrd.items)` safely defaults to `[]`.
   - Elements are filtered for `item && typeof item === 'object'`.
   - `parseInt(itemRow.quantity, 10)` ensures non-numeric, negative, or invalid quantities never result in `NaN` or stock corruption.

---

## 4. Surgical Code Replacement Plan

### Target File
`server/src/services/sync.service.js`

### Target Range
Lines 259–417 (replace the `pullOrders()` result handling and order loop).

### Proposed Replacement Code

```javascript
        const rawOrders = await item.service.pullOrders();
        if (!Array.isArray(rawOrders) || rawOrders.length === 0) continue;

        for (const rawOrd of rawOrders) {
          try {
            if (!rawOrd || typeof rawOrd !== 'object') continue;

            let internalStatus = 'pending';
            if (item.key === 'fifozone' && rawOrd.platformStatus) {
              const stat = rawOrd.platformStatus.toLowerCase();
              if (stat === 'processing') internalStatus = 'processing';
              else if (stat === 'completed' || stat === 'delivered') internalStatus = 'delivered';
              else if (stat === 'shipped') internalStatus = 'shipped';
              else if (stat === 'cancelled') internalStatus = 'cancelled';
              else if (stat === 'failed') internalStatus = 'failed';
              else if (stat === 'refunded') internalStatus = 'refunded';
              else if (stat === 'checkout-draft') internalStatus = 'draft';
              else if (stat === 'packed') internalStatus = 'packed';
            } else if (rawOrd.platformStatus) {
              // Fallback mapping for other platforms if they send platformStatus
              const stat = rawOrd.platformStatus.toLowerCase();
              if (['processing', 'unshipped'].includes(stat)) internalStatus = 'processing';
              else if (['shipped', 'dispatched'].includes(stat)) internalStatus = 'shipped';
              else if (['delivered', 'completed'].includes(stat)) internalStatus = 'delivered';
              else if (['cancelled', 'failed', 'canceled'].includes(stat)) internalStatus = 'cancelled';
            }

            // Extract tracking & shipping details
            const trackingNum = rawOrd.shippingTracking?.trackingNumber || rawOrd.trackingNumber || '';
            const courier = rawOrd.shippingTracking?.courierPartner || rawOrd.courierPartner || '';
            const trackUrl = rawOrd.shippingTracking?.trackingUrl || rawOrd.trackingUrl || '';

            // Check if order already exists in DB
            let existingOrder = await Order.findOne({ platformOrderId: rawOrd.platformOrderId });

            // ── EXISTING ORDER BRANCH (Never deduct inventory) ───────────────
            if (existingOrder) {
              let needsSave = false;

              // 1. Status Update & Audit Trail
              if (existingOrder.status !== internalStatus) {
                const prevStatus = existingOrder.status;
                existingOrder.status = internalStatus;
                if (!Array.isArray(existingOrder.statusHistory)) {
                  existingOrder.statusHistory = [];
                }
                existingOrder.statusHistory.push({
                  status: internalStatus,
                  timestamp: new Date(),
                  note: `Status updated to ${rawOrd.platformStatus || internalStatus} via sync (was: ${prevStatus})`
                });
                if (internalStatus === 'delivered' && !existingOrder.deliveredAt) {
                  existingOrder.deliveredAt = new Date();
                }
                needsSave = true;
              }

              // 2. Order Date Backfill
              if (!existingOrder.orderDate && rawOrd.orderDate) {
                existingOrder.orderDate = new Date(rawOrd.orderDate);
                needsSave = true;
              }

              // 3. Tracking & Carrier Updates from OMS
              if (trackingNum && existingOrder.trackingNumber !== trackingNum) {
                existingOrder.trackingNumber = trackingNum;
                needsSave = true;
              }
              if (courier && existingOrder.courierPartner !== courier) {
                existingOrder.courierPartner = courier;
                needsSave = true;
              }
              if (trackUrl && existingOrder.trackingUrl !== trackUrl) {
                existingOrder.trackingUrl = trackUrl;
                needsSave = true;
              }

              // 4. Payment Status Update
              if (rawOrd.paymentStatus && existingOrder.paymentStatus !== rawOrd.paymentStatus) {
                existingOrder.paymentStatus = rawOrd.paymentStatus;
                needsSave = true;
              }

              // 5. Backfill items if previously empty (WITHOUT stock deduction)
              const rawItems = Array.isArray(rawOrd.items)
                ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object')
                : [];
              if (existingOrder.items.length === 0 && rawItems.length > 0) {
                const backfilledItems = [];
                for (const itemRow of rawItems) {
                  let product = null;
                  if (itemRow.sku) {
                    product = await Product.findOne({ sku: itemRow.sku });
                  }
                  const parsedQty = parseInt(itemRow.quantity, 10);
                  const qty = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;
                  const unitPrice = parseFloat(itemRow.unitPrice) || 0;
                  const totalPrice = parseFloat(itemRow.totalPrice) || (unitPrice * qty);

                  backfilledItems.push({
                    product: product ? product._id : undefined,
                    productSnapshot: {
                      masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                      sku: itemRow.sku || '',
                      brand: product ? product.brand : 'Generic',
                      sellingPrice: unitPrice,
                      mrp: product ? product.mrp : unitPrice,
                      images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
                    },
                    platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
                    quantity: qty,
                    unitPrice,
                    totalPrice,
                    gstAmount: Math.round(unitPrice * qty * 0.18)
                  });
                }
                existingOrder.items = backfilledItems;
                needsSave = true;
              }

              if (needsSave) {
                await existingOrder.save();
              }

              // Existing order handled safely — skip inventory deduction & creation
              continue;
            }

            // ── NEW ORDER BRANCH (Deduct inventory exactly once) ──────────────
            const rawItems = Array.isArray(rawOrd.items)
              ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object')
              : [];

            const resolvedItems = [];
            for (const itemRow of rawItems) {
              let product = null;
              if (itemRow.sku) {
                product = await Product.findOne({ sku: itemRow.sku });
              }

              const parsedQty = parseInt(itemRow.quantity, 10);
              const qty = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;
              const unitPrice = parseFloat(itemRow.unitPrice) || 0;
              const totalPrice = parseFloat(itemRow.totalPrice) || (unitPrice * qty);

              resolvedItems.push({
                product: product ? product._id : undefined,
                productSnapshot: {
                  masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                  sku: itemRow.sku || '',
                  brand: product ? product.brand : 'Generic',
                  sellingPrice: unitPrice,
                  mrp: product ? product.mrp : unitPrice,
                  images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
                },
                platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
                quantity: qty,
                unitPrice,
                totalPrice,
                gstAmount: Math.round(unitPrice * qty * 0.18)
              });

              if (product) {
                // Deduct inventory ONLY for new orders
                const deductQty = isNaN(parsedQty) || parsedQty <= 0 ? 0 : parsedQty;
                if (deductQty > 0) {
                  const previousStock = product.totalStock;
                  product.totalStock = Math.max(0, product.totalStock - deductQty);

                  if (product.stockByPlatform) {
                    if (item.key === 'fifozone' && typeof product.stockByPlatform.fifozone === 'number') {
                      product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone - deductQty);
                    } else if (item.key === 'amazon' && typeof product.stockByPlatform.amazon === 'number') {
                      product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon - deductQty);
                    } else if (item.key === 'flipkart' && typeof product.stockByPlatform.flipkart === 'number') {
                      product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart - deductQty);
                    }
                  }

                  product.totalSold = (product.totalSold || 0) + deductQty;
                  product.soldThisMonth = (product.soldThisMonth || 0) + deductQty;
                  product.lastSoldAt = new Date();

                  await product.save();

                  // Write Audit Log
                  await InventoryLog.create({
                    product: product._id,
                    productName: product.masterName,
                    sku: product.sku,
                    changeType: 'sale',
                    platform: item.key,
                    previousStock,
                    changeQuantity: -deductQty,
                    newStock: product.totalStock,
                    note: `Order sale deduction for ${rawOrd.platformOrderId}`
                  });

                  // Check Low Stock Thresholds
                  if (typeof product.lowStockThreshold === 'number' && product.totalStock <= product.lowStockThreshold) {
                    await notificationService.createNotification({
                      type: product.totalStock === 0 ? 'out_of_stock' : 'low_stock',
                      title: product.totalStock === 0 ? 'Product Out of Stock!' : 'Low Stock Alert!',
                      message: `Product [${product.masterName}] stock level is at ${product.totalStock} units (Threshold: ${product.lowStockThreshold})`,
                      severity: product.totalStock === 0 ? 'error' : 'warning',
                      product: product._id,
                      platform: 'internal'
                    });
                  }
                }
              }
            }

            // Create unified Order record
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              orderDate: rawOrd.orderDate ? new Date(rawOrd.orderDate) : new Date(),
              platform: item.key,
              customer: rawOrd.customer || { name: 'Unknown Customer' },
              shippingAddress: rawOrd.shippingAddress || { line1: 'N/A', city: 'Unknown', state: 'XX', pincode: '000000', country: 'India' },
              billingAddress: rawOrd.billingAddress || {},
              items: resolvedItems,
              subtotal: parseFloat(rawOrd.subtotal) || 0,
              shippingCharge: parseFloat(rawOrd.shippingCharge) || 0,
              totalAmount: parseFloat(rawOrd.totalAmount) || 0,
              paymentMethod: rawOrd.paymentMethod || 'Prepaid',
              paymentStatus: rawOrd.paymentStatus || 'pending',
              status: internalStatus,
              statusHistory: [{ status: internalStatus, timestamp: new Date(), note: `Order imported via platform sync (${rawOrd.platformStatus || 'pending'})` }],
              trackingNumber: trackingNum,
              courierPartner: courier,
              trackingUrl: trackUrl,
              rawPlatformData: rawOrd
            });

            await order.save();

            // Create New Order Notification
            await notificationService.createNotification({
              type: 'new_order',
              title: `New Order Imported (${item.key.toUpperCase()})`,
              message: `Order #${order.orderNumber} placed by ${order.customer?.name || 'Customer'} (Amount: INR ${order.totalAmount})`,
              severity: 'info',
              order: order._id,
              platform: item.key
            });
          } catch (orderErr) {
            logger.error(`[Sync] Failed to process order ${rawOrd?.platformOrderId || 'unknown'}: ${orderErr.message}`);
          }
        }
```

---

## 5. Companion Test Suite Alignment

### File: `server/tests/m2_adversarial_challenge.test.js`
At line 150:
```javascript
// BEFORE (probed the existence of the bug):
const productSaveCalls = mockProduct.save.mock.calls.length;
expect(productSaveCalls).toBe(1);

// AFTER (verifies the bug is fixed and stock is NOT deducted on re-sync):
const productSaveCalls = mockProduct.save.mock.calls.length;
expect(productSaveCalls).toBe(0);
```

---

## 6. Verification and Regression Plan

1. **Adversarial Test Suite Verification**:
   ```powershell
   npm test --prefix server -- tests/m2_adversarial_challenge.test.js
   ```
   *Expected*: All tests in section 1 passing:
   - 1.1 Handles missing `rawOrd.items` (undefined)
   - 1.2 Handles `rawOrd.items` with `null` elements
   - 1.3 Confirms zero `mockProduct.save` calls for existing orders (`productSaveCalls === 0`)
   - 1.4 Handles duplicate orders within batch
   - 1.5 Handles customer object missing name
   - 1.6 Handles non-numeric / negative quantities

2. **Consumer Migration Test Suite Verification**:
   ```powershell
   npm test --prefix server -- tests/consumer_migration.test.js
   ```
   *Expected*: All 26 consumer tests passing (including tests 2.2, 2.3, 2.4).

3. **Full Test Suite Execution**:
   ```powershell
   npm test --prefix server
   ```
   *Expected*: 7 passed suites, 159 tests passing, 0 failures.
