# Handoff Report: WooCommerce API Codebase Audit

**Agent**: `explorer_survey_1`  
**Working Directory**: `c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_1\`  
**Milestone**: Milestone 1 - Discovery & Audit  
**Target Recipient**: Parent Orchestrator (`40b54eaa-1f4d-4163-940f-a47aef329f48`)  

---

## 1. Observation

Direct observations and evidence from code inspections and grep searches across `c:\Users\uttim\Downloads\fi`:

### A. Dependencies and Package Manifest
- `server/package.json`:
  - Line 23: `"@woocommerce/woocommerce-rest-api": "^1.0.2"`
  - Line 16: `"woocommerce"` in `keywords`
- `server/package-lock.json`:
  - Lines 12, 1353–1360: Direct package declaration for `@woocommerce/woocommerce-rest-api`

### B. Client Instantiations (`version: 'wc/v3'`)
- `server/src/services/woocommerce.service.js`:
  - Line 1: `const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;`
  - Lines 58–64:
    ```javascript
    return new WooCommerceRestApi({
      url: finalUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true
    });
    ```
- `server/test_wc_api.js`: Line 18: `version: 'wc/v3'`
- `server/test_wc_farmina.js`: Line 18: `version: 'wc/v3'`
- `server/test_wc_hypo.js`: Line 18: `version: 'wc/v3'`
- `server/test_woo_connection.js`: Lines 20, 39: `version: 'wc/v3'`

### C. Active REST API Endpoints Invoked in `woocommerce.service.js`
- **Orders Endpoint**:
  - Line 478: `client.get('orders', { status: [...], per_page: perPage, page })` -> invokes `/wp-json/wc/v3/orders`
- **Categories Endpoints**:
  - Line 120: `client.get('products/categories', { per_page: 100, page })` -> invokes `/wp-json/wc/v3/products/categories`
  - Line 155: `client.post('products/categories', createPayload)` -> invokes `/wp-json/wc/v3/products/categories`
  - Line 205: `client.get('products/categories', { per_page: 100, page })` -> invokes `/wp-json/wc/v3/products/categories`
- **Product & Variation Endpoints**:
  - Line 263: `client.get('products', { sku, per_page: 1, status: 'any' })` -> invokes `/wp-json/wc/v3/products`
  - Line 274: `client.get('products', { search: name, per_page: 20, status: 'any' })` -> invokes `/wp-json/wc/v3/products`
  - Line 294: `client.get('products/${wooId}')` -> invokes `/wp-json/wc/v3/products/:id`
  - Line 404: `client.get('products/${wooProductId}/variations', { per_page: 100 })` -> invokes `/wp-json/wc/v3/products/:id/variations`
  - Line 429: `client.put('products/${wooProductId}/variations/${existingId}', variationPayload)` -> invokes `/wp-json/wc/v3/products/:id/variations/:varId`
  - Line 432: `client.post('products/${wooProductId}/variations', variationPayload)` -> invokes `/wp-json/wc/v3/products/:id/variations`

### D. Production Call Sites of `WooCommerceService`
- `server/src/services/sync.service.js`:
  - Line 1: `const WooCommerceService = require('./woocommerce.service');`
  - Line 38: `WooCommerceService.clearCategoryCache();`
  - Line 249: `{ service: WooCommerceService, key: 'fifozone' }` in `syncOrders()` (Runs on 10-minute cron)
- `server/src/controllers/import.controller.js`:
  - Line 8: `const WooCommerceService = require('../services/woocommerce.service');`
  - Lines 230, 237, 242, 253, 263, 265: Calls `WooCommerceService.getClient()`, `resolveSubCategoryId()`, and `resolveCategoryId()`
- `server/src/controllers/product.controller.js`:
  - Line 8: `const WooCommerceService = require('../services/woocommerce.service');`
  - Lines 443, 448: Calls `WooCommerceService.getClient()` and `resolveCategoryId()`
- `server/src/controllers/platform.controller.js`:
  - Line 7: `const WooCommerceService = require('../services/woocommerce.service');`
  - Line 20: `const tree = await WooCommerceService.getCategoryTree();` in `getWooCommerceCategories`
- `server/src/routes/platform.routes.js`:
  - Line 14: `router.get('/woocommerce/categories', requireAuth, getWooCommerceCategories);`

### E. Configuration & Settings Files
- `server/src/models/Settings.model.js`:
  - Lines 23–29: `woocommerce: { siteUrl, consumerKey, consumerSecret, isConfigured }`
- `server/src/controllers/settings.controller.js`:
  - Lines 29, 62–68: Handling `woocommerce` credentials in `updateSettings`
- `server/.env`:
  - Lines 17–19: `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`

### F. Standalone Scripts
- `server/test_wc_api.js`: Instantiates `WooCommerceRestApi`, calls `client.get('products')`
- `server/test_wc_farmina.js`: Instantiates `WooCommerceRestApi`, calls `client.get('products')`
- `server/test_wc_hypo.js`: Instantiates `WooCommerceRestApi`, calls `client.get('products')`
- `server/test_woo_connection.js`: Instantiates `WooCommerceRestApi`, calls `api.get('orders')`
- `server/fix_sync.js`: Line 10: updates platform to `"woocommerce"`
- `server/rename_cred.js`: Lines 4–5: updates platform from `"woocommerce"` to `"fifozone"`
- `server/check_orders.js` & `check_orders.js`: Lines 6, 9: checks `#OD` WooCommerce orders

### G. Client UI & API Files
- `client/src/api/platformApi.js`: Lines 18–21: `getWooCommerceCategoriesApi()` -> `GET /platforms/woocommerce/categories`
- `client/src/pages/inventory/AddProductPage.jsx`: Lines 6, 15, 28, 489
- `client/src/pages/inventory/EditProductPage.jsx`: Lines 6, 36, 455
- `client/src/components/inventory/ImportWizard.jsx`: Line 96
- `client/src/pages/apps/FifozoneAppPage.jsx`: Lines 48, 91, 120, 127–128
- `client/src/pages/settings/PlatformSettingsPage.jsx`: Lines 77, 313, 316
- `client/src/pages/settings/SettingsPage.jsx`: Lines 69–71, 131, 137, 300–343
- `client/src/pages/orders/ReturnsPage.jsx`: Line 213

---

## 2. Logic Chain

1. **Dependency Invalidation**: Observation A demonstrates that `@woocommerce/woocommerce-rest-api` is bundled in `server/package.json`. Removing it satisfies Requirement R1.
2. **REST Client Elimination**: Observation B demonstrates that exactly 5 files instantiate `WooCommerceRestApi` with `version: 'wc/v3'`. All must be transitioned or replaced.
3. **Operational Replacement Strategy**:
   - Observations C & D reveal that `SyncService.syncOrders()` is the primary live consumer of WooCommerce REST API (`/wp-json/wc/v3/orders`). Adding `pullOrders()` to `FifozoneOmsService` querying `GET /wp-json/oms/v1/orders` and swapping the service in `sync.service.js` line 249 completely decouples order syncing from WooCommerce.
   - Observations C & D reveal that category tree fetching and resolution (`getCategoryTree`, `resolveCategoryId`) make live calls to `/wp-json/wc/v3/products/categories`. Adding `getCategoryTree()` and category resolution to `FifozoneOmsService` using `GET /wp-json/oms/v1/categories?format=tree` fully decouples category navigation and product imports from WooCommerce.
   - Observation C reveals that product updates/creations in `FifozoneOmsService` already target `/wp-json/oms/v1/products/create` and `/update`. Removing `woocommerce.service.js` will leave zero residual WooCommerce product/variation calls.
4. **Configuration Cleanliness**: Observation E shows settings and environment variables holding legacy WooCommerce credentials (`WOOCOMMERCE_URL`, `ck_dummy_key`, `cs_dummy_secret`). These can be superseded by `FIFOZONE_OMS_BASE_URL` and `FIFOZONE_OMS_API_KEY`.
5. **Clean Verification**: Observation F details the test scripts that currently test WooCommerce REST API. These should either be converted into Fifozone OMS test scripts or replaced with safe, read-only test suites.

---

## 3. Caveats

- **External Services**: Amazon SP-API, Flipkart, Meesho, and Shiprocket integrations are present in `server/src/services/` and were confirmed not to make WooCommerce API calls.
- **Client UI Decoupling**: While the primary task is backend elimination, the client files identified in Observation G contain references to `/platforms/woocommerce/categories` and UI text ("WooCommerce"). Aliasing `/api/platforms/woocommerce/categories` to the new Fifozone categories controller ensures 100% backward compatibility for the frontend while client updates are applied.

---

## 4. Conclusion

Every occurrence of WooCommerce API calls, dependencies, client instantiations, queries, payloads, and scripts across the codebase has been identified and cataloged with exact line numbers and replacement endpoints. 

The complete detailed report is published in:
`c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_1\analysis.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Dependency check**:
   ```powershell
   grep -n "@woocommerce" server/package.json
   ```
2. **Endpoint check**:
   ```powershell
   grep -rn "wc/v3" server/ --exclude-dir=node_modules
   ```
   *Expected result*: Exactly 5 matching files (`woocommerce.service.js`, `test_wc_api.js`, `test_wc_farmina.js`, `test_wc_hypo.js`, `test_woo_connection.js`).
3. **Caller check**:
   ```powershell
   grep -rn "woocommerce.service" server/src/ --exclude-dir=node_modules
   ```
   *Expected result*: Exactly 4 caller files (`import.controller.js`, `product.controller.js`, `platform.controller.js`, `sync.service.js`).
4. **Review audit report**:
   Inspect `c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_1\analysis.md` for the 30-item master occurrence matrix.
