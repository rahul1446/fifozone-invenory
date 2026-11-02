# Task Assignment: E2E Test Suite & Zero-WC Scanner Creation

**Assigned Agent**: test_writer_1
**Role**: teamwork_test_writer
**Working Directory**: c:\Users\uttim\Downloads\fi\.agents\teamwork\test_writer_1\
**Original Request**: c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Scope**: c:\Users\uttim\Downloads\fi\PROJECT.md
**Test Infra**: c:\Users\uttim\Downloads\fi\TEST_INFRA.md

## Objective
Design and implement the complete opaque-box E2E and unit test suite for the Fifozone OMS API migration:
1. **Automated Scanner Script**: Create `server/scripts/verify_zero_wc.js`.
   - Recursively scans `server/src/`, `server/scripts/`, `server/*.js`, `server/package.json`, and `server/.env` (excluding `node_modules` and `.git`).
   - Flags any occurrence of:
     - `/wp-json/wc/v3` or `wc/v3`
     - `@woocommerce/woocommerce-rest-api`
     - `new WooCommerceRestApi`
     - Legacy consumer key/secret configuration references
   - Exits with code 0 if 0 occurrences found; exits with code 1 and prints offending files and lines if found.
2. **Jest Test Suite**: Create `server/tests/fifozoneOms.test.js` and `server/tests/verify_zero_wc.test.js`.
   - Covers:
     - Tier 1: Product catalog retrieval (`pullProducts`), single product by ID/SKU, category tree (`getCategoryTree`), root categories (`getCategories`), order ingestion (`pullOrders`), connection test (`testConnection`).
     - Tier 2: Boundary & error cases (empty payloads, 401 unauthorized handling, non-existent SKU/ID, missing params).
     - Tier 3: Category resolution (`resolveCategoryId`, `resolveSubCategoryId`) and stock/price push (`pushStock`, `pushPrice`).
     - Tier 4: Order status update (`updateOrder`) and batch actions.
   - **MANDATORY SAFE TESTING (R3)**: All write/update/delete operations (`POST /products/create`, `POST /products/update`, `POST /products/delete`, `POST /orders/update`, `POST /hub`) MUST use Jest mocks/stubs for Axios to strictly prevent modifying live production store data. Live network calls during testing are strictly restricted to read-only `GET` endpoints.
3. **Publish TEST_READY.md**:
   - Write `TEST_READY.md` at project root `c:\Users\uttim\Downloads\fi\TEST_READY.md` summarizing test tiers, runner command (`cd server && npm test`), and feature checklist.
4. **Verification**:
   - Run the tests with `npm test` inside `server/` to confirm Jest executes and reports proper results.
   - Write `handoff.md` and report completion to parent.

## 2026-11-02T15:40:37Z
Sender: 40b54eaa-1f4d-4163-940f-a47aef329f48
You are assigned as test_writer_1.
Your working directory is: c:\Users\uttim\Downloads\fi\.agents\teamwork\test_writer_1\
Read your dispatch instructions and original request:
- c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\uttim\Downloads\fi\PROJECT.md
- c:\Users\uttim\Downloads\fi\TEST_INFRA.md
- c:\Users\uttim\Downloads\fi\.agents\teamwork\test_writer_1\DISPATCH.md

Task:
1. Implement the zero-WooCommerce scanner script in `server/scripts/verify_zero_wc.js`.
2. Implement automated Jest tests in `server/tests/fifozoneOms.test.js` and `server/tests/verify_zero_wc.test.js`.
   CRITICAL: Ensure all write operations (create, update, delete, stock push, price push, order update) are mocked using Jest so live store data is never altered! Live API testing is strictly read-only GET requests.
3. Publish `TEST_READY.md` at `c:\Users\uttim\Downloads\fi\TEST_READY.md`.
4. Run `npm test` inside `server/` to verify test execution.
5. Write your handoff.md and notify parent when done.
