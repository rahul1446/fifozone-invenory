# Project: Fifozone WooCommerce REST to Custom OMS API Migration

## Architecture
The Fifozone backend (`server/`) is a Node.js / Express CommonJS service managing product inventory, orders, platform sync, and imports. 
External communication with Fifozone store is being completely transitioned from the legacy WooCommerce REST API (`/wp-json/wc/v3`) and `@woocommerce/woocommerce-rest-api` to the custom Fifozone Universal OMS REST API (`https://fifozone.com/wp-json/oms/v1`).

### Data Flow
1. **Catalog Sync & Micro-updates**:
   - `FifozoneOmsService` interacts with `https://fifozone.com/wp-json/oms/v1/products` and `/products/update` for atomic stock and price sync.
2. **Order Sync (`SyncService`)**:
   - Background cron (`jobs/index.js`) and manual triggers run `syncOrders()`, which calls `FifozoneOmsService.pullOrders()`. Orders are ingested directly from High-Performance Order Storage (HPOS) via `GET /orders`, deduplicated, stock deducted, and logged in `InventoryLog`.
   - Order status/fulfillment updates route via `FifozoneOmsService.updateOrder()` to `POST /orders/update`.
3. **Category Tree & Resolution**:
   - `platform.controller.js` calls `FifozoneOmsService.getCategoryTree()`, which invokes `GET /categories?format=tree` and returns tree nodes.
   - `product.controller.js` and `import.controller.js` resolve or supply category names directly to OMS endpoints.
4. **Authentication & Config**:
   - Header `X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562`. Configured via `FIFOZONE_OMS_BASE_URL` and `FIFOZONE_OMS_API_KEY`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | OMS Order Ingestion (`pullOrders`) | Fetch orders from `GET /wp-json/oms/v1/orders` supporting pagination, status filters, and mapping to internal Order model | M1 | Survey (Spec guide §3 & Explorer 1/2) |
| 2 | OMS Order Status & Tracking Update (`updateOrder`) | Update order status and tracking details via `POST /wp-json/oms/v1/orders/update` | M1 | Survey (Spec guide §5 & Hub doc) |
| 3 | OMS Category Tree Retrieval (`getCategoryTree`) | Fetch hierarchical category tree via `GET /wp-json/oms/v1/categories?format=tree` formatted for TreeSelect UI | M1 | Survey (Hub doc §2 & Explorer 1/2) |
| 4 | OMS Category Resolution (`resolveCategoryId`, `resolveSubCategoryId`) | Resolve category name to ID or manage cached category lookup via `GET /categories` | M1 | Survey (Explorer 1/2 & Spec guide) |
| 5 | OMS Taxonomies & Brands Lookup (`getTaxonomies`, `getBrands`) | Fetch taxonomies and brands via `GET /taxonomies` and `GET /brands` | M1 | Survey (Spec guide §2 & Live probe) |
| 6 | SyncService Order Workflow Migration | Update `server/src/services/sync.service.js` to ingest orders via `FifozoneOmsService` and remove `WooCommerceService` | M2 | Survey (Explorer 1/2 Area A) |
| 7 | Platform Controller Category Migration | Update `server/src/controllers/platform.controller.js` to route `getWooCommerceCategories` to `FifozoneOmsService.getCategoryTree()` | M2 | Survey (Explorer 1/2 Area B) |
| 8 | Product & Import Controller Category Migration | Update `server/src/controllers/product.controller.js` and `import.controller.js` to use `FifozoneOmsService` | M2 | Survey (Explorer 1/2 Area B) |
| 9 | Settings Model & Controller Alignment | Align `Settings.model.js` and `settings.controller.js` to store Fifozone OMS credentials (`baseURL`, `apiKey`) | M2 | Survey (Explorer 1 Area E) |
| 10 | Legacy Service Wrapper Elimination | Refactor or deprecate `server/src/services/woocommerce.service.js` to eliminate all `@woocommerce/woocommerce-rest-api` and `wc/v3` calls, redirecting cleanly to `FifozoneOmsService` | M3 | Survey (Explorer 1/2 Area C) |
| 11 | Standalone Scripts Migration | Migrate `test_wc_api.js`, `test_wc_farmina.js`, `test_wc_hypo.js`, `test_woo_connection.js` to use `FifozoneOmsService` | M3 | Survey (Explorer 1 Area F) |
| 12 | Package Dependency Uninstallation | Uninstall `@woocommerce/woocommerce-rest-api` from `server/package.json` and remove legacy env variables from `server/.env` | M3 | Survey (Explorer 1/2 Area 1) |
| 13 | Automated Zero-wc/v3 Scanner | Create automated scan script `server/scripts/verify_zero_wc.js` that verifies 0 remaining `wc/v3` or legacy client instantiations | M4 | Requirements R1 & Acceptance Criteria |
| 14 | Safe Automated Unit / Integration Test Suite | Automated Jest test suite with mocked write operations and read-only live checks for catalog, orders, categories, stock/price | M4 | Requirements R3 & Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Fifozone OMS Service Expansion | Implement missing order, category, and taxonomy methods in `server/src/services/fifozoneOms.service.js` | none | DONE |
| M2 | Service & Controller Consumer Migration | Migrate `sync.service.js`, `platform.controller.js`, `product.controller.js`, `import.controller.js`, `settings.controller.js`, `Settings.model.js` to `FifozoneOmsService` | M1 | DONE |
| M3 | Elimination of Legacy Package & Scripts | Refactor `woocommerce.service.js`, migrate test scripts, uninstall `@woocommerce/woocommerce-rest-api`, clean `server/.env` | M2 | IN_PROGRESS |
| M4 | Final Milestone: E2E Verification & Hardening | Run automated scanner script and Jest test suite (mocking writes, read-only live checks) achieving 100% pass | M3 | PLANNED |

---

## Interface Contracts

### `FifozoneOmsService` Methods Contract
```javascript
// Order Ingestion
FifozoneOmsService.pullOrders(options = {})
// Input: { page = 1, limit = 100, status, search, modified_after }
// Output: Array of normalized order objects matching internal Order model:
// [{
//    platformOrderId: String,
//    number: String,
//    platformStatus: String,
//    orderDate: Date,
//    customer: { name, email, phone },
//    shippingAddress: { line1, line2, city, state, pincode, country },
//    items: [{ sku, name, platformProductId, quantity, unitPrice, total }],
//    totalAmount: Number,
//    shippingCharge: Number,
//    paymentMethod: String,
//    paymentStatus: String,
//    raw: Object
// }]

// Order Fulfillment Update
FifozoneOmsService.updateOrder(orderId, updateData = {})
// Input: orderId (String|Number), updateData: { status, tracking_number, carrier }
// Output: { success: Boolean, orderId, status, raw: Object }

// Category Tree Navigation
FifozoneOmsService.getCategoryTree()
// Output: Array of tree nodes for UI TreeSelect:
// [{
//    title: String,
//    value: String ("id|name"),
//    key: String,
//    children: [...]
// }]

// Category Resolution
FifozoneOmsService.resolveCategoryId(name, parentId = 0)
// Input: name (String), parentId (Number)
// Output: Number (categoryId) or null

FifozoneOmsService.resolveSubCategoryId(categoryName, subCategoryName)
// Output: { categoryId, subCategoryId }
```

### `SyncService` Integration Contract
- `SyncService.syncOrders()` loops over platforms:
  ```javascript
  { service: FifozoneOmsService, key: 'fifozone' }
  ```
- Calls `FifozoneOmsService.pullOrders()` and updates local MongoDB orders.

---

## Code Layout
```
server/
├── src/
│   ├── services/
│   │   ├── fifozoneOms.service.js   # [M1] Core OMS API client & all operations
│   │   ├── sync.service.js          # [M2] Order sync, stock/price push
│   │   └── woocommerce.service.js   # [M3] Legacy wrapper refactored to delegate to fifozoneOms
│   ├── controllers/
│   │   ├── platform.controller.js   # [M2] Category tree route handler
│   │   ├── product.controller.js    # [M2] Product creation / category resolution
│   │   ├── import.controller.js     # [M2] CSV/Excel product import
│   │   └── settings.controller.js   # [M2] Credentials handler
│   ├── models/
│   │   └── Settings.model.js        # [M2] Settings schema
│   └── routes/
│       └── platform.routes.js       # [M2] Platform routes
├── scripts/
│   └── verify_zero_wc.js            # [M4] Automated scanner script verifying 0 wc/v3 calls
├── tests/
│   ├── fifozoneOms.test.js          # [M4] Safe Jest test suite (mocked writes, read-only live checks)
│   └── scan_wc.test.js              # [M4] Jest test wrapping verify_zero_wc scanner
├── package.json                     # [M3] Dependencies manifest (remove @woocommerce/woocommerce-rest-api)
└── .env                             # [M3] Environment variables
```
