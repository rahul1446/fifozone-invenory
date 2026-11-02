# Technical Analysis Report: Milestone 2 — Import Controller and Settings Migration

## Executive Summary
This investigation analyzes the migration of `server/src/controllers/import.controller.js`, `server/src/models/Settings.model.js`, and `server/src/controllers/settings.controller.js` from the legacy `WooCommerceService` (`wc/v3`) to `server/src/services/fifozoneOms.service.js` (`https://fifozone.com/wp-json/oms/v1`).

The investigation confirms:
1. `import.controller.js` has 7 legacy references to `WooCommerceService` (including client acquisition and category resolution calls), plus a legacy comment/log string referencing WooCommerce push.
2. `FifozoneOmsService` already implements drop-in replacements for `resolveCategoryId(name, parentId)` and `resolveSubCategoryId(categoryName, subCategoryName)` with built-in in-memory caching and TTL expiration (`60 * 60 * 1000`), making external `client` acquisition unnecessary.
3. `Settings.model.js` currently defines a `woocommerce` sub-schema but lacks a `fifozoneOms` schema. It must be updated to store `{ baseURL, apiKey, isConfigured }` while maintaining non-breaking coexistence for existing DB documents.
4. `settings.controller.js` currently processes `woocommerce` credentials and provides connection testing only for `shiprocket`. It must be extended to accept, persist, and validate `fifozoneOms` credentials, alongside an OMS connection test endpoint.
5. Automated test infrastructure (`server/tests/`) passes all 99 tests; dedicated unit tests for import category resolution and settings management should be added during implementation.

---

## 1. Import Controller Audit (`server/src/controllers/import.controller.js`)

### 1.1 Legacy WooCommerce References
In `server/src/controllers/import.controller.js`:
- **Line 8**: Module import:
  ```javascript
  const WooCommerceService = require('../services/woocommerce.service');
  ```
- **Line 230**: Unnecessary legacy REST client acquisition:
  ```javascript
  const client = await WooCommerceService.getClient();
  ```
- **Line 237**: Subcategory resolution with client passed:
  ```javascript
  const { categoryId, subCategoryId } = await WooCommerceService.resolveSubCategoryId(client, catName, subCatName);
  ```
- **Line 242**: Category ID resolution with client passed:
  ```javascript
  const id = await WooCommerceService.resolveCategoryId(client, catName);
  ```
- **Line 253**: Fallback top-level category resolution with client passed:
  ```javascript
  const id = await WooCommerceService.resolveCategoryId(client, subCatName);
  ```
- **Line 263**: Second unnecessary client acquisition:
  ```javascript
  const client = await WooCommerceService.getClient();
  ```
- **Line 265**: Standalone subcategory resolution with client passed:
  ```javascript
  const id = await WooCommerceService.resolveCategoryId(client, subCatName);
  ```
- **Lines 393–396**: Misleading comment and log referencing WooCommerce:
  ```javascript
  // Push to WooCommerce asynchronously (don't await — keep import fast)
  SyncService.pushProductCreate(product).catch(e =>
    logger.error(`[Import] WooCommerce push failed for "${productName}": ${e.message}`)
  );
  ```

### 1.2 Category Resolution Flow in CSV/Excel Import
The import process (`uploadImport`) processes products sequentially:
1. `rawProduct.category` is parsed into an array of names (`catNames`).
2. `rawProduct.subCategory` is extracted if present.
3. For each category:
   - If `catName.includes('|')`, it is already composite (`"id|name"` format) and is appended directly.
   - If `subCatName` is present, it resolves both parent and child IDs:
     - Formats as `${categoryId}|${catName}` and `${subCategoryId}|${subCatName}`.
   - If no `subCatName`, it resolves the single category ID:
     - Formats as `${id}|${catName}` if found, or raw `catName` as fallback.
4. Edge Case: If only `subCategory` is provided (no parent `category`), it resolves `subCatName` as top-level.
5. Error Handling: Any resolution failure catches the error, logs a warning, and preserves raw text names so that import never blocks on category lookup errors.

### 1.3 Compatibility with `FifozoneOmsService`
- **Method Signatures**:
  - `FifozoneOmsService.resolveCategoryId(name, parentId = 0)` returns `Promise<number|null>`.
  - `FifozoneOmsService.resolveSubCategoryId(categoryName, subCategoryName)` returns `Promise<{ categoryId: number|null, subCategoryId: number|null }>`.
- **Client Management**:
  - `WooCommerceService` required callers to pass a `client` instance (`getClient()`).
  - `FifozoneOmsService` manages its own Axios client singleton internally via `this.getClient()`. No client argument is required by callers.
  - (Note: `FifozoneOmsService` includes legacy argument detection for backward compatibility, but modern callers omit `client`).
- **Return Format**:
  - Returns numeric IDs identical to legacy behavior, allowing seamless generation of `${id}|${name}` strings for the MongoDB `Product.category` array.

### 1.4 Category Cache Clearing & Lifecycle
- `FifozoneOmsService` maintains an in-memory `_categoryCache` (Map) and `_categoryTreeCache` with a 1-hour TTL (`_categoryCacheTTL = 3600000`).
- Category cache warming occurs automatically on the first call via `GET /categories`.
- Cache clearing is exposed via `FifozoneOmsService.clearCategoryCache()`.
- **Batch Performance**:
  - For CSV/Excel imports containing hundreds of rows, keeping the cache warm across rows is critical. Clearing the cache inside the loop would result in hundreds of duplicate network requests.
  - Cache clearing should NOT occur per row.
  - Manual sync jobs in `SyncService.syncProducts()` already invoke `clearCategoryCache()` at sync inception.
  - Optional enhancement: An import request may pass `refreshCategories: true` in `req.body` if fresh taxonomies must be fetched before batch processing.

---

## 2. Settings Model & Controller Alignment

### 2.1 Storage of Store Settings in MongoDB
Settings are stored in the singleton `Settings` collection (accessed via `Settings.findOne()`):
- General store metadata (`companyName`, `email`, `phone`, `currency`, etc.).
- Logistics integration (`shiprocket: { email, password, pickupLocation, isConfigured }`).
- Legacy store integration (`woocommerce: { siteUrl, consumerKey, consumerSecret, isConfigured }`).

### 2.2 Schema Definition in `Settings.model.js`
Currently, `Settings.model.js` contains:
```javascript
  // ── WooCommerce ──
  woocommerce: {
    siteUrl:        { type: String, default: '' },
    consumerKey:    { type: String, default: '' },
    consumerSecret: { type: String, default: '' },
    isConfigured:   { type: Boolean, default: false },
  },
```
It lacks a `fifozoneOms` field. The schema must be updated to:
```javascript
  // ── Fifozone OMS ──
  fifozoneOms: {
    baseURL:      { type: String, default: 'https://fifozone.com/wp-json/oms/v1' },
    apiKey:       { type: String, default: '' },
    isConfigured: { type: Boolean, default: false },
  },

  // ── Legacy WooCommerce (Retained for backward compatibility) ──
  woocommerce: {
    siteUrl:        { type: String, default: '' },
    consumerKey:    { type: String, default: '' },
    consumerSecret: { type: String, default: '' },
    isConfigured:   { type: Boolean, default: false },
  },
```

### 2.3 Controller Logic in `settings.controller.js`
1. **`getSettings`**:
   - Must guarantee `fifozoneOms` is present in the response object, falling back to environment variables (`FIFOZONE_OMS_BASE_URL`, `FIFOZONE_OMS_API_KEY`) if unpopulated in the database.
   - For security, `apiKey` should either be masked or passed securely, matching application auth standards.
2. **`updateSettings`**:
   - Must extract `fifozoneOms` from `req.body`.
   - Must sanitize and trim `baseURL` and `apiKey`.
   - Must dynamically evaluate:
     `settings.fifozoneOms.isConfigured = !!(settings.fifozoneOms.baseURL && settings.fifozoneOms.apiKey);`
3. **Connection Testing**:
   - Currently, `settings.controller.js` only provides `testShiprocketConnection`.
   - Adding `testFifozoneOmsConnection` using `FifozoneOmsService.testConnection({ baseURL, apiKey })` allows immediate verification from the settings page before saving.

---

## 3. Existing Test Analysis in `server/tests/`

Current test files:
- `server/tests/fifozoneOms.test.js`: 41 tests covering product CRUD, orders, stock/price, categories, and connection testing.
- `server/tests/challenge_m1_normalization_cache.test.js`: 28 tests covering normalization edge cases, cache warming, cache invalidation (`clearCategoryCache`), and concurrency.
- `server/tests/adversarial_stress.test.js`: 22 tests covering error resilience, 401 retry, 429 backoff, rate limits, and network recovery.
- `server/tests/verify_zero_wc.test.js`: 8 tests verifying the scanner rules and detecting remaining legacy references.

**Test Gap**:
- No existing tests directly exercise `import.controller.js` or `settings.controller.js`.
- Adding controller-level unit tests for CSV import category resolution and settings update ensures complete coverage for Milestone 2.

---

## 4. Exact Surgical Code Replacement Plan

### File 1: `server/src/controllers/import.controller.js`

#### Change 1.1: Replace Service Import
- **Location**: Line 8
- **Before**:
  ```javascript
  const WooCommerceService = require('../services/woocommerce.service');
  ```
- **After**:
  ```javascript
  const FifozoneOmsService = require('../services/fifozoneOms.service');
  ```

#### Change 1.2: Migrate Category Resolution
- **Location**: Lines 228–275
- **Before**:
  ```javascript
        try {
          const client = await WooCommerceService.getClient();
          for (const catName of catNames) {
            if (catName.includes('|')) {
              // Already in id|name format
              categoryData.push(catName);
            } else if (subCatName) {
              // Has subcategory — resolve parent + child linked together
              const { categoryId, subCategoryId } = await WooCommerceService.resolveSubCategoryId(client, catName, subCatName);
              if (categoryId) categoryData.push(`${categoryId}|${catName}`);
              if (subCategoryId) categoryData.push(`${subCategoryId}|${subCatName}`);
            } else {
              // Just a category, no subcategory
              const id = await WooCommerceService.resolveCategoryId(client, catName);
              if (id) {
                categoryData.push(`${id}|${catName}`);
              } else {
                categoryData.push(catName);
              }
            }
          }

          // If subcategory was specified but no parent category, still resolve it as top-level
          if (subCatName && catNames.length === 0) {
            const id = await WooCommerceService.resolveCategoryId(client, subCatName);
            if (id) categoryData.push(`${id}|${subCatName}`);
          }
        } catch (err) {
          logger.warn(`[Import] Failed to resolve categories: ${err.message}`);
          categoryData = catNames;
        }
      } else if (rawProduct.subCategory) {
        // No category but has subcategory — resolve it as top-level
        try {
          const client = await WooCommerceService.getClient();
          const subCatName = String(rawProduct.subCategory).trim();
          const id = await WooCommerceService.resolveCategoryId(client, subCatName);
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
  ```
- **After**:
  ```javascript
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
  ```

#### Change 1.3: Update Async Push Log and Comment
- **Location**: Lines 393–396
- **Before**:
  ```javascript
        // Push to WooCommerce asynchronously (don't await — keep import fast)
        SyncService.pushProductCreate(product).catch(e =>
          logger.error(`[Import] WooCommerce push failed for "${productName}": ${e.message}`)
        );
  ```
- **After**:
  ```javascript
        // Push to Fifozone OMS asynchronously (don't await — keep import fast)
        SyncService.pushProductCreate(product).catch(e =>
          logger.error(`[Import] Fifozone OMS push failed for "${productName}": ${e.message}`)
        );
  ```

---

### File 2: `server/src/models/Settings.model.js`

#### Change 2.1: Add `fifozoneOms` Schema Definition
- **Location**: Lines 23–29
- **Before**:
  ```javascript
    // ── WooCommerce ──
    woocommerce: {
      siteUrl:        { type: String, default: '' },
      consumerKey:    { type: String, default: '' },
      consumerSecret: { type: String, default: '' },
      isConfigured:   { type: Boolean, default: false },
    },
  ```
- **After**:
  ```javascript
    // ── Fifozone OMS ──
    fifozoneOms: {
      baseURL:      { type: String, default: 'https://fifozone.com/wp-json/oms/v1' },
      apiKey:       { type: String, default: '' },
      isConfigured: { type: Boolean, default: false },
    },

    // ── WooCommerce (Retained for migration backward compatibility) ──
    woocommerce: {
      siteUrl:        { type: String, default: '' },
      consumerKey:    { type: String, default: '' },
      consumerSecret: { type: String, default: '' },
      isConfigured:   { type: Boolean, default: false },
    },
  ```

---

### File 3: `server/src/controllers/settings.controller.js`

#### Change 3.1: Initialize `fifozoneOms` in `getSettings`
- **Location**: Line 20
- **Add**:
  ```javascript
    if (!safe.fifozoneOms) {
      safe.fifozoneOms = {
        baseURL: process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1',
        apiKey: process.env.FIFOZONE_OMS_API_KEY || '',
        isConfigured: Boolean(process.env.FIFOZONE_OMS_BASE_URL && process.env.FIFOZONE_OMS_API_KEY)
      };
    }
  ```

#### Change 3.2: Accept and Save `fifozoneOms` in `updateSettings`
- **Location**: Lines 27–30 & 68
- **Before**:
  ```javascript
  const updateSettings = asyncHandler(async (req, res) => {
    const {
      companyName, email, phone, address, gstin, currency, timezone, logoUrl, primaryColor,
      shiprocket, woocommerce
    } = req.body;
  ```
- **After**:
  ```javascript
  const updateSettings = asyncHandler(async (req, res) => {
    const {
      companyName, email, phone, address, gstin, currency, timezone, logoUrl, primaryColor,
      shiprocket, woocommerce, fifozoneOms
    } = req.body;
  ```
- **Add under line 68**:
  ```javascript
    // Fifozone OMS credentials
    if (fifozoneOms) {
      if (!settings.fifozoneOms) {
        settings.fifozoneOms = {
          baseURL: 'https://fifozone.com/wp-json/oms/v1',
          apiKey: '',
          isConfigured: false
        };
      }
      if (fifozoneOms.baseURL !== undefined) settings.fifozoneOms.baseURL = fifozoneOms.baseURL?.trim();
      if (fifozoneOms.apiKey !== undefined) settings.fifozoneOms.apiKey = fifozoneOms.apiKey?.trim();
      settings.fifozoneOms.isConfigured = !!(settings.fifozoneOms.baseURL && settings.fifozoneOms.apiKey);
    }
  ```

#### Change 3.3: Add `testFifozoneOmsConnection`
- **Location**: Add before `module.exports` and export it:
  ```javascript
  // POST /api/settings/test-fifozone-oms
  async function testFifozoneOmsConnection(req, res) {
    try {
      const FifozoneOmsService = require('../services/fifozoneOms.service');
      const settings = await Settings.findOne().lean();
      const config = {
        baseURL: req.body?.baseURL || settings?.fifozoneOms?.baseURL || process.env.FIFOZONE_OMS_BASE_URL,
        apiKey: req.body?.apiKey || settings?.fifozoneOms?.apiKey || process.env.FIFOZONE_OMS_API_KEY,
      };

      const result = await FifozoneOmsService.testConnection(config);
      res.status(200).json({
        success: true,
        message: `✅ Fifozone OMS connected successfully! Found ${result.productCount || 0} products.`,
        data: result
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: `Fifozone OMS connection test failed: ${err.message}`
      });
    }
  }
  ```

---

### File 4: `server/src/routes/settings.routes.js`

#### Change 4.1: Register Test Route
- **Location**: Line 2 & Line 13
- **Before**:
  ```javascript
  const { getSettings, updateSettings, testShiprocketConnection, debugShiprocketRaw } = require('../controllers/settings.controller');
  ```
- **After**:
  ```javascript
  const { getSettings, updateSettings, testShiprocketConnection, debugShiprocketRaw, testFifozoneOmsConnection } = require('../controllers/settings.controller');
  ```
- **Add route**:
  ```javascript
  router.post('/test-fifozone-oms', requireAuth, requireRole(['admin', 'manager']), testFifozoneOmsConnection);
  ```

---

## 5. Verification Plan
1. **Static Scanner Verification**:
   - Run `node server/scripts/verify_zero_wc.js server` to ensure no new violations are introduced in `import.controller.js` or `settings.controller.js`.
2. **Automated Unit Testing**:
   - Run `npm test --prefix server` to confirm all 99 tests pass.
   - Run tests targeting category resolution (`server/tests/fifozoneOms.test.js`, `server/tests/challenge_m1_normalization_cache.test.js`).
3. **Mock CSV Import Workflow**:
   - Verify category resolution with a mock payload containing both single categories (`"Dog Food"`) and nested categories (`"Dog Medicine"` + `"Urinary Care"`).
   - Ensure composite format `${id}|${name}` is generated and stored accurately.
4. **Settings Persistence & API Test**:
   - Send `PUT /api/settings` with `fifozoneOms: { baseURL, apiKey }`.
   - Verify MongoDB document has `fifozoneOms.isConfigured === true`.
   - Send `POST /api/settings/test-fifozone-oms` and verify connection probe.
