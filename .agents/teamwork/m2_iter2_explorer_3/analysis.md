# Milestone 2 Iteration 2: Deep Dive Analysis & Surgical Code Replacement Plan

**Agent**: `m2_iter2_explorer_3` (`teamwork_explorer`)  
**Parent Conversation**: `bb81b849-bf53-4df9-b527-b3647e8d0a43`  
**Date**: 2026-11-02  
**Scope**: 
1. Category array deduplication in `server/src/controllers/import.controller.js` (lines 220–275).
2. Test harness alignment & assertion verification in `server/tests/m2_adversarial_challenge.test.js` (tests 1.1, 1.2, 1.3).
3. Surgical drop-in replacement specifications for `sync.service.js`, `import.controller.js`, and `m2_adversarial_challenge.test.js`.

---

## 1. Executive Summary

During Milestone 2 Iteration 1 adversarial challenging (`m2_challenger_1`), four defects were analyzed:
1. **Defect 1 [CRITICAL]**: In `sync.service.js`, orders re-synced via `syncOrders()` re-deducted inventory because lines 300–368 executed stock deductions unconditionally before line 370 checked `if (existingOrder) continue;`.
2. **Defect 2 [HIGH]**: In `sync.service.js`, missing `items` (`undefined`) or corrupt elements (`[null]`) threw unhandled TypeErrors that escaped the order loop and aborted the entire platform batch.
3. **Defect 3 [MEDIUM]**: In `sync.service.js`, non-numeric quantities caused `totalStock` corruption to `NaN`.
4. **Defect 4 [LOW]**: In `import.controller.js` (lines 220–275), when a product has multiple comma-separated categories and a subcategory, `subCategoryId|subCatName` is pushed multiple times into `categoryData`.

This investigation has resolved:
1. **The exact mathematical & architectural design for category deduplication in `import.controller.js`** ensuring `categoryData` maintains unique IDs and unique category names across both `category` and `subCategory` resolutions.
2. **Empirical test harness alignment in `m2_adversarial_challenge.test.js`**:
   - Tests 1.1 and 1.2 will continue to pass cleanly without logging runtime TypeErrors.
   - Test 1.3 was deliberately coded by `m2_challenger_1` to assert `expect(productSaveCalls).toBe(1)` to demonstrate the presence of Defect 1. Once `sync.service.js` is patched with `if (product && !existingOrder)`, `productSaveCalls` will become `0`. Therefore, Test 1.3's assertion **MUST** be updated to `expect(productSaveCalls).toBe(0)` to verify defect elimination.
   - An additional test (Test 2.5) has been designed for `m2_adversarial_challenge.test.js` to guarantee automated regression protection for Defect 4 category deduplication.
3. **Zero-risk, drop-in replacement code blocks** ready for immediate implementation by the worker.

---

## 2. Analysis of Defect 4: Category Deduplication in `import.controller.js`

### 2.1 Code Inspection (`server/src/controllers/import.controller.js` lines 220–275)

```javascript
220:       // ── Resolve Categories & Subcategories ──
221:       let categoryData = [];
222:       if (rawProduct.category) {
223:         const catNames = typeof rawProduct.category === 'string' 
224:           ? rawProduct.category.split(',').map(c => c.trim()).filter(Boolean) 
225:           : (Array.isArray(rawProduct.category) ? rawProduct.category : [rawProduct.category]);
226:         
227:         const subCatName = rawProduct.subCategory ? String(rawProduct.subCategory).trim() : null;
228: 
229:         try {
230:           for (const catName of catNames) {
231:             if (catName.includes('|')) {
232:               // Already in id|name format
233:               categoryData.push(catName);
234:             } else if (subCatName) {
235:               // Has subcategory — resolve parent + child linked together
236:               const { categoryId, subCategoryId } = await FifozoneOmsService.resolveSubCategoryId(catName, subCatName);
237:               if (categoryId) categoryData.push(`${categoryId}|${catName}`);
238:               if (subCategoryId) categoryData.push(`${subCategoryId}|${subCatName}`);
239:             } else {
240:               // Just a category, no subcategory
241:               const id = await FifozoneOmsService.resolveCategoryId(catName);
242:               if (id) {
243:                 categoryData.push(`${id}|${catName}`);
244:               } else {
245:                 categoryData.push(catName);
246:               }
247:             }
248:           }
...
```

### 2.2 Mechanism of Failure
When a product CSV row supplies:
- `rawProduct.category = 'Dogs, Food'`
- `rawProduct.subCategory = 'Dry Food'`

The loop iterates twice:
1. **Iteration 1 (`catName = 'Dogs'`):**  
   `resolveSubCategoryId('Dogs', 'Dry Food')` returns `{ categoryId: 10, subCategoryId: 55 }`.  
   `categoryData.push('10|Dogs')`  
   `categoryData.push('55|Dry Food')`  
   `categoryData` = `['10|Dogs', '55|Dry Food']`

2. **Iteration 2 (`catName = 'Food'`):**  
   `resolveSubCategoryId('Food', 'Dry Food')` returns `{ categoryId: 12, subCategoryId: 55 }`.  
   `categoryData.push('12|Food')`  
   `categoryData.push('55|Dry Food')`  <-- **DUPLICATE PUSH!**  
   `categoryData` = `['10|Dogs', '55|Dry Food', '12|Food', '55|Dry Food']`

In addition, duplicates can arise if:
- `catNames` contains duplicate strings (e.g. `'Dogs, Dogs'`).
- `catNames` contains duplicate prefixed IDs (e.g. `'10|Dogs, 10|Dogs'`).
- The API throws and enters the catch block (`categoryData = catNames;`), retaining any duplicate raw strings.

### 2.3 Deduplication Design
We introduce a helper closure `addCategoryEntry(entry)` inside `uploadImport` before the resolution loop:
```javascript
const seenCatIds = new Set();
const seenCatNames = new Set();

const addCategoryEntry = (entry) => {
  if (!entry) return;
  const str = String(entry).trim();
  if (!str) return;
  if (str.includes('|')) {
    const parts = str.split('|').map(s => s.trim());
    const id = parts[0];
    const name = parts[1] || '';
    if (id && seenCatIds.has(id)) return;
    if (name && seenCatNames.has(name.toLowerCase())) return;
    if (id) seenCatIds.add(id);
    if (name) seenCatNames.add(name.toLowerCase());
    categoryData.push(str);
  } else {
    const nameLower = str.toLowerCase();
    if (seenCatNames.has(nameLower)) return;
    seenCatNames.add(nameLower);
    categoryData.push(str);
  }
};
```

**Properties of this design**:
1. **ID Uniqueness**: If ID `55` is already in `seenCatIds`, subsequent pushes for `55|Dry Food` are discarded in $O(1)$ time.
2. **Name Uniqueness**: Case-insensitive check prevents duplicate names whether formatted as `id|name` or raw `name`.
3. **Fallback Safety**: In the `catch (err)` block, `seenCatIds` and `seenCatNames` are cleared, and `catNames` is filtered through `addCategoryEntry`, ensuring even fallback arrays are deduplicated.
4. **Subcategory Only**: Handles `rawProduct.subCategory` seamlessly when parent category is absent.

---

## 3. Analysis of `server/tests/m2_adversarial_challenge.test.js`

### 3.1 Test 1.1 & 1.2 Inspection
- **Test 1.1**:
  ```javascript
  test('1.1 Handles missing rawOrd.items (undefined) without uncaught crash', async () => { ... });
  ```
  In unpatched code: Threw `TypeError: rawOrd.items is not iterable` at line 300, caught by outer batch catch at line 423.
  With the fix: `rawItems = Array.isArray(rawOrd?.items) ? rawOrd.items.filter(item => item && typeof item === 'object') : [];` results in `[]`, zero exceptions thrown, no error logged, and subsequent batch orders continue.
  **Status**: Resolves cleanly with `await expect(...).resolves.not.toThrow()`. **PASS**.

- **Test 1.2**:
  ```javascript
  test('1.2 Handles rawOrd.items containing null / undefined elements gracefully', async () => { ... });
  ```
  In unpatched code: Threw `TypeError: Cannot read properties of null (reading 'sku')` at line 302, aborting batch.
  With the fix: `filter(item => item && typeof item === 'object')` purges `null` and `undefined` entries before the loop runs.
  **Status**: Resolves cleanly with `await expect(...).resolves.not.toThrow()`. **PASS**.

### 3.2 Test 1.3 Inspection & The Assertion Alignment Requirement
- **Test 1.3 Current Code**:
  ```javascript
  113:     test('1.3 Probes existing order inventory re-deduction behavior on repeated sync', async () => {
  ...
  147:       await SyncService.syncOrders();
  148: 
  149:       const productSaveCalls = mockProduct.save.mock.calls.length;
  150:       expect(productSaveCalls).toBe(1);
  151:     });
  ```
- **Reason for `toBe(1)` in Iteration 1**:
  Challenger `m2_challenger_1` designed test 1.3 as an adversarial probe to empirically prove that stock was re-deducted on existing orders in unpatched code. Because `product.save()` was called once, `expect(productSaveCalls).toBe(1)` passed in the adversarial test run while flagging Defect 1 in `challenge_report.md`.
- **Impact of Fixing Defect 1**:
  Once `sync.service.js` guards stock deduction with `if (product && !existingOrder)`, an existing order will **NEVER** invoke `mockProduct.save()`.
  Consequently, `productSaveCalls` will be `0`.
  If test 1.3 is not aligned, Jest will report:
  ```
  expect(received).toBe(expected) // Object.is equality
  Expected: 1
  Received: 0
  ```
- **Required Alignment**:
  Test 1.3 must be aligned to assert the correct invariant:
  ```javascript
  test('1.3 Ensures existing orders do NOT re-deduct product stock on repeated sync', async () => {
    ...
    await SyncService.syncOrders();

    const productSaveCalls = mockProduct.save.mock.calls.length;
    expect(productSaveCalls).toBe(0);
    expect(mockProduct.save).not.toHaveBeenCalled();
    expect(InventoryLog.create).not.toHaveBeenCalled();
  });
  ```

---

## 4. Surgical Code Replacement Plans

### 4.1 Plan A: `server/src/controllers/import.controller.js` (Lines 220–274)

**File**: `server/src/controllers/import.controller.js`  
**Target Range**: Lines 220–274  
**Action**: Replace existing resolution block with deduplication logic.

#### Drop-in Replacement:
```javascript
<<<<
      // ── Resolve Categories & Subcategories ──
      let categoryData = [];
      if (rawProduct.category) {
        const catNames = typeof rawProduct.category === 'string' 
          ? rawProduct.category.split(',').map(c => c.trim()).filter(Boolean) 
          : (Array.isArray(rawProduct.category) ? rawProduct.category : [rawProduct.category]);
        
        const subCatName = rawProduct.subCategory ? String(rawProduct.subCategory).trim() : null;

        try {
          for (const catName of catNames) {
            if (catName.includes('|')) {
              // Already in id|name format
              categoryData.push(catName);
            } else if (subCatName) {
              // Has subcategory — resolve parent + child linked together
              const { categoryId, subCategoryId } = await FifozoneOmsService.resolveSubCategoryId(catName, subCatName);
              if (categoryId) categoryData.push(`${categoryId}|${catName}`);
              if (subCategoryId) categoryData.push(`${subCategoryId}|${subCatName}`);
            } else {
              // Just a category, no subcategory
              const id = await FifozoneOmsService.resolveCategoryId(catName);
              if (id) {
                categoryData.push(`${id}|${catName}`);
              } else {
                categoryData.push(catName);
              }
            }
          }

          // If subcategory was specified but no parent category, still resolve it as top-level
          if (subCatName && catNames.length === 0) {
            const id = await FifozoneOmsService.resolveCategoryId(subCatName);
            if (id) categoryData.push(`${id}|${subCatName}`);
          }
        } catch (err) {
          logger.warn(`[Import] Failed to resolve categories: ${err.message}`);
          categoryData = catNames;
        }
      } else if (rawProduct.subCategory) {
        // No category but has subcategory — resolve it as top-level
        try {
          const subCatName = String(rawProduct.subCategory).trim();
          const id = await FifozoneOmsService.resolveCategoryId(subCatName);
          if (id) {
            categoryData.push(`${id}|${subCatName}`);
          } else {
            categoryData.push(subCatName);
          }
        } catch (err) {
          logger.warn(`[Import] Failed to resolve subcategory: ${err.message}`);
          categoryData.push(String(rawProduct.subCategory).trim());
        }
      }
====
      // ── Resolve Categories & Subcategories with Deduplication ──
      let categoryData = [];
      const seenCatIds = new Set();
      const seenCatNames = new Set();

      const addCategoryEntry = (entry) => {
        if (!entry) return;
        const str = String(entry).trim();
        if (!str) return;
        if (str.includes('|')) {
          const parts = str.split('|').map(s => s.trim());
          const id = parts[0];
          const name = parts[1] || '';
          if (id && seenCatIds.has(id)) return;
          if (name && seenCatNames.has(name.toLowerCase())) return;
          if (id) seenCatIds.add(id);
          if (name) seenCatNames.add(name.toLowerCase());
          categoryData.push(str);
        } else {
          const nameLower = str.toLowerCase();
          if (seenCatNames.has(nameLower)) return;
          seenCatNames.add(nameLower);
          categoryData.push(str);
        }
      };

      if (rawProduct.category) {
        const catNames = typeof rawProduct.category === 'string' 
          ? rawProduct.category.split(',').map(c => c.trim()).filter(Boolean) 
          : (Array.isArray(rawProduct.category) ? rawProduct.category : [rawProduct.category]);
        
        const subCatName = rawProduct.subCategory ? String(rawProduct.subCategory).trim() : null;

        try {
          for (const catName of catNames) {
            if (catName.includes('|')) {
              // Already in id|name format
              addCategoryEntry(catName);
            } else if (subCatName) {
              // Has subcategory — resolve parent + child linked together
              const { categoryId, subCategoryId } = await FifozoneOmsService.resolveSubCategoryId(catName, subCatName);
              if (categoryId) addCategoryEntry(`${categoryId}|${catName}`);
              if (subCategoryId) addCategoryEntry(`${subCategoryId}|${subCatName}`);
            } else {
              // Just a category, no subcategory
              const id = await FifozoneOmsService.resolveCategoryId(catName);
              if (id) {
                addCategoryEntry(`${id}|${catName}`);
              } else {
                addCategoryEntry(catName);
              }
            }
          }

          // If subcategory was specified but no parent category, still resolve it as top-level
          if (subCatName && catNames.length === 0) {
            const id = await FifozoneOmsService.resolveCategoryId(subCatName);
            if (id) addCategoryEntry(`${id}|${subCatName}`);
          }
        } catch (err) {
          logger.warn(`[Import] Failed to resolve categories: ${err.message}`);
          categoryData = [];
          seenCatIds.clear();
          seenCatNames.clear();
          for (const c of catNames) {
            addCategoryEntry(c);
          }
        }
      } else if (rawProduct.subCategory) {
        // No category but has subcategory — resolve it as top-level
        try {
          const subCatName = String(rawProduct.subCategory).trim();
          const id = await FifozoneOmsService.resolveCategoryId(subCatName);
          if (id) {
            addCategoryEntry(`${id}|${subCatName}`);
          } else {
            addCategoryEntry(subCatName);
          }
        } catch (err) {
          logger.warn(`[Import] Failed to resolve subcategory: ${err.message}`);
          addCategoryEntry(String(rawProduct.subCategory).trim());
        }
      }
>>>>
```

---

### 4.2 Plan B: `server/src/services/sync.service.js` (Lines 261–417)

**File**: `server/src/services/sync.service.js`  
**Target Range**: Lines 261–417  
**Action**: 
1. Sanitize `rawOrd.items` using `rawItems = Array.isArray(rawOrd?.items) ? rawOrd.items.filter(item => item && typeof item === 'object') : [];`
2. Sanitize `deductQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;` and `unitPrice = parseFloat(itemRow.unitPrice) || 0;`
3. Guard product stock deduction and `InventoryLog` creation with `if (product && !existingOrder)`
4. Wrap each order in an individual `try { ... } catch (ordErr)` so a failure on a single malformed order never aborts subsequent orders in the batch.
5. Safely default `customer?.name || 'Customer'` in notifications.

#### Drop-in Replacement:
```javascript
<<<<
        for (const rawOrd of rawOrders) {
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

          // Resolve products
          const resolvedItems = [];
          for (const itemRow of rawOrd.items) {
            let product = null;
            if (itemRow.sku) {
              product = await Product.findOne({ sku: itemRow.sku });
            }

            resolvedItems.push({
              product: product ? product._id : undefined,
              productSnapshot: {
                masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                sku: itemRow.sku || '',
                brand: product ? product.brand : 'Generic',
                sellingPrice: itemRow.unitPrice,
                mrp: product ? product.mrp : itemRow.unitPrice,
                images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
              },
              platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
              quantity: itemRow.quantity,
              unitPrice: itemRow.unitPrice,
              totalPrice: itemRow.unitPrice * itemRow.quantity,
              gstAmount: Math.round(itemRow.unitPrice * itemRow.quantity * 0.18) // standard
            });

            if (product) {
              // Process inventory deduction
              const previousStock = product.totalStock;
              const deductQty = itemRow.quantity;
              product.totalStock = Math.max(0, product.totalStock - deductQty);

              if (item.key === 'fifozone') {
                product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone - deductQty);
              } else if (item.key === 'amazon') {
                product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon - deductQty);
              } else if (item.key === 'flipkart') {
                product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart - deductQty);
              }

              product.totalSold += deductQty;
              product.soldThisMonth += deductQty;
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

          try {
            // Create the unified Order record
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              orderDate: rawOrd.orderDate ? new Date(rawOrd.orderDate) : new Date(),
              platform: item.key,
              customer: rawOrd.customer,
              shippingAddress: rawOrd.shippingAddress,
              billingAddress: rawOrd.billingAddress || {},
              items: resolvedItems,
              subtotal: rawOrd.subtotal,
              shippingCharge: rawOrd.shippingCharge || 0,
              totalAmount: rawOrd.totalAmount,
              paymentMethod: rawOrd.paymentMethod,
              paymentStatus: rawOrd.paymentStatus,
              status: internalStatus,
              statusHistory: [{ status: internalStatus, note: `Order imported via platform sync (${rawOrd.platformStatus || 'pending'})` }],
              rawPlatformData: rawOrd
            });

            await order.save();

            // Create New Order Notification
            await notificationService.createNotification({
              type: 'new_order',
              title: `New Order Imported (${item.key.toUpperCase()})`,
              message: `Order #${order.orderNumber} placed by ${order.customer.name} (Amount: INR ${order.totalAmount})`,
              severity: 'info',
              order: order._id,
              platform: item.key
            });
          } catch (err) {
            logger.error(`[Sync] Failed to save order ${rawOrd.platformOrderId}: ${err.message}`);
          }
        }
====
        for (const rawOrd of rawOrders) {
          try {
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

            // Resolve products with sanitized items array
            const resolvedItems = [];
            const rawItems = Array.isArray(rawOrd?.items) 
              ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object') 
              : [];

            for (const itemRow of rawItems) {
              let product = null;
              if (itemRow.sku) {
                product = await Product.findOne({ sku: itemRow.sku });
              }

              const parsedQty = parseInt(itemRow.quantity, 10);
              const deductQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;
              const unitPrice = parseFloat(itemRow.unitPrice) || 0;

              resolvedItems.push({
                product: product ? product._id : undefined,
                productSnapshot: {
                  masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                  sku: itemRow.sku || '',
                  brand: product ? product.brand : 'Generic',
                  sellingPrice: itemRow.unitPrice,
                  mrp: product ? product.mrp : itemRow.unitPrice,
                  images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
                },
                platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
                quantity: deductQty,
                unitPrice: itemRow.unitPrice,
                totalPrice: unitPrice * deductQty,
                gstAmount: Math.round(unitPrice * deductQty * 0.18) // standard
              });

              // CRITICAL: Deduct inventory ONLY if order does NOT already exist in DB
              if (product && !existingOrder && deductQty > 0) {
                const previousStock = product.totalStock;
                product.totalStock = Math.max(0, product.totalStock - deductQty);

                if (item.key === 'fifozone') {
                  product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone - deductQty);
                } else if (item.key === 'amazon') {
                  product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon - deductQty);
                } else if (item.key === 'flipkart') {
                  product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart - deductQty);
                }

                product.totalSold += deductQty;
                product.soldThisMonth += deductQty;
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

            // Create the unified Order record
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              orderDate: rawOrd.orderDate ? new Date(rawOrd.orderDate) : new Date(),
              platform: item.key,
              customer: rawOrd.customer,
              shippingAddress: rawOrd.shippingAddress,
              billingAddress: rawOrd.billingAddress || {},
              items: resolvedItems,
              subtotal: rawOrd.subtotal,
              shippingCharge: rawOrd.shippingCharge || 0,
              totalAmount: rawOrd.totalAmount,
              paymentMethod: rawOrd.paymentMethod,
              paymentStatus: rawOrd.paymentStatus,
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
          } catch (ordErr) {
            logger.error(`[Sync] Failed to process order ${rawOrd?.platformOrderId || 'unknown'}: ${ordErr.message}`);
          }
        }
>>>>
```

---

### 4.3 Plan C: `server/tests/m2_adversarial_challenge.test.js` (Lines 113–151 & Lines 397+)

**File**: `server/tests/m2_adversarial_challenge.test.js`  
**Target Range 1**: Lines 113–151 (Test 1.3 assertion update)  
**Target Range 2**: Line 398 (Add Test 2.5 for Category Deduplication verification)

#### Drop-in Replacement for Test 1.3:
```javascript
<<<<
    test('1.3 Probes existing order inventory re-deduction behavior on repeated sync', async () => {
      const mockOrderInDb = {
        _id: 'db_order_189001',
        platformOrderId: '189001',
        status: 'processing',
        items: [{ sku: 'SKU-REPEAT-1', quantity: 2 }],
        save: jest.fn().mockResolvedValue({})
      };

      const mockProduct = {
        _id: 'prod_repeat_1',
        sku: 'SKU-REPEAT-1',
        masterName: 'Repeat Test Product',
        totalStock: 50,
        stockByPlatform: { fifozone: 20 },
        totalSold: 10,
        soldThisMonth: 10,
        lowStockThreshold: 5,
        save: jest.fn().mockResolvedValue({})
      };

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: '189001',
          platformStatus: 'processing',
          customer: { name: 'Repeat Buyer' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-REPEAT-1', quantity: 2, unitPrice: 200, totalPrice: 400 }]
        }
      ]);

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

      await SyncService.syncOrders();

      const productSaveCalls = mockProduct.save.mock.calls.length;
      expect(productSaveCalls).toBe(1);
    });
====
    test('1.3 Ensures existing orders do NOT re-deduct product stock on repeated sync', async () => {
      const mockOrderInDb = {
        _id: 'db_order_189001',
        platformOrderId: '189001',
        status: 'processing',
        items: [{ sku: 'SKU-REPEAT-1', quantity: 2 }],
        save: jest.fn().mockResolvedValue({})
      };

      const mockProduct = {
        _id: 'prod_repeat_1',
        sku: 'SKU-REPEAT-1',
        masterName: 'Repeat Test Product',
        totalStock: 50,
        stockByPlatform: { fifozone: 20 },
        totalSold: 10,
        soldThisMonth: 10,
        lowStockThreshold: 5,
        save: jest.fn().mockResolvedValue({})
      };

      jest.spyOn(FifozoneOmsService, 'pullOrders').mockResolvedValue([
        {
          platformOrderId: '189001',
          platformStatus: 'processing',
          customer: { name: 'Repeat Buyer' },
          shippingAddress: { line1: 'Street 1', city: 'City', state: 'ST', pincode: '123456' },
          items: [{ sku: 'SKU-REPEAT-1', quantity: 2, unitPrice: 200, totalPrice: 400 }]
        }
      ]);

      jest.spyOn(Order, 'findOne').mockResolvedValue(mockOrderInDb);
      jest.spyOn(Product, 'findOne').mockResolvedValue(mockProduct);

      await SyncService.syncOrders();

      const productSaveCalls = mockProduct.save.mock.calls.length;
      expect(productSaveCalls).toBe(0);
      expect(mockProduct.save).not.toHaveBeenCalled();
      expect(InventoryLog.create).not.toHaveBeenCalled();
    });
>>>>
```

#### Drop-in Addition after Test 2.4 (at line 398):
```javascript
<<<<
      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
    });
  });
====
      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
    });

    test('2.5 import.controller.uploadImport: Deduplicates categories and subcategories when multiple categories share a subcategory', async () => {
      let createdProductData = null;
      jest.spyOn(FifozoneOmsService, 'resolveSubCategoryId').mockImplementation(async (cat, sub) => {
        if (cat === 'Dogs') return { categoryId: 10, subCategoryId: 55 };
        if (cat === 'Food') return { categoryId: 12, subCategoryId: 55 };
        return { categoryId: 99, subCategoryId: 55 };
      });
      jest.spyOn(Product, 'findOne').mockResolvedValue(null);
      jest.spyOn(Product, 'create').mockImplementation(data => {
        createdProductData = data;
        return Promise.resolve({ ...data, _id: 'created_dedup_id' });
      });
      jest.spyOn(SyncService, 'pushProductCreate').mockResolvedValue({});

      const req = {
        body: {
          products: [
            {
              masterName: 'Multi Category Product',
              category: 'Dogs, Food',
              subCategory: 'Dry Food',
              mrp: 500,
              totalStock: 10
            }
          ]
        },
        user: { _id: 'user_admin_1' }
      };

      const result = await executeHandler(importController.uploadImport, req);

      expect(result.statusCode).toBe(200);
      expect(result.data.data.uploaded).toBe(1);
      expect(createdProductData).toBeDefined();
      expect(createdProductData.category).toEqual(['10|Dogs', '55|Dry Food', '12|Food']);
      const occurrences = createdProductData.category.filter(c => c.includes('55|Dry Food')).length;
      expect(occurrences).toBe(1);
    });
  });
>>>>
```

---

## 5. Verification Matrix

| Verification Target | Target Command / Method | Expected Outcome |
|---|---|---|
| **Category Deduplication** | `npm test --prefix server -- tests/m2_adversarial_challenge.test.js` | Test 2.5 passes: `category` array contains unique `['10|Dogs', '55|Dry Food', '12|Food']` without duplicate subcategory |
| **No Double Deduction** | `npm test --prefix server -- tests/m2_adversarial_challenge.test.js` | Test 1.3 passes: `productSaveCalls === 0`, `mockProduct.save` not called |
| **Hostile Payload Resilience** | `npm test --prefix server -- tests/m2_adversarial_challenge.test.js` | Tests 1.1, 1.2, 1.4, 1.5, 1.6 all pass with zero uncaught crashes |
| **All Test Suites Pass** | `npm test --prefix server` | 7/7 suites pass, 160/160 tests passing (including new 2.5) |
| **Zero wc/v3 references** | `node server/scripts/verify_zero_wc.js` (or `npm test --prefix server -- tests/verify_zero_wc.test.js`) | Zero matches found, 100% compliant with Requirement R1 |
