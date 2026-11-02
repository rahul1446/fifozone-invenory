# Task Assignment: M1 Iteration 2 Reviewer 2 — Verification of Edge Cases & Boundary Safety

**Assigned Agent**: m1_iter2_reviewer_2
**Role**: teamwork_reviewer
**Working Directory**: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_reviewer_2\
**Original Request**: c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
**Project Scope**: c:\Users\uttim\Downloads\fi\PROJECT.md
**Worker Handoff**: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_2\handoff.md
**Target File**: `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`

## Objective
Independently review the edge-case handling and boundary robustness of `server/src/services/fifozoneOms.service.js`:
1. Verify `pullOrders(null)` and `pullProducts(null)` execute cleanly without `TypeError`.
2. Verify `updateProduct` and `deleteProduct` properly throw when OMS returns error envelopes.
3. Verify single prefix in `updateOrder`.
4. Verify `normalizeOmsOrder` handles null items, preserves `quantity: 0`, and decodes HTML entities in customer names.
5. Verify `decodeHtml` order of operations preserves `<Special Edition>` and `<10kg>`.
6. Run `cd server && npx jest tests/adversarial_stress.test.js tests/challenge_m1_normalization_cache.test.js --verbose`.
7. Deliver an explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
8. Write your report to `review.md` and write `handoff.md`. Notify parent when complete.

## 2026-11-02T16:32:36Z
You are assigned as m1_iter2_reviewer_2.
Your working directory is: c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_reviewer_2\
Read your dispatch instructions and original request:
- c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\Users\uttim\Downloads\fi\PROJECT.md
- c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_worker_2\handoff.md
- c:\Users\uttim\Downloads\fi\.agents\teamwork\m1_iter2_reviewer_2\DISPATCH.md
- Target file: c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js

Task:
Review edge cases, boundary handling, order normalization, and write error unwrapping.
Run tests: `cd server && npx jest tests/adversarial_stress.test.js tests/challenge_m1_normalization_cache.test.js --verbose`
Deliver verdict (APPROVE or REQUEST_CHANGES) in handoff.md and send completion message to parent.
