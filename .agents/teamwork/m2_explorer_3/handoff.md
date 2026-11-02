# Milestone 2 Handoff Report: Import Controller & Settings Migration

## 1. Observation
1. **`server/src/controllers/import.controller.js`**:
   - Line 8 imports legacy service: `const WooCommerceService = require('../services/woocommerce.service');`
   - Lines 230 & 263 call `const client = await WooCommerceService.getClient();`
   - Lines 237, 242, 253, 265 invoke `WooCommerceService.resolveSubCategoryId(client, catName, subCatName)` and `WooCommerceService.resolveCategoryId(client, catName)`.
   - Lines 393–396 contain legacy comment/log: `// Push to WooCommerce asynchronously (don't await — keep import fast)` and `logger.error('[Import] WooCommerce push failed for ...')`.
2. **`server/src/models/Settings.model.js`**:
   - Lines 23–29 define `woocommerce: { siteUrl, consumerKey, consumerSecret, isConfigured }`.
   - No `fifozoneOms` field exists in `SettingsSchema`.
3. **`server/src/controllers/settings.controller.js`**:
   - Line 29 destructures `woocommerce` from `req.body`, but does not handle `fifozoneOms`.
   - Lines 63–68 update `settings.woocommerce.siteUrl`, `consumerKey`, `consumerSecret`, and `isConfigured`.
   - Only `testShiprocketConnection` exists for third-party validation; no OMS connection testing is implemented.
4. **`server/src/services/fifozoneOms.service.js`**:
   - Line 1114 implements `resolveCategoryId(name, parentId = 0)` returning numeric ID or `null`.
   - Line 1182 implements `resolveSubCategoryId(categoryName, subCategoryName)` returning `{ categoryId, subCategoryId }`.
   - Line 1025 implements `clearCategoryCache()`.
   - In-memory cache is warmed automatically from `GET /categories` with a 1-hour TTL (`_categoryCacheTTL = 3600000`).
   - Line 1303 implements `testConnection(options = null)`.
5. **Existing Test Suite & Codebase Audit**:
   - Running `npm test --prefix server` executed 4 test suites (99 tests passed, 0 failures).
   - Running `node server/scripts/verify_zero_wc.js server` flagged 24 legacy occurrences, all concentrated in `woocommerce.service.js`, root scripts (`test_wc_*.js`, `test_woo_connection.js`), `.env`, `.env.example`, and `package.json`. No violations were in `import.controller.js` or `settings.controller.js` for `wc/v3` endpoints or package imports, but `import.controller.js` depends directly on `woocommerce.service.js`.

## 2. Logic Chain
1. *From Observation 1*: `import.controller.js` directly requires `woocommerce.service.js` and calls `getClient()`, `resolveCategoryId()`, and `resolveSubCategoryId()`.
2. *From Observation 4*: `FifozoneOmsService` already implements `resolveCategoryId(name, parentId)` and `resolveSubCategoryId(categoryName, subCategoryName)` with internal client singleton management, memoized tree/flat caching, and identical return formats (`number|null` and `{ categoryId, subCategoryId }`).
3. *Deduction*: `import.controller.js` can replace `WooCommerceService` with `FifozoneOmsService` without requiring any client acquisition calls (`getClient()`), while retaining identical category array formatting (`${id}|${name}`) in MongoDB `Product.category`.
4. *From Observation 4 regarding caching*: `FifozoneOmsService` caches category lookups with a 1-hour TTL. In CSV import workflows, preserving the in-memory cache across row iterations avoids making thousands of redundant HTTP requests. Cache clearing should remain at batch boundaries or scheduled sync triggers rather than per-row.
5. *From Observation 2 & 3*: Store settings in MongoDB are managed via `Settings.model.js` and `settings.controller.js`. Currently, `Settings.model.js` lacks `fifozoneOms: { baseURL, apiKey, isConfigured }`.
6. *Deduction*: Adding `fifozoneOms` to `SettingsSchema` while keeping `woocommerce` for backward compatibility guarantees that existing database documents remain valid. Updating `settings.controller.js` to process and persist `fifozoneOms` alongside a dedicated `testFifozoneOmsConnection` route enables frontend settings management and connection diagnostics for Fifozone OMS.

## 3. Caveats
- No unit tests currently exist specifically targeting `import.controller.js` or `settings.controller.js`. When implementing Milestone 2, test cases should be added to `server/tests/` to verify CSV category resolution with mocked `FifozoneOmsService` responses and settings persistence.
- Frontend `SettingsPage.jsx` currently sends `woocommerce` credentials. Adding `fifozoneOms` support in the backend controller provides immediate readiness for the frontend settings UI transition.
- Live OMS category API does not create categories on the fly; it resolves existing WordPress categories or falls back to searching. If a category does not exist, `FifozoneOmsService.resolveCategoryId` safely returns `null`, and `import.controller.js` falls back to the raw name.

## 4. Conclusion
Milestone 2 migration for `import.controller.js`, `Settings.model.js`, and `settings.controller.js` is fully mapped and ready for execution:
1. In `import.controller.js`, replace `WooCommerceService` with `FifozoneOmsService`, remove `getClient()` calls, and delegate category/subcategory resolution directly to `FifozoneOmsService.resolveCategoryId` and `resolveSubCategoryId`.
2. In `Settings.model.js`, add `fifozoneOms: { baseURL, apiKey, isConfigured }` schema definition.
3. In `settings.controller.js`, accept and validate `fifozoneOms` in `updateSettings`, expose safe defaults in `getSettings`, and introduce `testFifozoneOmsConnection`.
4. In `settings.routes.js`, register `POST /test-fifozone-oms`.

All proposed changes strictly preserve backward compatibility and adhere to the Zero-WooCommerce target architecture.

## 5. Verification Method
1. **Automated Test Suite**:
   ```powershell
   npm test --prefix server
   ```
   Must pass 100% of tests.
2. **Scanner Verification**:
   ```powershell
   node server/scripts/verify_zero_wc.js server
   ```
   Ensure no new legacy references are introduced.
3. **Code Inspection**:
   - Inspect `server/src/controllers/import.controller.js` to confirm zero references to `woocommerce.service.js`.
   - Inspect `server/src/models/Settings.model.js` to confirm `fifozoneOms` schema definition.
   - Inspect `server/src/controllers/settings.controller.js` to confirm `fifozoneOms` handling and `testFifozoneOmsConnection`.
