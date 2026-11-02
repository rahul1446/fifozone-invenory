# E2E Test Infra: Fifozone OMS Migration

## Test Philosophy
- Opaque-box, requirement-driven.
- **Safe Testing (R3)**: Live API calls against `https://fifozone.com/wp-json/oms/v1` during testing must be read-only (`GET`); all write, update, and delete operations must use mocks or stubs.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Product Catalog Retrieval (`/products`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 2 | Product Create / Update / Delete (`/products/*`) | ORIGINAL_REQUEST §R1-R3 | 5 | 5 | ✓ |
| 3 | Inventory & Price Push (`/products/update`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Category & Tree Resolution (`/categories`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Order Ingestion & Fulfillment Update (`/orders/*`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Zero Legacy `wc/v3` & No WooCommerce Package | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Jest (`cd server && npm test`)
- Verification script: `node server/scripts/verify_zero_wc.js`
- Test files:
  - `server/tests/fifozoneOms.test.js` (Core OMS service test suite with mocked writes and read-only live checks)
  - `server/tests/verify_zero_wc.test.js` (Automated scan test verifying 0 occurrences of `wc/v3` or `@woocommerce/woocommerce-rest-api`)
