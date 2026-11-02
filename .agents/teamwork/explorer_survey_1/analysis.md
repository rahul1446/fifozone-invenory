# Comprehensive Codebase Audit: WooCommerce API & REST Client Usage

**Auditor**: `explorer_survey_1`  
**Date**: November 2, 2026  
**Scope**: Entire workspace `c:\Users\uttim\Downloads\fi` (Server, Scripts, Client, Configs)  
**Target Architecture**: Complete migration from WooCommerce REST API (`/wp-json/wc/v3`) & `@woocommerce/woocommerce-rest-api` to Custom Fifozone Universal OMS API Hub (`https://fifozone.com/wp-json/oms/v1`).

---

## Executive Summary

An exhaustive scan across all backend and frontend files in `c:\Users\uttim\Downloads\fi` was conducted. The codebase contains a hybrid integration state:
1. **Product Writes / Stock / Price**: Already partially routed to `FifozoneOmsService` (`/wp-json/oms/v1/products/create`, `/update`, `/delete`), but legacy WooCommerce endpoints and payload builders still linger in `woocommerce.service.js`.
2. **Order Ingestion (`pullOrders`)**: Actively running every 10 minutes via cron (`SyncService.syncOrders()`) using `@woocommerce/woocommerce-rest-api` querying the legacy endpoint `GET /wp-json/wc/v3/orders`.
3. **Category Resolution & Tree (`getCategoryTree`, `resolveCategoryId`, `resolveSubCategoryId`)**: Actively querying `GET /wp-json/wc/v3/products/categories` and creating categories via `POST /wp-json/wc/v3/products/categories` inside `import.controller.js`, `product.controller.js`, and `platform.controller.js` (served via route `/api/platforms/woocommerce/categories`).
4. **Direct Package Dependency**: `@woocommerce/woocommerce-rest-api` is an explicit dependency in `server/package.json` (line 23) and instantiated across 5 files with `version: 'wc/v3'`.
5. **Standalone Test & Helper Scripts**: Four test scripts (`test_wc_api.js`, `test_wc_farmina.js`, `test_wc_hypo.js`, `test_woo_connection.js`) and database helper scripts (`fix_sync.js`, `check_orders.js`, `rename_cred.js`) rely on WooCommerce client calls and schemas.

---

## 1. Package Dependency & Client Instantiation Audit

### 1.1 Dependency Manifest
| File Path | Line Number | Code Snippet | Purpose / Risk |
| :--- | :--- | :--- | :--- |
| `server/package.json` | 23 | `"@woocommerce/woocommerce-rest-api": "^1.0.2"` | Must be uninstalled and removed from dependencies. |
| `server/package.json` | 16 | `"woocommerce",` in `keywords` | Legacy keyword metadata. |
| `server/package-lock.json` | 12, 1353-1360 | Lockfile package definition | Cleaned when `npm uninstall @woocommerce/woocommerce-rest-api` is run. |

### 1.2 REST Client Instantiations (`new WooCommerceRestApi`)
All instantiations explicitly configure `version: 'wc/v3'` targeting `/wp-json/wc/v3/`:

| File Path | Line Numbers | Method / Scope | Code Details |
| :--- | :--- | :--- | :--- |
| `server/src/services/woocommerce.service.js` | 58–64 | `getClient()` | `return new WooCommerceRestApi({ url: finalUrl, consumerKey, consumerSecret, version: 'wc/v3', queryStringAuth: true });` |
| `server/test_wc_api.js` | 14–19 | Standalone test | `const client = new WooCommerceRestApi({ url: cred.credentials.storeUrl, consumerKey: ..., consumerSecret: ..., version: 'wc/v3' });` |
| `server/test_wc_farmina.js` | 14–19 | Standalone test | `const client = new WooCommerceRestApi({ url: cred.credentials.storeUrl, consumerKey: ..., consumerSecret: ..., version: 'wc/v3' });` |
| `server/test_wc_hypo.js` | 14–19 | Standalone test | `const client = new WooCommerceRestApi({ url: cred.credentials.storeUrl, consumerKey: ..., consumerSecret: ..., version: 'wc/v3' });` |
| `server/test_woo_connection.js` | 16–22, 35–41 | Connection diagnosis | Instantiates two instances: `api1` (direct URL) and `api2` (`${baseUrl}/index.php`), both with `version: 'wc/v3'`. |

---

## 2. Functional Area Breakdown

---

### Area A: Order Fetching, Ingestion & Status Updates

#### Current Implementation Analysis
- **Service File**: `server/src/services/woocommerce.service.js`
- **Method**: `pullOrders()` (Lines 468–538)
- **Active Endpoint Invocation**:
  ```javascript
  // Line 478
  const response = await client.get('orders', { 
    status: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'checkout-draft'], 
    per_page: perPage,
    page,
  });
  ```
  - HTTP Request: `GET /wp-json/wc/v3/orders?status=...&per_page=100&page=N`
  - Pagination check: Reads headers `x-wp-totalpages` (line 523).
- **Request Parameters**:
  - `status`: array of 8 statuses `['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'checkout-draft']`.
  - `per_page`: `100`
  - `page`: `1, 2, 3...`
- **Payload / Response Mapping**:
  - Maps `order.id` → `platformOrderId: String(order.id)`
  - Maps `order.number` → `number: order.number`
  - Maps `order.status` → `platformStatus: order.status`
  - Maps `order.date_created` → `orderDate`
  - Maps `order.billing` & `order.shipping` → `customer` and `shippingAddress`
  - Maps `order.line_items` → `items: [{ sku, name, platformProductId, quantity, unitPrice }]`
  - Maps `order.total` and `order.shipping_total` → `totalAmount`, `subtotal`, `shippingCharge`
  - Maps `order.payment_method` → `paymentMethod`, `paymentStatus`

#### Where It Is Triggered in the System
1. **Sync Service**: `server/src/services/sync.service.js` (Lines 246–426):
   - Line 249: `{ service: WooCommerceService, key: 'fifozone' }` in `platforms` array inside `syncOrders()`.
   - Line 260: `const rawOrders = await item.service.pullOrders();`
   - Ingests orders, deduces local product stock, logs inventory changes to `InventoryLog`, generates `FI-ORD-XXXXX` order numbers, and emits notifications via `notificationService`.
2. **Background Cron Job**: `server/src/jobs/index.js` (Lines 14–22):
   - Runs every 10 minutes: `cron.schedule('*/10 * * * *', async () => { await SyncService.syncOrders(); });`

#### Fifozone OMS Target Replacement
- **OMS Endpoint**: `GET https://fifozone.com/wp-json/oms/v1/orders` (or `GET /hub?include=orders`)
- **OMS Query Parameters**: `orders_limit=100&orders_page=1` or `order_status=processing`
- **OMS Auth**: Header `X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562`
- **OMS Response Schema**:
  - `orders.data`: Array of HPOS orders with `id`, `status`, `currency`, `total`, `billing`, `shipping_tracking`, `items: [{ item_id, product_id, variation_id, name, quantity, total }]`, `date_created`.
  - Eliminates slow `wp_posts` join overhead by reading native HPOS `wpww_wc_orders` tables directly.

---

### Area B: Category & Subcategory Resolution and Tree Navigation

#### Current Implementation Analysis
- **Service File**: `server/src/services/woocommerce.service.js`
- **Methods**:
  1. `getCategoryTree()` (Lines 198–251):
     - Line 205: `await client.get('products/categories', { per_page: 100, page })` -> `GET /wp-json/wc/v3/products/categories`
     - Paginates through all categories, builds a nested parent-child tree with `value: "${cat.id}|${cat.name}"`.
  2. `resolveCategoryId(client, name, parentId = 0)` (Lines 105–168):
     - Line 120: `await client.get('products/categories', { per_page: 100, page })` -> `GET /wp-json/wc/v3/products/categories`
     - Line 155: `await client.post('products/categories', createPayload)` -> `POST /wp-json/wc/v3/products/categories`
     - Auto-creates missing categories on WooCommerce.
  3. `resolveSubCategoryId(client, categoryName, subCategoryName)` (Lines 179–190):
     - Resolves parent category ID, then creates or resolves subcategory under `parentId`.
  4. `clearCategoryCache()` (Lines 254–256):
     - Clears the in-memory Map `this._categoryCache`.

#### Where It Is Triggered in the System
1. **Platform Route & Controller**:
   - `server/src/routes/platform.routes.js`: Line 14:
     `router.get('/woocommerce/categories', requireAuth, getWooCommerceCategories);`
   - `server/src/controllers/platform.controller.js`: Lines 19–22:
     ```javascript
     const getWooCommerceCategories = asyncHandler(async (req, res) => {
       const tree = await WooCommerceService.getCategoryTree();
       res.status(200).json(new ApiResponse(200, tree, 'WooCommerce categories retrieved successfully'));
     });
     ```
2. **Product CSV / Excel Import**:
   - `server/src/controllers/import.controller.js`:
     - Line 230: `const client = await WooCommerceService.getClient();`
     - Line 237: `const { categoryId, subCategoryId } = await WooCommerceService.resolveSubCategoryId(client, catName, subCatName);`
     - Line 242: `const id = await WooCommerceService.resolveCategoryId(client, catName);`
     - Line 253: `const id = await WooCommerceService.resolveCategoryId(client, subCatName);`
     - Line 263: `const client = await WooCommerceService.getClient();`
     - Line 265: `const id = await WooCommerceService.resolveCategoryId(client, subCatName);`
3. **Product Controller**:
   - `server/src/controllers/product.controller.js`:
     - Line 443: `const client = await WooCommerceService.getClient();`
     - Line 448: `const id = await WooCommerceService.resolveCategoryId(client, catName);`
4. **Sync Service Initializer**:
   - `server/src/services/sync.service.js`:
     - Line 38: `WooCommerceService.clearCategoryCache();` at start of `syncProducts()`.

#### Fifozone OMS Target Replacement
- **Dedicated OMS Categories Endpoint**:
  - Full tree: `GET https://fifozone.com/wp-json/oms/v1/categories?format=tree`
  - Top-level categories: `GET https://fifozone.com/wp-json/oms/v1/categories?parent=0`
  - Subcategories by parent ID: `GET https://fifozone.com/wp-json/oms/v1/categories?parent={id}`
  - Flat list: `taxonomies.categories_flat` or `/categories`
- **Payload Structure**:
  - In Fifozone OMS API, product creation and updates take **string arrays of category names or slugs directly**:
    `categories: ["Dog Food", "Puppy Food"]`
  - The OMS API automatically creates or resolves terms into WordPress taxonomies internally without requiring the client to manually fetch and auto-create category IDs via REST API.

---

### Area C: Product Catalog Sync, Lookups & Variations

#### Current Implementation Analysis
- **Service File**: `server/src/services/woocommerce.service.js`
- **Legacy Product Methods**:
  1. `findWooProductId(client, sku)` (Lines 260–268):
     - Line 263: `await client.get('products', { sku, per_page: 1, status: 'any' })` -> `GET /wp-json/wc/v3/products`
  2. `findWooProductIdByName(client, name)` (Lines 271–285):
     - Line 274: `await client.get('products', { search: name, per_page: 20, status: 'any' })` -> `GET /wp-json/wc/v3/products`
  3. `resolveWooId(client, product)` (Lines 288–312):
     - Line 294: `await client.get('products/${wooId}')` -> `GET /wp-json/wc/v3/products/:id`
  4. `buildWooPayload(product, categoryIds)` (Lines 319–395):
     - Builds legacy WooCommerce JSON format: `{ name, sku, status, short_description, description, type, regular_price, manage_stock, stock_quantity, attributes, categories: [{ id }], images: [{ src }] }`.
  5. `syncVariations(client, wooProductId, variants)` (Lines 398–436):
     - Line 404: `await client.get('products/${wooProductId}/variations', { per_page: 100 })` -> `GET /wp-json/wc/v3/products/:id/variations`
     - Line 429: `await client.put('products/${wooProductId}/variations/${existingId}', variationPayload)` -> `PUT /wp-json/wc/v3/products/:id/variations/:varId`
     - Line 432: `await client.post('products/${wooProductId}/variations', variationPayload)` -> `POST /wp-json/wc/v3/products/:id/variations`

#### Partial Delegation in Place
In `woocommerce.service.js`, lines 82–85 and 439–466 already delegate `pullProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `pushStock`, and `pushPrice` to `FifozoneOmsService`:
```javascript
async pullProducts(options = {}) { return await FifozoneOmsService.pullProducts(options); }
async createProduct(product) { return await FifozoneOmsService.createProduct(product); }
async updateProduct(product, wooProductId) { return await FifozoneOmsService.updateProduct(product, wooProductId); }
async deleteProduct(product) { return await FifozoneOmsService.deleteProduct(product); }
async pushStock(sku, quantity) { return await FifozoneOmsService.pushStock(sku, quantity); }
async pushPrice(sku, price) { return await FifozoneOmsService.pushPrice(sku, price); }
```
However, the caller files (`import.controller.js`, `product.controller.js`, `sync.service.js`) still import `woocommerce.service.js`, and the legacy methods in `woocommerce.service.js` still make live calls to `/wp-json/wc/v3/`.

#### Fifozone OMS Target Replacement
- **Single Product SKU / ID Lookup**:
  - `GET https://fifozone.com/wp-json/oms/v1/products?sku=DFODF0007DR`
  - `GET https://fifozone.com/wp-json/oms/v1/products?id=186782`
- **Product Catalog Delta / Bulk Load**:
  - `GET https://fifozone.com/wp-json/oms/v1/products?limit=500&page=1`
  - `GET https://fifozone.com/wp-json/oms/v1/products?modified_after=2026-10-13%2000:00:00`
- **Product Variations**:
  - Delivered natively inside the `variations` array on `GET /products` and `GET /hub`.

---

### Area D: Stock and Price Updates

#### Current Implementation Analysis
- **Service File**: `server/src/services/sync.service.js`:
  - `pushStockToPlatforms(product)` (Lines 429–444):
    ```javascript
    if (product.platformStatus?.fifozone === 'active') {
      try { await FifozoneOmsService.pushStock(sku, product.stockByPlatform?.fifozone ?? product.totalStock); }
      catch (err) { logger.error(`Failed to push stock to Fifozone OMS for ${sku}: ${err.message}`); }
    }
    ```
  - `pushPriceToPlatforms(product)` (Lines 447–462):
    ```javascript
    if (product.platformStatus?.fifozone === 'active' && product.sellingPrice?.fifozone > 0) {
      try { await FifozoneOmsService.pushPrice(sku, product.sellingPrice.fifozone); }
      catch (err) { logger.error(`Failed to push price to Fifozone OMS for ${sku}: ${err.message}`); }
    }
    ```
- **Service File**: `server/src/services/fifozoneOms.service.js`:
  - `pushStock(sku, quantity)` (Lines 335–353):
    - `POST https://fifozone.com/wp-json/oms/v1/products/update` with payload `{ sku, stock_quantity, stock_status }`.
  - `pushPrice(sku, price)` (Lines 355–373):
    - `POST https://fifozone.com/wp-json/oms/v1/products/update` with payload `{ sku, regular_price }`.

#### Status Assessment
Stock and price updates are already utilizing the new OMS endpoint `/products/update`. However, in `woocommerce.service.js`, the dummy stubs `pushStock` and `pushPrice` remain, and unused legacy price/stock payload logic is still present in `buildWooPayload()`.

---

### Area E: Configuration, Models & Settings

#### 1. Database Model: `Settings.model.js`
- `server/src/models/Settings.model.js`:
  - Lines 23–29:
    ```javascript
    // ── WooCommerce ──
    woocommerce: {
      siteUrl:        { type: String, default: '' },
      consumerKey:    { type: String, default: '' },
      consumerSecret: { type: String, default: '' },
      isConfigured:   { type: Boolean, default: false },
    },
    ```
  - Needs migration or replacement with `fifozoneOms: { baseURL, apiKey, isConfigured }`.

#### 2. Settings Controller: `settings.controller.js`
- `server/src/controllers/settings.controller.js`:
  - Line 29: destructures `woocommerce` from `req.body`.
  - Lines 62–68: saves `siteUrl`, `consumerKey`, `consumerSecret`.

#### 3. Environment Configuration: `server/.env`
- `server/.env`:
  - Lines 17–19:
    ```properties
    WOOCOMMERCE_URL=https://fifozone.com
    WOOCOMMERCE_CONSUMER_KEY=ck_dummy_key
    WOOCOMMERCE_CONSUMER_SECRET=cs_dummy_secret
    ```
  - Lines 20–21 (Active OMS config):
    ```properties
    FIFOZONE_OMS_BASE_URL=https://fifozone.com/wp-json/oms/v1
    FIFOZONE_OMS_API_KEY=oms_live_9f8d2b7e61a4c035824e87901bcdf562
    ```

#### 4. Platform Credential & Platform Sync Models
- `server/src/models/PlatformCredential.model.js`:
  - Line 6: `enum: ['fifozone', 'amazon', 'flipkart', 'meesho', 'shiprocket']` (Already unified under `'fifozone'`).
- `server/src/models/PlatformSync.model.js`:
  - Line 6: `enum: ['fifozone', 'amazon', 'flipkart']` (Already unified under `'fifozone'`).

---

### Area F: Standalone Test Files and Scripts

| File Path | Lines | Operation Performed | WooCommerce Call |
| :--- | :--- | :--- | :--- |
| `server/test_wc_api.js` | 1, 14–21 | Product description search | `client.get('products', { search: 'Carniwel Fresh Chicken Kibble', per_page: 1 })` |
| `server/test_wc_farmina.js` | 1, 14–21 | Product description search | `client.get('products', { search: 'Farmina Vet Life Fish', per_page: 1 })` |
| `server/test_wc_hypo.js` | 1, 14–21 | Product description search | `client.get('products', { search: 'Farmina Vet Life Fish & Potato Hypoallergenic', per_page: 1 })` |
| `server/test_woo_connection.js` | 3, 16–26, 35–45 | Order connection probe | `api1.get('orders', { per_page: 1 })` & `api2.get('orders', { per_page: 1 })` |
| `server/fix_sync.js` | 10 | MongoDB seed / fix | `{ $set: { platform: "woocommerce", syncedProductsCount: 6 } }` |
| `server/rename_cred.js` | 4–5 | MongoDB migration | `updateOne({ platform: "woocommerce" }, { $set: { platform: "fifozone" } })` |
| `server/run_sync.js` | 1, 19 | Local Atlas sync runner | Comments and logs reference "WooCommerce sync" |
| `check_orders.js` & `server/check_orders.js` | 6, 9 | Order ID verification | `countDocuments({ orderNumber: { $regex: '^#OD' } })` & `console.log('WooCommerce #OD:', wooCount);` |

---

### Area G: Client Frontend Touchpoints

| File Path | Line Numbers | UI / API Occurrence | Description |
| :--- | :--- | :--- | :--- |
| `client/src/api/platformApi.js` | 18–21 | `getWooCommerceCategoriesApi()` | Calls `GET /platforms/woocommerce/categories`. Needs migration to `/platforms/fifozone/categories`. |
| `client/src/pages/inventory/AddProductPage.jsx` | 6, 15, 28, 489 | Category dropdown & listing form | Imports `getWooCommerceCategoriesApi`; describes "Your WooCommerce store"; displays "🛒 Fifozone WooCommerce ID". |
| `client/src/pages/inventory/EditProductPage.jsx` | 6, 36, 455 | Category dropdown & edit form | Imports `getWooCommerceCategoriesApi`; displays "WooCommerce ID" input item. |
| `client/src/components/inventory/ImportWizard.jsx` | 96 | CSV column auto-mapping | Maps `'woocommerceid': 'platformId_fifozone'`. |
| `client/src/pages/apps/FifozoneAppPage.jsx` | 48, 91, 120, 127–128 | Fifozone Integration page | Instructions directing user to WooCommerce WP-Admin REST API settings. |
| `client/src/pages/settings/PlatformSettingsPage.jsx` | 77, 313, 316 | Platform Credentials page | Displays "Fifozone Website (WooCommerce)". |
| `client/src/pages/settings/SettingsPage.jsx` | 69–71, 131, 137, 300–343 | Settings WooCommerce Tab | Form fields for `wcSiteUrl`, `wcConsumerKey`, `wcConsumerSecret`. |
| `client/src/pages/orders/ReturnsPage.jsx` | 213 | Empty state placeholder | "Return tracking will be available once returns are synced from WooCommerce". |

---

## 3. Comprehensive Master Occurrence Matrix

Below is the complete, single-source-of-truth inventory of every file and line requiring modification or elimination:

| # | File Path | Line(s) | Category | Current WooCommerce / Legacy Usage | Target Fifozone OMS Architecture |
|---|:---|:---|:---|:---|:---|
| 1 | `server/package.json` | 23 | Dependency | `"@woocommerce/woocommerce-rest-api": "^1.0.2"` | Remove package entirely (`npm uninstall`). |
| 2 | `server/package.json` | 16 | Metadata | `"woocommerce"` in `keywords` | Replace with `"fifozone-oms"`. |
| 3 | `server/.env` | 17–19 | Environment | `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET` | Remove legacy keys; keep `FIFOZONE_OMS_BASE_URL` & `FIFOZONE_OMS_API_KEY`. |
| 4 | `server/src/services/woocommerce.service.js` | 1 | Import | `require('@woocommerce/woocommerce-rest-api')` | Eliminate entire file or replace with complete redirect/proxy to `fifozoneOms.service.js`. |
| 5 | `server/src/services/woocommerce.service.js` | 58–64 | Client Init | `new WooCommerceRestApi({ ..., version: 'wc/v3' })` | Remove legacy client instantiation. |
| 6 | `server/src/services/woocommerce.service.js` | 120, 155 | Endpoint | `client.get('products/categories')`, `client.post('products/categories')` | Route to `FifozoneOmsService.getCategories()` (`GET /wp-json/oms/v1/categories`). |
| 7 | `server/src/services/woocommerce.service.js` | 205 | Endpoint | `client.get('products/categories', { per_page: 100 })` | Route to `FifozoneOmsService.getCategoryTree()` (`GET /wp-json/oms/v1/categories?format=tree`). |
| 8 | `server/src/services/woocommerce.service.js` | 263, 274, 294 | Endpoint | `client.get('products', ...)` & `client.get('products/:id')` | Route to `FifozoneOmsService.getProductById()` / `getProductBySku()` (`GET /wp-json/oms/v1/products`). |
| 9 | `server/src/services/woocommerce.service.js` | 404, 429, 432 | Endpoint | `client.get/put/post('products/:id/variations')` | Handled automatically via OMS product creation/update with variation blocks. |
| 10 | `server/src/services/woocommerce.service.js` | 478 | Endpoint | `client.get('orders', ...)` (`pullOrders`) | Route to `FifozoneOmsService.pullOrders()` (`GET /wp-json/oms/v1/orders`). |
| 11 | `server/src/services/sync.service.js` | 1, 38 | Import & Cache | `require('./woocommerce.service')` & `WooCommerceService.clearCategoryCache()` | Route to `FifozoneOmsService`. |
| 12 | `server/src/services/sync.service.js` | 249 | Order Sync | `{ service: WooCommerceService, key: 'fifozone' }` | Change to `{ service: FifozoneOmsService, key: 'fifozone' }`. |
| 13 | `server/src/controllers/import.controller.js` | 8, 230–265 | Category Mapping | `WooCommerceService.getClient()`, `resolveSubCategoryId()`, `resolveCategoryId()` | Use `FifozoneOmsService` categories or direct category string arrays. |
| 14 | `server/src/controllers/product.controller.js` | 8, 443–448 | Category Mapping | `WooCommerceService.getClient()`, `resolveCategoryId()` | Use `FifozoneOmsService.resolveCategoryId()`. |
| 15 | `server/src/controllers/platform.controller.js` | 7, 19–22 | Categories Route | `WooCommerceService.getCategoryTree()` | Call `FifozoneOmsService.getCategoryTree()`. |
| 16 | `server/src/routes/platform.routes.js` | 14 | Route | `/woocommerce/categories` | Deprecate or alias to `/fifozone/categories` or `/categories`. |
| 17 | `server/src/models/Settings.model.js` | 23–29 | Schema | `woocommerce: { siteUrl, consumerKey, consumerSecret, isConfigured }` | Replace with `fifozoneOms: { baseURL, apiKey, isConfigured }`. |
| 18 | `server/src/controllers/settings.controller.js` | 29, 62–68 | Controller | `woocommerce` credential handling | Handle `fifozoneOms` credentials. |
| 19 | `server/src/jobs/index.js` | 171, 188 | Logging | "restored WooCommerce prices", "Review Sync from WooCommerce" | Update logs to reference Fifozone OMS. |
| 20 | `server/test_wc_api.js` | 1–34 | Test Script | `new WooCommerceRestApi` + `client.get('products')` | Migrate to use `FifozoneOmsService.pullProducts({ search: '...' })`. |
| 21 | `server/test_wc_farmina.js` | 1–32 | Test Script | `new WooCommerceRestApi` + `client.get('products')` | Migrate to use `FifozoneOmsService.pullProducts({ search: '...' })`. |
| 22 | `server/test_wc_hypo.js` | 1–32 | Test Script | `new WooCommerceRestApi` + `client.get('products')` | Migrate to use `FifozoneOmsService.pullProducts({ search: '...' })`. |
| 23 | `server/test_woo_connection.js` | 1–57 | Test Script | `new WooCommerceRestApi` + `api.get('orders')` | Migrate to test `FifozoneOmsService.testConnection()`. |
| 24 | `server/fix_sync.js` | 10 | Utility | Sets platform to `"woocommerce"` | Change to `"fifozone"`. |
| 25 | `server/rename_cred.js` | 4–5 | Utility | Migrates `"woocommerce"` to `"fifozone"` | Completed migration script. |
| 26 | `check_orders.js` & `server/check_orders.js` | 6, 9 | Diagnostics | Checks `#OD` WooCommerce orders | Retain or adapt for Fifozone order diagnostics. |
| 27 | `client/src/api/platformApi.js` | 18–21 | Client API | `getWooCommerceCategoriesApi` calling `/platforms/woocommerce/categories` | Update to `getFifozoneCategoriesApi` calling `/platforms/fifozone/categories`. |
| 28 | `client/src/pages/inventory/AddProductPage.jsx` | 6, 15, 28, 489 | Client UI | WooCommerce categories call and label | Update import and UI strings to Fifozone OMS. |
| 29 | `client/src/pages/inventory/EditProductPage.jsx` | 6, 36, 455 | Client UI | WooCommerce categories call and label | Update import and UI strings to Fifozone OMS. |
| 30 | `client/src/pages/settings/SettingsPage.jsx` | 69–71, 131, 300–343 | Client UI | WooCommerce credentials tab | Update tab to Fifozone OMS API (API Key configuration). |

---

## 4. Gap Analysis: Fifozone OMS vs Legacy WooCommerce Requirements

To enable 100% removal of `woocommerce.service.js` and `@woocommerce/woocommerce-rest-api`, `fifozoneOms.service.js` requires the addition of the following three methods:

### 1. Order Fetching: `FifozoneOmsService.pullOrders(options)`
- **OMS Endpoint**: `GET https://fifozone.com/wp-json/oms/v1/orders`
- **Headers**: `X-OMS-Key: <key>`
- **Query Params**: `limit=100`, `page=1`, `status=processing,pending,completed,...`
- **Output Transformation**: Normalizes OMS order schema into internal dashboard `Order` schema:
  - `platformOrderId: String(order.id)`
  - `customer: { name: order.billing.full_name, phone: order.billing.phone, email: ... }`
  - `shippingAddress: { line1: order.billing.address_1, city: order.billing.city, state: order.billing.state, pincode: order.billing.postcode }`
  - `items: order.items.map(i => ({ sku: i.sku || '', name: i.name, platformProductId: String(i.product_id), quantity: i.quantity, unitPrice: i.total / i.quantity }))`
  - `totalAmount: order.total`
  - `platformStatus: order.status`

### 2. Category Tree Navigation: `FifozoneOmsService.getCategoryTree()`
- **OMS Endpoint**: `GET https://fifozone.com/wp-json/oms/v1/categories?format=tree`
- **Headers**: `X-OMS-Key: <key>`
- **Output Transformation**: Directly outputs Ant Design `TreeSelect` compatible tree nodes `{ title: cat.name, value: `${cat.id}|${cat.name}`, children: [...] }`.

### 3. Category Resolution: `FifozoneOmsService.resolveCategoryId(name, parentId)`
- **OMS Endpoint**: `GET https://fifozone.com/wp-json/oms/v1/categories`
- Caches results in-memory and resolves category IDs without REST overhead.

---

## 5. Verification & Test Plan Recommendations

1. **Static Grep Verification**:
   - Automated script scanning for:
     - `@woocommerce/woocommerce-rest-api` in `node_modules` and `package.json`.
     - `wc/v3` or `/wp-json/wc/v3` in any `.js`, `.json`, or `.jsx` file.
     - `WooCommerceRestApi` class constructor usage.
2. **Read-Only Automated Test Suite**:
   - Unit test for `FifozoneOmsService.pullProducts({ limit: 1 })`.
   - Unit test for `FifozoneOmsService.getCategoryTree()`.
   - Unit test for `FifozoneOmsService.pullOrders({ limit: 1 })`.
   - Unit test for `FifozoneOmsService.testConnection()`.
   - Safe mock tests for write endpoints (`createProduct`, `updateProduct`, `deleteProduct`, `pushStock`, `pushPrice`).
