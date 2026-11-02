# BRIEFING — 2026-11-02T15:37:00Z

## Mission
Audit the entire codebase in c:\Users\uttim\Downloads\fi for all occurrences of WooCommerce API calls, client usage, methods, payloads, queries, and operations.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, analysis, synthesis
- Working directory: c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_1
- Original parent: 40b54eaa-1f4d-4163-940f-a47aef329f48
- Milestone: Milestone 1 - Discovery & Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Only write within c:\Users\uttim\Downloads\fi\.agents\teamwork\explorer_survey_1\

## Current Parent
- Conversation ID: 40b54eaa-1f4d-4163-940f-a47aef329f48
- Updated: 2026-11-02T15:37:00Z

## Investigation State
- **Explored paths**:
  - `server/package.json`, `server/.env`
  - `server/src/services/` (`woocommerce.service.js`, `fifozoneOms.service.js`, `sync.service.js`)
  - `server/src/controllers/` (`import.controller.js`, `product.controller.js`, `platform.controller.js`, `settings.controller.js`, `order.controller.js`, `inventory.controller.js`, `review.controller.js`, `message.controller.js`)
  - `server/src/routes/platform.routes.js`
  - `server/src/models/` (`Settings.model.js`, `PlatformCredential.model.js`, `PlatformSync.model.js`, `Product.model.js`, `Order.model.js`)
  - `server/src/jobs/index.js`
  - `server/` test & utility scripts (`test_wc_api.js`, `test_wc_farmina.js`, `test_wc_hypo.js`, `test_woo_connection.js`, `run_sync.js`, `fix_sync.js`, `rename_cred.js`, `check_orders.js`)
  - `client/src/` (`api/platformApi.js`, `pages/inventory/AddProductPage.jsx`, `pages/inventory/EditProductPage.jsx`, `pages/apps/FifozoneAppPage.jsx`, `pages/settings/SettingsPage.jsx`, `pages/settings/PlatformSettingsPage.jsx`, `components/inventory/ImportWizard.jsx`)
- **Key findings**:
  - Identified all 5 active files instantiating `@woocommerce/woocommerce-rest-api` with `version: 'wc/v3'`.
  - Dissected all methods in `woocommerce.service.js`: `pullOrders`, `resolveCategoryId`, `resolveSubCategoryId`, `getCategoryTree`, `findWooProductId`, `resolveWooId`, `syncVariations`, and `buildWooPayload`.
  - Identified the primary active production link: `SyncService.syncOrders()` invokes `WooCommerceService.pullOrders()` every 10 minutes via cron.
  - Category resolution in `import.controller.js` and `product.controller.js` invokes `WooCommerceService.resolveCategoryId` / `resolveSubCategoryId`.
  - Frontend route `/platforms/woocommerce/categories` maps to `platform.controller.js` -> `WooCommerceService.getCategoryTree()`.
  - Fifozone OMS API (`/categories?format=tree`, `/orders`, `/hub`, `/products`) has full parity for these operations.
- **Unexplored areas**: None. Codebase audit is 100% complete across server and client.

## Key Decisions Made
- Categorized all occurrences into 7 clear structural zones: Dependencies, Service Layer, Controllers/Routes, Sync Jobs/Cron, Models/Settings, Test/Maintenance Scripts, and Client UI/API.

## Artifact Index
- analysis.md — Full audit report of WooCommerce API calls and usage
- handoff.md — Self-contained 5-component handoff report
- progress.md — Heartbeat and task progress tracker
