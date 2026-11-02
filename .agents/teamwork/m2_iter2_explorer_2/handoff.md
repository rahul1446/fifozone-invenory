# Handoff Report: SyncService Robust Sanitization & Per-Order Error Containment

**Agent**: `m2_iter2_explorer_2` (`teamwork_explorer`)  
**Parent Conversation**: `bb81b849-bf53-4df9-b527-b3647e8d0a43`  
**Date**: 2026-11-02  
**Handoff Type**: Hard Handoff (Investigation & Surgical Replacement Plan Complete)  
**Target File**: `server/src/services/sync.service.js`  
**Target Lines**: 259–418  

---

## 1. Observation

Direct empirical observations from `server/src/services/sync.service.js` and test logs:

1. **Defect 2 Observation (Unshielded `items` loop in `syncOrders`)**:
   - `server/src/services/sync.service.js` lines 299–304:
     ```javascript
     const resolvedItems = [];
     for (const itemRow of rawOrd.items) {
       let product = null;
       if (itemRow.sku) {
         product = await Product.findOne({ sku: itemRow.sku });
       }
     ```
   - When `rawOrd.items` is `undefined`: throws `TypeError: rawOrd.items is not iterable`.
   - When `rawOrd.items` contains `null`: line 302 throws `TypeError: Cannot read properties of null (reading 'sku')`.
   - In `tests/m2_adversarial_challenge.test.js` tests 1.1 and 1.2, this TypeError was logged directly from the outer platform catch handler (line 424):
     ```
     [2026-11-02 22:43:37] error: Error syncing orders for fifozone: rawOrd.items is not iterable
     [2026-11-02 22:43:37] error: Error syncing orders for fifozone: Cannot read properties of null (reading 'sku')
     ```
   - Because the outer catch handler terminated the loop, `PlatformSync.findOneAndUpdate` at line 419 was never called, and any subsequent valid orders in `rawOrders` were aborted.

2. **Defect 3 Observation (Non-numeric `itemRow.quantity` NaN pollution)**:
   - `server/src/services/sync.service.js` lines 317–338:
     ```javascript
     quantity: itemRow.quantity,
     unitPrice: itemRow.unitPrice,
     totalPrice: itemRow.unitPrice * itemRow.quantity,
     gstAmount: Math.round(itemRow.unitPrice * itemRow.quantity * 0.18)
     ...
     const deductQty = itemRow.quantity;
     product.totalStock = Math.max(0, product.totalStock - deductQty);
     ...
     product.totalSold += deductQty;
     ```
   - When `itemRow.quantity` is `'invalid'`:
     - `deductQty = 'invalid'`
     - `product.totalStock = Math.max(0, 50 - 'invalid')` -> `Math.max(0, NaN)` -> `NaN`.
     - `product.totalSold += 'invalid'` -> `"10invalid"` (string concatenation).
     - `totalPrice` and `gstAmount` evaluate to `NaN`.
     - `await product.save()` persists `NaN` into MongoDB.

3. **Per-Order Containment Observation**:
   - In `server/src/services/sync.service.js` lines 261–418:
     - Lines 262–380 contain zero `try/catch` coverage.
     - Only lines 381–416 (`order.save()`) are wrapped in `try { ... } catch (err)`.
     - Any exception in status resolution, customer data access, product lookups, stock updates, or inventory logging bubbles directly to line 423, terminating the entire batch.

4. **Baseline Test Execution**:
   - Executing `npm test --prefix server` passed 7/7 test suites and 159/159 tests.
   - However, console logs from test 1.1 and 1.2 confirmed that the batch crashed internally and was only caught at the top-level platform block.

---

## 2. Logic Chain

1. **Defect 2 Causation & Containment**:
   - Observation 1 demonstrates that iterating over `rawOrd.items` without type checking or null-filtering causes synchronous TypeErrors on malformed payloads.
   - Because this iteration occurs before the inner `order.save()` try/catch, the exception propagates to the platform-level catch block.
   - Therefore, extracting `const rawItems = Array.isArray(rawOrd.items) ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object') : [];` guarantees `rawItems` is always an iterable array containing only non-null objects.
   - Enclosing the entire order iteration inside `try ... catch (orderError)` guarantees that even if an unforeseen error occurs on order $i$, order $i+1$ will continue processing without crashing the batch.

2. **Defect 3 Causation & Coercion Safeguards**:
   - Observation 2 demonstrates that non-integer, non-numeric, or negative `itemRow.quantity` directly propagates into arithmetic operations, creating `NaN` values and string concatenation.
   - Parsing via `const parsedQty = parseInt(itemRow.quantity, 10);` and defaulting with `const quantity = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;` guarantees a strictly non-negative integer.
   - Guarding inventory deduction with `quantity > 0` ensures that malformed items with 0 or negative quantities never mutate stock or generate bogus audit logs.
   - Sanitizing monetary fields (`parseFloat(unitPrice) || 0`, `parseFloat(totalPrice) || (unitPrice * quantity)`) prevents any `NaN` values from entering `Order` documents.

3. **Synthesis with Defect 1 (Inventory Re-deduction)**:
   - In coordination with `m2_iter2_explorer_1`, guarding stock deduction with `if (product && !existingOrder && quantity > 0)` ensures that existing orders never re-deduct stock, while new orders are deducted safely with verified non-negative quantities.

---

## 3. Caveats

- **Existing Data**: If MongoDB already contains products with `totalStock: NaN` from previous unhandled runs, our proposed code guards against further corruption using `Number(product.totalStock) || 0`, which treats pre-existing `NaN` as `0`. A separate data migration or admin recalculation may be needed if live store stock was previously corrupted in non-test databases.
- **Zero-Quantity Order Items**: If an external platform legitimately sends an order item with `quantity: 0` (e.g. promotional gift or cancelled line item), it will be ingested into `Order.items` with `quantity: 0`, and inventory deduction will be cleanly skipped.
- No other caveats.

---

## 4. Conclusion

The recommended drop-in replacement completely eliminates Defect 2 and Defect 3 while providing robust per-order fault containment:
1. `rawOrd.items` is safely coerced to an array and filtered for non-null objects.
2. `quantity` is strictly parsed as a non-negative integer fallback, preventing `NaN` pollution in `product.totalStock` and string concatenation in `product.totalSold`.
3. The entire processing of each individual order is wrapped in a per-order `try ... catch` block, logging a warning and continuing to subsequent orders if any malformed order is encountered.
4. Product stock deduction is safely guarded with `if (product && !existingOrder && quantity > 0)`.

### Concrete Drop-in Replacement for Implementer (`server/src/services/sync.service.js` lines 259–418):

```javascript
        const rawOrders = await item.service.pullOrders();
        const ordersList = Array.isArray(rawOrders) ? rawOrders : [];

        for (const rawOrd of ordersList) {
          try {
            if (!rawOrd || typeof rawOrd !== 'object') {
              logger.warn(`[Sync] Skipping malformed order in ${item.key}: payload is not an object`);
              continue;
            }

            if (!rawOrd.platformOrderId) {
              logger.warn(`[Sync] Skipping order in ${item.key}: missing platformOrderId`);
              continue;
            }

            let internalStatus = 'pending';
            if (item.key === 'fifozone' && rawOrd.platformStatus) {
              const stat = String(rawOrd.platformStatus).toLowerCase();
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
              const stat = String(rawOrd.platformStatus).toLowerCase();
              if (['processing', 'unshipped'].includes(stat)) internalStatus = 'processing';
              else if (['shipped', 'dispatched'].includes(stat)) internalStatus = 'shipped';
              else if (['delivered', 'completed'].includes(stat)) internalStatus = 'delivered';
              else if (['cancelled', 'failed', 'canceled'].includes(stat)) internalStatus = 'cancelled';
            }

            // Check if order already exists in DB
            let existingOrder = await Order.findOne({ platformOrderId: rawOrd.platformOrderId });
            let needsSave = false;

            if (existingOrder) {
              if (existingOrder.status !== internalStatus) {
                existingOrder.status = internalStatus;
                existingOrder.statusHistory.push({ status: internalStatus, note: `Status updated to ${rawOrd.platformStatus} via sync` });
                needsSave = true;
              }
              if (!existingOrder.orderDate && rawOrd.orderDate) {
                existingOrder.orderDate = new Date(rawOrd.orderDate);
                needsSave = true;
              }
            }

            // Robust sanitization for rawOrd.items: safe array extraction, filtering out non-object/null items
            const rawItems = Array.isArray(rawOrd.items)
              ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object')
              : [];

            // Resolve products
            const resolvedItems = [];
            for (const itemRow of rawItems) {
              let product = null;
              if (itemRow.sku) {
                product = await Product.findOne({ sku: itemRow.sku });
              }

              // Robust parsing for quantity and monetary fields
              const parsedQty = parseInt(itemRow.quantity, 10);
              const quantity = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;

              const parsedPrice = parseFloat(itemRow.unitPrice);
              const unitPrice = (!isNaN(parsedPrice) && parsedPrice >= 0) ? parsedPrice : 0;

              const parsedTotal = parseFloat(itemRow.totalPrice);
              const totalPrice = (!isNaN(parsedTotal) && parsedTotal >= 0) ? parsedTotal : Math.round(unitPrice * quantity * 100) / 100;
              const gstAmount = Math.round(unitPrice * quantity * 0.18);

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
                quantity,
                unitPrice,
                totalPrice,
                gstAmount
              });

              // Guard inventory deduction: ONLY deduct for new orders (!existingOrder) with quantity > 0
              if (product && !existingOrder && quantity > 0) {
                // Process inventory deduction
                const previousStock = Number(product.totalStock) || 0;
                const deductQty = quantity;
                product.totalStock = Math.max(0, previousStock - deductQty);

                if (!product.stockByPlatform) {
                  product.stockByPlatform = {};
                }
                if (item.key === 'fifozone') {
                  product.stockByPlatform.fifozone = Math.max(0, (Number(product.stockByPlatform.fifozone) || 0) - deductQty);
                } else if (item.key === 'amazon') {
                  product.stockByPlatform.amazon = Math.max(0, (Number(product.stockByPlatform.amazon) || 0) - deductQty);
                } else if (item.key === 'flipkart') {
                  product.stockByPlatform.flipkart = Math.max(0, (Number(product.stockByPlatform.flipkart) || 0) - deductQty);
                }

                product.totalSold = (Number(product.totalSold) || 0) + deductQty;
                product.soldThisMonth = (Number(product.soldThisMonth) || 0) + deductQty;
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
                if (product.totalStock <= product.lowStockThreshold) {
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

            if (existingOrder) {
              if (existingOrder.items.length === 0 && resolvedItems.length > 0) {
                existingOrder.items = resolvedItems;
                needsSave = true;
              }
              if (needsSave) {
                await existingOrder.save();
              }
              continue;
            }

            // Create the unified Order record for new orders
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              orderDate: rawOrd.orderDate ? new Date(rawOrd.orderDate) : new Date(),
              platform: item.key,
              customer: rawOrd.customer || {},
              shippingAddress: rawOrd.shippingAddress || {},
              billingAddress: rawOrd.billingAddress || {},
              items: resolvedItems,
              subtotal: Number(rawOrd.subtotal) || 0,
              shippingCharge: Number(rawOrd.shippingCharge) || 0,
              totalAmount: Number(rawOrd.totalAmount) || 0,
              paymentMethod: rawOrd.paymentMethod || 'Unknown',
              paymentStatus: rawOrd.paymentStatus || 'pending',
              status: internalStatus,
              statusHistory: [{ status: internalStatus, note: `Order imported via platform sync (${rawOrd.platformStatus || 'pending'})` }],
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
          } catch (orderError) {
            logger.warn(`[Sync] Failed processing order ${rawOrd?.platformOrderId || 'unknown'} for ${item.key}: ${orderError.message}`);
          }
        }
```

---

## 5. Verification Method

To independently verify after implementation:

1. **Run Adversarial Challenge Suite**:
   ```powershell
   npm test --prefix server -- tests/m2_adversarial_challenge.test.js
   ```
   *Expected*: Tests 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 all pass cleanly without uncaught errors or platform batch aborts.

2. **Run Full Server Test Suite**:
   ```powershell
   npm test --prefix server
   ```
   *Expected*: `Test Suites: 7 passed, 7 total`, `Tests: 159 passed, 159 total`.

3. **Verify Zero Regressions on Zero-WC Scanner**:
   ```powershell
   npm test --prefix server -- tests/verify_zero_wc.test.js
   ```
   *Expected*: Zero unintended changes, passing cleanly.
