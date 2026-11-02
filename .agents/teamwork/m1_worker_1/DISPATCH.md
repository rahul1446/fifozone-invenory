# Task Assignment: Milestone 1 Implementation — Core Fifozone OMS Service Expansion

**Assigned Agent**: m1_worker_1
**Role**: teamwork_worker
**Working Directory**: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_1\
**Original Request**: c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Scope**: c:\Users\uttim\Downloads\fi\PROJECT.md

## File Ownership
You exclusively own and modify:
- `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`
Do NOT modify any other files in `server/src/controllers/`, `server/src/routes/`, or test directories during this milestone.

## References & Architect Reports
Carefully read the design and drop-in implementations from the M1 explorers:
1. Orders Architecture: `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_1\analysis.md` and `handoff.md`
2. Categories Architecture: `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_2\analysis.md` and `handoff.md`
3. Resilience Architecture: `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_3\analysis.md` and `handoff.md`

## Requirements
Implement the unified, complete, resilient `FifozoneOmsService` class in `server/src/services/fifozoneOms.service.js`:
1. **Resilience & Client Configuration**:
   - Enhanced `getClient()` with Axios request/response interceptors:
     - Request tracing and timing.
     - Exponential backoff retry on transient 5xx errors and network timeouts.
     - Auth fallback: retry with `?oms_key=` query parameter if 401 is received.
2. **Order Management**:
   - `normalizeOmsOrder(order)`: Normalizes HPOS order objects into internal dashboard `Order` schema.
   - `pullOrders(options)`: Dual-mode fetching (auto-pagination when `page` omitted, single-page when `page` supplied), filters (`status`, `search`, `modified_after`), limit up to 500.
   - `getOrder(orderId)`: Single order lookup via `/orders?search=<id>&limit=1`.
   - `updateOrder(orderId, updateData)`: Atomic fulfillment & status update via `POST /orders/update` with partial success error unwrap.
   - `updateOrdersBatch(updatesList)`: Batch order updates.
3. **Category & Taxonomy Management**:
   - `getCategoryTree(forceRefresh)`: Fetches `GET /categories?format=tree` and transforms into Ant Design `TreeSelect` format (`{ title, value: "${id}|${name}", key: "${id}", children: [...] }`).
   - `getCategories(parentId)`: Fetches direct children under `parentId`.
   - `resolveCategoryId(name, parentId)`: In-memory cached category resolution supporting name, slug, parent-qualification, and legacy `(client, name, parentId)` signature.
   - `resolveSubCategoryId(categoryName, subCategoryName)`: Hierarchical category resolution.
   - `clearCategoryCache()`: In-memory cache reset.
   - `getTaxonomies()`: Fetches full taxonomies tree, flat categories, and brands.
   - `getBrands(options)`: Fetches brands with in-memory caching.
4. **Connection Diagnostics & Customers**:
   - `testConnection()`: Queries `/hub?include=stats` with fallback to `/products?limit=1`, returning `{ success: true, productCount, stats, timestamp }`.
   - `pullCustomers(options)`: Ingests customers from `GET /customers`.
5. **Existing Methods Preservation**:
   - Preserve all existing product methods: `pullProducts`, `getProductById`, `getProductBySku`, `createProduct`, `createProductsBatch`, `updateProduct`, `updateProductsBatch`, `pushStock`, `pushPrice`, `deleteProduct`, `deleteProductsBatch`. Ensure existing signatures and behaviors remain 100% backward-compatible.

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Safe Testing Warning (R3)
Live API calls against `https://fifozone.com/wp-json/oms/v1` during testing must be read-only (`GET`); all write, update, or delete operations must use mocks or stubs during automated tests to avoid altering live production store data.

## Verification
- Test syntax with `node -c server/src/services/fifozoneOms.service.js`.
- Test read-only live methods:
  ```powershell
  node -e "const oms = require('./server/src/services/fifozoneOms.service'); Promise.all([oms.testConnection(), oms.pullOrders({ limit: 1 }), oms.getCategoryTree()]).then(([conn, ord, cat]) => console.log('SUCCESS:', conn.success, 'Orders:', ord.length, 'Root cats:', cat.length));"
  ```
- Document all verification results in `handoff.md`.


## 2026-11-02T15:49:21Z
You are assigned as m1_worker_1.
Your working directory is: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_1\
Read your dispatch instructions and original request:
- c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\uttim\Downloads\fi\PROJECT.md
- c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_1\DISPATCH.md
- Orders architecture: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_1\analysis.md and handoff.md
- Categories architecture: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_2\analysis.md and handoff.md
- Resilience & interfaces: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_explorer_3\analysis.md and handoff.md

File Ownership:
You exclusively own and modify:
- c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js

Task:
Implement the complete, unified, resilient Fifozone OMS service in server/src/services/fifozoneOms.service.js:
1. Enhanced getClient() with Axios interceptors (tracing, retry on 5xx/timeouts, ?oms_key= fallback on 401).
2. Order handling: normalizeOmsOrder, pullOrders (dual-mode), getOrder, updateOrder, updateOrdersBatch.
3. Category & taxonomy handling: getCategoryTree, getCategories, resolveCategoryId, resolveSubCategoryId, clearCategoryCache, getTaxonomies, getBrands, clearBrandsCache.
4. Connection diagnostics & customers: testConnection (using /hub?include=stats with fallback, preserving productCount), pullCustomers.
5. Preserve all existing product methods and backward compatibility.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Safe Testing Warning (R3):
Live API calls against https://fifozone.com/wp-json/oms/v1 during testing must be read-only (GET); all write, update, or delete operations must use mocks or stubs during automated tests to avoid altering live production store data.

Run syntax and live read verification commands, record outputs in handoff.md, and send completion message to parent.
