# Fifozone Codebase Architecture, Environment, and Integration Report

**Survey Agent**: `explorer_survey_2`  
**Working Directory**: `c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_2`  
**Date**: November 2, 2026  
**Reference Documents**:
- `ORIGINAL_REQUEST.md`
- `c:\Users\uttim\Downloads\fi\fifozone_oms_api_complete_guide.md`
- `c:\Users\uttim\Downloads\justcategoriszong\fifozone_universal_hub_documentation.md`

---

## Executive Summary

The repository `c:\Users\uttim\Downloads\fi` is a production-grade full-stack MERN application ("Fifozone MERN Dashboard") comprising a CommonJS Node/Express backend (`server/`) and a React/Vite frontend SPA (`client/`). The backend centralizes inventory, products, orders, and promotions across Fifozone and marketplace channels (Amazon SP-API, Flipkart, Meesho).

While product synchronization was partially migrated to a nascent `FifozoneOmsService` (`server/src/services/fifozoneOms.service.js`), active legacy WooCommerce REST API calls (`wc/v3` via `@woocommerce/woocommerce-rest-api`) still power order synchronization (`pullOrders`), category resolution (`resolveCategoryId`, `resolveSubCategoryId`), category tree construction (`getCategoryTree`), variation updates, and product ID lookups. Additionally, 4 standalone diagnostic scripts directly instantiate `@woocommerce/woocommerce-rest-api`.

Crucially, while Jest `^29.7.0` and Supertest `^7.0.0` are present in `server/package.json` devDependencies, **zero test files (`*.test.js` or `__tests__`) currently exist**, causing `npm test` to exit with error code 1 (`No tests found`). This report outlines the architectural map, identifies all legacy dependencies and consumers, and defines an atomic integration blueprint to replace legacy WooCommerce REST calls with Fifozone Custom OMS Hub endpoints safely and verifiably.

---

## 1. Package Manager, Dependencies, and Scripts

### 1.1 Repository Structure & Package Management
The workspace uses `npm` (lockfile version 3). The root directory houses documentation and utility scripts alongside two distinct applications:
- Root: `package-lock.json` (minimal root lockfile; submodules manage dependencies)
- Backend: `server/package.json` with dedicated `server/package-lock.json` and `server/node_modules/`
- Frontend: `client/package.json` with dedicated `client/node_modules/`

### 1.2 Backend Runtime & Dependency Profile (`server/package.json`)
- **Module System**: CommonJS (`"type": "commonjs"`)
- **Main Entrypoint**: `server.js`
- **Node Scripts**:
  ```json
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --detectOpenHandles --forceExit"
  }
  ```
- **Target Package for Removal**:
  - `@woocommerce/woocommerce-rest-api: ^1.0.2` (Target for complete elimination per Requirement R1)
- **Relevant Production Dependencies for Fifozone OMS Integration**:
  - `axios: ^1.16.1` — Used for all Fifozone OMS HTTP communications (`X-OMS-Key` header authentication)
  - `express: ^4.19.2` — Core HTTP routing and middleware framework
  - `mongoose: ^8.4.0` — MongoDB Object Data Modeling (ODM)
  - `node-cron: ^3.0.3` — Background scheduled synchronization jobs
  - `winston: ^3.13.0` — Standard application logging
  - `socket.io: ^4.7.5` — Real-time event propagation to frontend clients
  - Security middlewares: `helmet: ^7.1.0`, `cors: ^2.8.5`, `express-mongo-sanitize: ^2.2.0`, `hpp: ^0.2.3`, `express-rate-limit: ^7.2.0`
  - Validation: `joi: ^17.13.1`
- **Dev Dependencies**:
  - `jest: ^29.7.0` — Test runner
  - `supertest: ^7.0.0` — HTTP integration testing
  - `nodemon: ^3.1.0` — Development server file watcher
  - `concurrently: ^10.0.0` — Process management

### 1.3 Frontend Dependency Profile (`client/package.json`)
- **Build Tooling**: Vite `^5.2.11` + `@vitejs/plugin-react: ^4.3.0`
- **Framework**: React 18 (`react: ^18.3.1`, `react-dom: ^18.3.1`)
- **Styling & UI**: Tailwind CSS `^3.4.3`, Ant Design (`antd: ^5.17.4`), `lucide-react: ^0.379.0`
- **State & Data**: `@reduxjs/toolkit: ^2.2.5`, `axios: ^1.6.8`
- **Frontend Interaction with WooCommerce/Fifozone**:
  - Frontend makes **no direct calls** to WooCommerce or Fifozone OMS. All requests route through the backend Express API (`/api/platforms/woocommerce/categories`, `/api/products`, `/api/orders`, `/api/platforms/sync-now`).

---

## 2. Architecture of Services, Controllers, Models, and Jobs

The backend implements a classic layered architectural pattern:
```
server.js (Bootstrap: DB, seed admin, socket, cron init)
   │
   ├── src/app.js (Express app, security middlewares, route mounting)
   │      │
   │      ├── src/routes/ (*.routes.js)
   │      │      │
   │      │      └── src/controllers/ (*.controller.js)
   │      │             │
   │      │             ├── src/services/ (*.service.js)
   │      │             └── src/models/ (*.model.js)
   │      │
   └── src/jobs/index.js (node-cron scheduler invoking SyncService)
```

### 2.1 Services Layer (`server/src/services/`)
- **`sync.service.js`** (515 lines): The central orchestration hub for multi-channel synchronization:
  - `syncAllPlatforms()`: Triggers full catalog and order synchronization.
  - `syncProducts()`: Iterates registered platforms (`fifozone`, `amazon`, `flipkart`, `meesho`), pulls product catalogs, updates or creates `Product` documents, and reconciles deleted/stale platform listings.
  - `syncOrders()`: Iterates platforms, pulls orders via platform services, resolves internal product references by SKU, deducts inventory stock, writes `InventoryLog` records, creates unified `Order` documents, and fires notifications.
  - `pushStockToPlatforms(product)`: Synchronizes stock counts across all active platform listings.
  - `pushPriceToPlatforms(product)`: Synchronizes pricing across platforms.
  - `pushProductCreate(product)`, `pushProductUpdate(product)`, `pushProductDelete(product)`: High-level push wrappers for Fifozone platform modifications.
- **`fifozoneOms.service.js`** (435 lines): The new dedicated client for the custom Fifozone OMS REST API (`https://fifozone.com/wp-json/oms/v1`):
  - Uses `axios.create()` with `X-OMS-Key` header authentication.
  - Implements: `pullProducts`, `createProduct`, `createProductsBatch`, `updateProduct`, `updateProductsBatch`, `pushStock`, `pushPrice`, `deleteProduct`, `deleteProductsBatch`, `testConnection`.
  - **Gaps**: Currently lacks `pullOrders`, `updateOrderStatus`, `getCategoryTree`, and `resolveCategoryId`.
- **`woocommerce.service.js`** (543 lines): The legacy WooCommerce REST service (`@woocommerce/woocommerce-rest-api`):
  - Instantiates `WooCommerceRestApi` with `version: 'wc/v3'` using credentials from `PlatformCredential` or environment variables.
  - Contains active methods for category tree generation, category ID resolution (with auto-creation in WooCommerce), variation syncing, SKU/name product lookups, and order pulling.
  - Partially redirects `pullProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `pushStock`, and `pushPrice` to `FifozoneOmsService`.

### 2.2 Controllers Layer (`server/src/controllers/`)
- **`product.controller.js`** (579 lines): Handles product listing, creation, updates, soft deletion, and CSV bulk imports (`importProductsFromCsv`).
  - Directly requires `woocommerce.service.js` at line 8.
  - Line 443 calls `WooCommerceService.getClient()` and `WooCommerceService.resolveCategoryId(...)` during CSV product imports.
  - Create/Update/Delete routes invoke `SyncService.pushProductCreate/Update/Delete`.
- **`import.controller.js`** (523 lines): Handles bulk file imports (Excel/CSV) and batch ingestion.
  - Directly requires `woocommerce.service.js` at line 8.
  - Lines 230–275 invoke `WooCommerceService.getClient()`, `WooCommerceService.resolveSubCategoryId(...)`, and `WooCommerceService.resolveCategoryId(...)` to build `id|name` composite category values.
- **`platform.controller.js`** (115 lines): Manages platform connection status, manual sync triggers, credentials, and category trees.
  - Directly requires `woocommerce.service.js` at line 7.
  - Line 20 exposes `getWooCommerceCategories` calling `WooCommerceService.getCategoryTree()`.
  - Line 75 already calls `FifozoneOmsService.testConnection()` for platform `fifozone`.
- **`order.controller.js`** (472 lines): Handles order listing, filtering, and manual status updates (`updateOrderStatus`, `bulkUpdateStatus`).
  - Adjusts stock and writes `InventoryLog` records on order cancellations.
- **`settings.controller.js`** (155 lines): Reads and updates global settings, including the legacy `woocommerce` credential block (`siteUrl`, `consumerKey`, `consumerSecret`).

### 2.3 Models Layer (`server/src/models/`)
- **`Product.model.js`**: Key multi-platform catalog schema.
  - Uses key `fifozone`: `sellingPrice.fifozone`, `stockByPlatform.fifozone`, `platformIds.fifozone` (`productId`, `variationId`, `slug`, `url`), `platformStatus.fifozone` (`active`, `inactive`, `draft`, `not_listed`).
- **`Order.model.js`**: Unified multi-channel order schema.
  - `platform: { type: String, enum: ['fifozone', 'amazon', 'flipkart'], required: true }`.
  - Normalizes line items, prices, billing/shipping addresses, and status history.
- **`PlatformCredential.model.js`**: Credential store with platform enum `['fifozone', 'amazon', 'flipkart', 'meesho', 'shiprocket']`.
- **`PlatformSync.model.js`**: Stores sync telemetry (`syncing`, `synced`, `error`, product counts, timestamps).
- **`Settings.model.js`**: Global store configuration including `woocommerce` subdocument.

### 2.4 Background Jobs (`server/src/jobs/index.js`)
Configured via `node-cron`:
1. `*/10 * * * *` (Every 10 minutes): `SyncService.syncOrders()` — **Active consumer of WooCommerce order sync**.
2. `0 * * * *` (Hourly): `SyncService.syncProducts()` — Uses `FifozoneOmsService.pullProducts()`.
3. `0 0 * * *` (Daily Midnight): Low-stock alerts, slow-moving/dead inventory flagging, and daily executive sales summaries.
4. `*/30 * * * *`: Customer directory sync from order records.
5. `0 * * * *`: Promotion expiration and price restoration.
6. `0 */2 * * *`: Reviews sync.

---

## 3. Detailed Survey: WooCommerce Service Structure & Consumption

### 3.1 Structure of `woocommerce.service.js`
The file `server/src/services/woocommerce.service.js` is structured as follows:

| Section / Method | Lines | Implementation Mechanism | Legacy wc/v3 Dependency |
|---|---|---|---|
| Module Imports | 1–5 | `require('@woocommerce/woocommerce-rest-api').default` | **YES** |
| Constructor & Cache | 27–33 | Initializes `_categoryCache = new Map()` | No |
| `getClient()` | 35–65 | Creates `new WooCommerceRestApi({ ..., version: 'wc/v3', queryStringAuth: true })` | **YES** |
| `parseResponseData(data)` | 68–79 | Cleans BOM character and parses stringified JSON | No |
| `pullProducts(options)` | 82–86 | Forwarded to `FifozoneOmsService.pullProducts(options)` | Clean |
| `resolveCategoryId(...)` | 105–168 | Paginates `client.get('products/categories')` and `client.post('products/categories')` | **YES** |
| `resolveSubCategoryId(...)` | 179–190 | Calls `resolveCategoryId` sequentially for parent then child | **YES** |
| `getCategoryTree()` | 198–251 | Paginates `client.get('products/categories')`, builds nested tree | **YES** |
| `clearCategoryCache()` | 254–256 | `this._categoryCache.clear()` | No |
| `findWooProductId(sku)` | 260–268 | `client.get('products', { sku, per_page: 1 })` | **YES** |
| `findWooProductIdByName(name)` | 271–285 | `client.get('products', { search: name, per_page: 20 })` | **YES** |
| `resolveWooId(product)` | 288–312 | `client.get('products/${wooId}')` validation with SKU/name fallbacks | **YES** |
| `buildWooPayload(product)` | 319–395 | Builds legacy WooCommerce REST JSON payload | No |
| `syncVariations(...)` | 398–436 | `client.get/put/post('products/${wooProductId}/variations')` | **YES** |
| `createProduct(product)` | 439–442 | Forwarded to `FifozoneOmsService.createProduct(product)` | Clean |
| `updateProduct(product, id)` | 445–448 | Forwarded to `FifozoneOmsService.updateProduct(product, id)` | Clean |
| `deleteProduct(product)` | 451–454 | Forwarded to `FifozoneOmsService.deleteProduct(product)` | Clean |
| `pushStock(sku, qty)` | 457–460 | Forwarded to `FifozoneOmsService.pushStock(sku, qty)` | Clean |
| `pushPrice(sku, price)` | 463–466 | Forwarded to `FifozoneOmsService.pushPrice(sku, price)` | Clean |
| `pullOrders()` | 468–538 | Paginates `client.get('orders', { status: [...], per_page: 100 })` | **YES** |

### 3.2 Full Downstream Consumer Inventory

#### Consumer 1: `server/src/services/sync.service.js`
- **Line 1**: `const WooCommerceService = require('./woocommerce.service');`
- **Line 38**: `WooCommerceService.clearCategoryCache();` executed at start of `syncProducts()`.
- **Line 249**: In `syncOrders()`, platform configuration is:
  ```javascript
  const platforms = [
    { service: WooCommerceService, key: 'fifozone' }, // <-- ACTIVE wc/v3 ORDER CALL
    { service: AmazonService,      key: 'amazon'   },
    { service: FlipkartService,    key: 'flipkart' },
  ];
  ```
  This causes the cron job (every 10 minutes) and manual sync to execute `WooCommerceService.pullOrders()`, issuing `client.get('orders')` against WooCommerce `wc/v3`.

#### Consumer 2: `server/src/controllers/platform.controller.js`
- **Line 7**: `const WooCommerceService = require('../services/woocommerce.service');`
- **Line 19–22**:
  ```javascript
  const getWooCommerceCategories = asyncHandler(async (req, res) => {
    const tree = await WooCommerceService.getCategoryTree();
    res.status(200).json(new ApiResponse(200, tree, 'WooCommerce categories retrieved successfully'));
  });
  ```
- **Line 14 of `server/src/routes/platform.routes.js`**: Exposes `GET /api/platforms/woocommerce/categories`, consumed by frontend product creation and editing forms.

#### Consumer 3: `server/src/controllers/product.controller.js`
- **Line 8**: `const WooCommerceService = require('../services/woocommerce.service');`
- **Lines 443–456**: In `importProductsFromCsv`:
  ```javascript
  const client = await WooCommerceService.getClient();
  for (const catName of catNames) {
    ...
    const id = await WooCommerceService.resolveCategoryId(client, catName);
    ...
  }
  ```

#### Consumer 4: `server/src/controllers/import.controller.js`
- **Line 8**: `const WooCommerceService = require('../services/woocommerce.service');`
- **Lines 230–275**: In `importBatchProducts`:
  ```javascript
  const client = await WooCommerceService.getClient();
  // Calls resolveSubCategoryId and resolveCategoryId
  ```

#### Consumer 5: Standalone Diagnostic & Maintenance Scripts
- `server/test_wc_api.js`: Instantiates `WooCommerceRestApi` with `version: 'wc/v3'`.
- `server/test_wc_farmina.js`: Instantiates `WooCommerceRestApi` with `version: 'wc/v3'`.
- `server/test_wc_hypo.js`: Instantiates `WooCommerceRestApi` with `version: 'wc/v3'`.
- `server/test_woo_connection.js`: Instantiates `WooCommerceRestApi` with `version: 'wc/v3'` (lines 16–22, 35–41).
- `server/run_sync.js`: Standalone sync invocation against MongoDB Atlas calling `SyncService.syncAllPlatforms()`.

---

## 4. Existing Test Framework and Execution Status

### 4.1 Framework Setup
- **Configured Runner**: Jest `^29.7.0` configured in `server/package.json` under `"scripts": { "test": "jest --detectOpenHandles --forceExit" }`.
- **Integration Test Tool**: Supertest `^7.0.0` is installed.
- **Jest Configuration File**: No `jest.config.js` or `jest.config.json` is currently present. Jest runs using its default file discovery patterns (`**/__tests__/**/*.[jt]s?(x)`, `**/?(*.)+(spec|test).[tj]s?(x)`).

### 4.2 Test Execution Audit
A synchronous verification run of `npm test` in `server/` yielded:
```text
> fifozone-dashboard-server@1.0.0 test
> jest --detectOpenHandles --forceExit

No tests found, exiting with code 1
Run with `--passWithNoTests` to exit with code 0
In C:\Users\uttim\Downloads\fi\server
  106 files checked.
  testMatch: **/__tests__/**/*.[jt]s?(x), **/?(*.)+(spec|test).[tj]s?(x) - 0 matches
  testPathIgnorePatterns: \\node_modules\\ - 106 matches
  testRegex:  - 0 matches
Pattern:  - 0 matches
```
- **Outcome**: Failed with exit code 1.
- **Root Cause**: Zero automated test files (`*.test.js` or `*.spec.js`) exist in the repository.
- **Existing Mock Framework**:
  - The repository contains no Jest test mocks or fixtures for WooCommerce or Fifozone OMS.
  - While `README.md` mentions `server/src/mocks/` for Amazon/Flipkart/Meesho and `.env` contains `USE_MOCK_API=false`, search reveals that `server/src/mocks/` does not exist and `USE_MOCK_API` is not referenced anywhere in backend code.

---

## 5. Recommended Fifozone OMS Integration Architecture

### 5.1 Fifozone OMS API Endpoint Capabilities
According to `fifozone_oms_api_complete_guide.md` and `fifozone_universal_hub_documentation.md`:
- **Base URL**: `https://fifozone.com/wp-json/oms/v1` (configured via env `FIFOZONE_OMS_BASE_URL`).
- **Auth Header**: `X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562` (configured via env `FIFOZONE_OMS_API_KEY`).
- **Endpoints Available**:
  1. **Products**:
     - `GET /products` (Pagination: `limit`, `page`, `search`, `category`, `modified_after`).
     - `POST /products/create` (Batch or single creation; accepts array of categories directly).
     - `POST /products/update` (Partial update by `id` or `sku`; auto-syncs `wc_product_meta_lookup`).
     - `POST /products/delete` (Permanent or soft delete by `id` or `sku`).
  2. **Categories**:
     - `GET /categories?format=tree` (Returns full category and subcategory hierarchy with `parent_id`).
     - `GET /categories?parent=0` (Top-level parent categories).
     - `GET /categories?parent={id}` (Subcategories of a parent).
  3. **Orders**:
     - `GET /orders` or `GET /hub?include=orders` (Fetches HPOS orders with `id`, `status`, `customer`, `billing`, `shipping`, `items`, `total`, `shipping_tracking`).
     - `POST /hub` with payload `{"action": "batch", "update_orders": [{ "id": 189195, "status": "completed", "tracking_number": "...", "carrier": "..." }]}` for order status and tracking updates.
  4. **Universal Hub (`/hub`)**:
     - Single-call fetch of stats, catalog, taxonomies, and orders via `GET /hub`.
     - Batch execution of create, update, and order operations via `POST /hub`.

### 5.2 Architectural Migration Blueprint

#### Step 1: Augment `FifozoneOmsService` (`server/src/services/fifozoneOms.service.js`)
Expand `FifozoneOmsService` to natively handle all operations currently performed by `WooCommerceService`:
1. **`pullOrders(options)`**:
   - Query `GET /orders` (or `GET /hub?include=orders`).
   - Map OMS order schema into the unified structure expected by `SyncService.syncOrders()`:
     ```javascript
     {
       platformOrderId: String(order.id),
       number: order.number || String(order.id),
       platformStatus: order.status,
       orderDate: order.date_created,
       customer: {
         name: order.billing?.full_name || `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || 'Customer',
         email: order.billing?.email || '',
         phone: order.billing?.phone || ''
       },
       shippingAddress: {
         line1: order.shipping?.address_1 || order.billing?.address_1 || 'N/A',
         line2: order.shipping?.address_2 || order.billing?.address_2 || '',
         city: order.shipping?.city || order.billing?.city || 'Unknown',
         state: order.shipping?.state || order.billing?.state || 'XX',
         pincode: order.shipping?.postcode || order.billing?.postcode || '000000'
       },
       items: (order.items || order.line_items || []).map(item => ({
         sku: item.sku || '',
         name: item.name || 'Unknown Product',
         platformProductId: String(item.product_id || ''),
         quantity: item.quantity,
         unitPrice: parseFloat(item.price || item.total / item.quantity || 0)
       })),
       subtotal: parseFloat(order.total || 0),
       shippingCharge: parseFloat(order.shipping_total || 0),
       totalAmount: parseFloat(order.total || 0),
       paymentMethod: order.payment_method || 'Prepaid',
       paymentStatus: (order.payment_method === 'cod' && !['completed', 'delivered'].includes(order.status)) ? 'pending' : 'paid'
     }
     ```
2. **`getCategoryTree()`**:
   - Query `GET /categories?format=tree` (or extract `taxonomies.categories_tree` from `/hub`).
   - Format into the Ant Design `TreeSelect` compatible structure (`title`, `value: "${cat.id}|${cat.name}"`, `children`).
3. **`resolveCategoryId(name, parentId)` & `resolveSubCategoryId(categoryName, subCategoryName)`**:
   - In Fifozone OMS, taxonomy terms are auto-resolved on the WordPress backend when category names/slugs are sent in the `categories` array on `/products/create` or `/products/update`.
   - Provide helper methods in `FifozoneOmsService` that query `/categories` and return cached `id` or composite `id|name` strings so controllers requiring category resolution remain 100% backward compatible without using legacy `wc/v3`.
4. **`updateOrderStatus(orderId, status, trackingData)`**:
   - Post to `POST /hub` with `update_orders: [{ id: orderId, status, ...trackingData }]`.

#### Step 2: Reroute Service Callers
1. In `server/src/services/sync.service.js`:
   - Replace `const WooCommerceService = require('./woocommerce.service');` with `FifozoneOmsService`.
   - In `syncOrders()`, update platform registration:
     ```javascript
     const platforms = [
       { service: FifozoneOmsService, key: 'fifozone' }, // Route to OMS!
       { service: AmazonService,      key: 'amazon'   },
       { service: FlipkartService,    key: 'flipkart' },
     ];
     ```
   - In `syncProducts()`, remove `WooCommerceService.clearCategoryCache()`.
2. In `server/src/controllers/platform.controller.js`:
   - Replace `WooCommerceService.getCategoryTree()` with `FifozoneOmsService.getCategoryTree()`.
3. In `server/src/controllers/product.controller.js`:
   - Replace `WooCommerceService` category resolution calls with `FifozoneOmsService`.
4. In `server/src/controllers/import.controller.js`:
   - Replace `WooCommerceService` category resolution calls with `FifozoneOmsService`.

#### Step 3: Deprecate / Adapt `woocommerce.service.js`
Replace `server/src/services/woocommerce.service.js` completely or transform it into a lightweight wrapper that re-exports `FifozoneOmsService`, eliminating `@woocommerce/woocommerce-rest-api` entirely.

#### Step 4: Eliminate `@woocommerce/woocommerce-rest-api` Dependency
1. Run `npm uninstall @woocommerce/woocommerce-rest-api` in `server/`.
2. Clean up standalone scripts (`test_wc_api.js`, `test_wc_farmina.js`, `test_wc_hypo.js`, `test_woo_connection.js`) by updating them to use `FifozoneOmsService` or moving them to an archive directory.

---

## 6. Safe Read-Only Testing and Mocking Strategy

Requirement R3 mandates:
> Live API calls against `https://fifozone.com/wp-json/oms/v1` during testing must be read-only; all write, update, or delete operations must use mocks or stubs during automated tests to avoid altering live production store data.

### 6.1 Jest Unit & Integration Test Architecture
Create a formal test suite in `server/src/__tests__/` (or `server/__tests__/`):
```
server/
├── __tests__/
│   ├── fifozoneOms.service.test.js    # Unit tests with Axios mocked
│   ├── sync.service.test.js           # Sync orchestration with mocked services
│   ├── platform.controller.test.js   # Route & category endpoint tests
│   └── codeIntegrity.test.js          # Static scan verifying zero wc/v3 calls
```

### 6.2 Mocking Strategy for Write Operations
- In unit and CI tests, mock `axios` or use `axios-mock-adapter` so that any `POST`, `PUT`, or `DELETE` call to `/products/create`, `/products/update`, `/products/delete`, or `/hub` returns mock success payloads without hitting the network:
  ```javascript
  jest.mock('axios', () => {
    const mockAxios = {
      create: jest.fn(() => mockAxios),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    return mockAxios;
  });
  ```
- **Test Scenarios to Cover**:
  1. `pullProducts`: Handles multi-page traversal, HTML decoding, and default stock fallback.
  2. `pullOrders`: Correctly normalizes HPOS orders, items, pricing, and customer billing data.
  3. `createProduct` / `createProductsBatch`: Verifies payload formatting, images, tax rates, and handles SKU collision responses.
  4. `updateProduct` / `updateProductsBatch`: Verifies partial update payloads and SKU/id matching.
  5. `pushStock` and `pushPrice`: Verifies lightweight payload generation.
  6. `deleteProduct`: Verifies force flag and single/batch payload structure.
  7. `getCategoryTree`: Verifies parent-child taxonomy tree formatting.

### 6.3 Safe Live Read-Only Smoke Test
Create a dedicated standalone verification script `server/test_oms_readonly.js` (or a dedicated integration test flag):
- Executes `GET https://fifozone.com/wp-json/oms/v1/products?limit=1`
- Executes `GET https://fifozone.com/wp-json/oms/v1/categories?parent=0`
- Executes `GET https://fifozone.com/wp-json/oms/v1/orders?limit=1`
- Asserts that only HTTP `GET` methods are dispatched.
- Intercepts and strictly throws an error if any `POST`, `PUT`, or `DELETE` method is attempted against the live URL.

### 6.4 Automated Verification Scan Script
Create `server/verify_no_wc_v3.js` to satisfy Acceptance Criterion 1:
- Scans all files in `server/src/`, `server/server.js`, and root scripts for:
  - `@woocommerce/woocommerce-rest-api`
  - `/wp-json/wc/v3`
  - `wc/v3`
  - `WooCommerceRestApi`
- Asserts zero matches across all active runtime code.

---

## 7. Architectural Risk Analysis & Recommendations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Category tree mismatch in frontend | High — frontend TreeSelect dropdowns may fail to render | Ensure `FifozoneOmsService.getCategoryTree()` returns identical `{ title, value: "${id}|${name}", children }` structure expected by `AddProductPage.jsx` and `EditProductPage.jsx`. Keep backend route `/platforms/woocommerce/categories` as an alias or redirect to avoid breaking client API calls. |
| Order schema discrepancy between WooCommerce & OMS | High — Order ingestion could fail or drop line items | The OMS `/orders` and `/hub` endpoints return HPOS-compatible order structures. Normalizer must handle both array `items` and `line_items` transparently. |
| Accidental live write during automated testing | Critical — could corrupt live store products or orders | Enforce Axios mocking in all Jest tests. Provide a guard in `FifozoneOmsService` that blocks non-GET requests if `NODE_ENV === 'test'` unless explicitly bypassed by a mocked client. |
| Broken cron order sync | Medium — order ingestion halts | Update `syncOrders()` in `sync.service.js` to reference `FifozoneOmsService` and verify with a mocked order payload test before deployment. |
