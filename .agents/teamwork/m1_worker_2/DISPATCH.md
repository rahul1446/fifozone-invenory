# Task Assignment: Milestone 1 Iteration 2 Implementation — Remediation & Hardening

**Assigned Agent**: m1_worker_2
**Role**: teamwork_worker
**Working Directory**: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_2\
**Original Request**: c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Scope**: c:\Users\uttim\Downloads\fi\PROJECT.md
**Gate Status**: c:\Users\uttim\Downloads\fi\.agents\teamwork\orchestrator\GATE_STATUS.md

## File Ownership
You exclusively own and modify:
- `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`
- `c:\Users\uttim\Downloads\fi\server\tests\adversarial_stress.test.js`
- `c:\Users\uttim\Downloads\fi\server\tests\challenge_m1_normalization_cache.test.js`

## References & Architect Reports
Carefully read the exact drop-in code formulations from Iteration 2 Explorers:
1. `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_1\analysis.md` & `handoff.md` (Test Alignment & Error Extraction)
2. `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_2\analysis.md` & `handoff.md` (Write Validation & Error Unwrapping)
3. `c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_3\analysis.md` & `handoff.md` (Normalization & Boundary Safety)

## Required Code Modifications in `server/src/services/fifozoneOms.service.js`:
1. **Helper Method**: Add `_extractErrorMessage(error)` to `FifozoneOmsService` and use it in all catch blocks (lines 393, 409, 425, 455, 470, 500, 514, 535, 555, 583, 603, 769, 789, 851, 884, 990, 1022, 1137, 1192, 1325, 1362).
2. **`testConnection()` Contract**: Standardize `testConnection(options = null)` to probe `GET /products?limit=1` and return `{ success: true, productCount: total }` by default (attaching stats only if `options?.includeStats === true`).
3. **Decouple `getHubStats()`**: Call `getHubData({ include: 'stats' })` directly (with fallback to `testConnection({ includeStats: true })`).
4. **Write Validation in `updateProduct` & `deleteProduct`**: Check `if (!data || data.status === 'error' || data.total_failed > 0 || firstResult?.status === 'error')` and throw a descriptive error instead of returning `{ success: true }`.
5. **Single Error Prefix in `updateOrder`**: Throw `new Error(errMsg)` on error envelope, and in the catch block format with a clean single prefix `Fifozone OMS updateOrder failed: <errMsg>`.
6. **Defensive Options Normalization**: In `pullProducts` and `pullOrders`, define `const opts = options || {};` before accessing any properties.
7. **`normalizeOmsOrder` Hardening**:
   - Filter `rawItems.filter(item => item && typeof item === 'object')`.
   - Preserve `quantity: 0` (`const parsedQty = parseInt(item.quantity, 10); const qty = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);`).
   - Wrap `customerName` in `decodeHtml()`.
8. **`decodeHtml` Order of Operations**: Strip HTML tags *first* (`replace(/<[^>]*>?/gm, '')`), and *then* decode HTML entities (`&lt;`, `&gt;`, `&amp;`), preventing destruction of `<Special Edition>` or `<10kg>`.
9. **Mutation Safety Barrier (Requirement R3)**: In `createClientInstance`, add request interceptor blocking mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) when `NODE_ENV === 'test'` unless `ALLOW_LIVE_OMS_WRITES=true`.

## Update Test Assertions:
In `server/tests/adversarial_stress.test.js` and `server/tests/challenge_m1_normalization_cache.test.js`, update the tests that asserted the bugs so they assert the fixed behavior (as documented in `m1_iter2_explorer_3/analysis.md § 6`).

## Verification Requirements:
- Execute `cd server && npm test` and ensure ALL test suites pass (100% pass rate, 0 failed).
- Document commands and results in `handoff.md`.

## Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-02T16:19:53Z
You are assigned as m1_worker_2.
Your working directory is: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_2\
Read your dispatch instructions and original request:
- c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\uttim\Downloads\fi\PROJECT.md
- c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_2\DISPATCH.md
- Reports from m1_iter2_explorers 1, 2, 3:
  - c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_1\analysis.md
  - c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_2\analysis.md
  - c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_explorer_3\analysis.md

File Ownership:
You exclusively own and modify:
- c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js
- c:\Users\uttim\Downloads\fi\server\tests\adversarial_stress.test.js
- c:\Users\uttim\Downloads\fi\server\tests\challenge_m1_normalization_cache.test.js

Task:
Apply the exact drop-in code fixes for:
1. `_extractErrorMessage(error)` across all catch blocks.
2. `testConnection()` contract returning `{ success: true, productCount: total }` and hitting `/products?limit=1`.
3. Error envelope validation on `updateProduct` and `deleteProduct`.
4. Single error prefix on `updateOrder`.
5. Defensive options normalization (`opts = options || {}`) in `pullProducts` and `pullOrders`.
6. `normalizeOmsOrder` hardening (null items filter, preserve qty: 0, customerName HTML decode).
7. `decodeHtml` order of operations (strip tags first, decode entities after).
8. Mutation safety barrier in `createClientInstance`.
9. Update adversarial test assertions and verify `cd server && npm test` passes 100% (all suites pass, 0 failed).
