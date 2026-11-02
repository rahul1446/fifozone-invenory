# Architecture & Resilience Design: Fifozone OMS Service (`fifozoneOms.service.js`)

**Author**: `m1_explorer_3` (Teamwork Explorer)  
**Date**: 2026-11-02  
**Target File**: `c:\Users\uttim\Downloads\fi\server\src\services\fifozoneOms.service.js`  
**Reference Specs**:
- `c:\Users\uttim\Downloads\fi\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\uttim\Downloads\fi\PROJECT.md`
- `c:\Users\uttim\Downloads\fi\.agents\teamwork\spec_miner_survey_1\analysis.md`
- Authoritative OMS Documentation & Live Endpoints

---

## 1. Executive Summary

This document presents the complete architectural specification and drop-in code design for the resilience, connection testing, customer ingestion, brand fetching, and Axios interceptor subsystems of `fifozoneOms.service.js`.

The Fifozone OMS REST API (`/wp-json/oms/v1`) operates with sub-100ms latency, bypassing the standard WooCommerce plugin pipeline and executing direct SQL queries and atomic meta updates. To make the backend communication bulletproof under production enterprise workloads, this design introduces:

1. **Zero-Dependency Resilient Axios Client**:
   - Automatic retries on transient network errors (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`) and 5xx gateway errors (500, 502, 503, 504) using exponential backoff with randomized jitter.
   - Intelligent 429 Too Many Requests backoff parsing `Retry-After`.
   - Automatic credential fallback: if `X-OMS-Key` header authentication receives a 401 Unauthorized (e.g., if a CDN/WAF proxy strips custom headers), the client automatically re-authenticates via URL query parameter `?oms_key=...`.
   - Comprehensive request correlation tracking with latency measurement and structured Winston logging.
   - Normalized error classification via custom `FifozoneOmsError`.

2. **Two-Tier High-Speed Connection Testing (`testConnection`)**:
   - Primary query against `GET /hub?include=stats`, returning live store operational statistics (`total_products`, `total_orders`, `processing_orders`, `pending_orders`, `outofstock_count`) in <100ms.
   - Automatic fallback to `GET /products?limit=1` if `/hub` is restricted.
   - 100% backward compatibility with `platform.controller.js` by retaining top-level `productCount` alongside `stats` and `success`.
   - Support for custom credential injection for pre-save connection verification.

3. **Customer Ingestion (`pullCustomers`)**:
   - Ingests registered store customers via `GET /customers`.
   - Supports both single-page queries and automated multi-page catalog sweeps.
   - Normalizes external customer records directly to internal schema matching `server/src/models/Customer.model.js`.

4. **Brand Taxonomy Ingestion & Caching (`getBrands`)**:
   - Pulls 418 registered store brands via `GET /brands`.
   - Built-in in-memory caching (`_brandsCache`) with TTL to eliminate redundant network roundtrips during imports, syncs, and UI rendering.
   - Flexible output formats: full objects, string array of names, or Ant Design Select options (`{ label, value }`).

5. **Universal Hub Data Access (`getHubStats`, `getHubData`)**:
   - Direct access to aggregate metrics from `GET /hub` in a single round-trip.

6. **100% Backward and Forward Interface Compatibility**:
   - Preserves all 13 existing methods with exact signatures and return shapes.
   - Integrates seamlessly with Milestone 1 sister modules (`m1_explorer_1` order methods and `m1_explorer_2` category methods).

---

## 2. Audit of Existing Service & Downstream Consumers

### 2.1 Existing `fifozoneOms.service.js` Audit
The existing file (435 lines) implements product catalog loading, single/batch creation, updates, stock/price micro-updates, product deletion, and a basic connection test:
- **Client Instantiation (lines 28–40)**: Instantiates `axios.create` on every invocation with hardcoded 60s timeout, zero retries, no logging interceptors, and no fallback authentication.
- **Connection Test (lines 424–431)**: Queries `GET /products?limit=1`. Returns `{ success: true, productCount: ... }`. Misses rich hub stats (`total_orders`, `processing_orders`, etc.).
- **Missing Endpoints**: Does not provide `pullCustomers()`, `getBrands()`, `getHubStats()`, or `clearBrandsCache()`.
- **Error Handling**: Raw Axios errors are thrown; errors from OMS responses (e.g., `error.response?.data?.message` or `results[0].message`) are parsed ad-hoc across methods without uniform normalization.

### 2.2 Downstream Caller Dependencies

| Caller File | Dependent Method | Current Expected Input/Output | Migration Impact |
|:---|:---|:---|:---|
| `server/src/controllers/platform.controller.js:76` | `FifozoneOmsService.testConnection()` | Expects `{ success: true, productCount: <number> }` | Must preserve `productCount` property. |
| `server/src/services/sync.service.js:41, 84` | `pullProducts(options)` | Returns array of normalized product objects | Unchanged; benefits from retry resilience. |
| `server/src/services/sync.service.js:433` | `pushStock(sku, quantity)` | Returns `{ success: true, sku, quantity, platform, data }` | Unchanged; benefits from retry resilience. |
| `server/src/services/sync.service.js:451` | `pushPrice(sku, price)` | Returns `{ success: true, sku, price, platform, data }` | Unchanged; benefits from retry resilience. |
| `server/src/services/sync.service.js:467, 489, 504` | `createProduct`, `updateProduct`, `deleteProduct` | Returns `{ success, wooProductId, action }` | Unchanged; benefits from retry resilience. |
| `server/src/services/sync.service.js:249` | `pullOrders(options)` (Planned M1/M2) | Will expect normalized array of orders | Add method in harmony with `m1_explorer_1`. |
| `server/src/controllers/platform.controller.js:20` | `getCategoryTree()` (Planned M1/M2) | Will expect Ant Design TreeSelect nodes | Add method in harmony with `m1_explorer_2`. |
| `server/src/controllers/customer.controller.js` | Direct Mongo querying | Opportunity to seed or sync from `pullCustomers()` | Standardized schema. |
| `server/src/controllers/product.controller.js:139` | `Product.distinct('brand')` | Can resolve or populate store brands via `getBrands()` | Standardized schema. |

---

## 3. Resilient Axios Client Architecture

### 3.1 Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │          FifozoneOmsService Methods          │
                      │  (pullProducts, testConnection, etc.)        │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │              getClient(options)              │
                      │       Returns configured Axios Instance       │
                      └──────────────────────┬───────────────────────┘
                                             │
      ┌──────────────────────────────────────┴──────────────────────────────────────┐
      │                                                                             │
      ▼                                                                             ▼
┌───────────────────────────────┐                             ┌───────────────────────────────────────────┐
│      Request Interceptor      │                             │           Response Interceptor            │
├───────────────────────────────┤                             ├───────────────────────────────────────────┤
│ 1. Inject X-OMS-Key header    │                             │ 1. Calculate & log duration (latency ms)  │
│ 2. Assign unique requestId    │                             │ 2. Return HTTP 2xx response               │
│ 3. Record startTime           │                             │ 3. On 401 Unauthorized:                   │
│ 4. Structured debug log       │                             │    - Retry once with ?oms_key=<key>       │
└───────────────────────────────┘                             │ 4. On 429 Too Many Requests:              │
                                                              │    - Parse Retry-After & backoff          │
                                                              │ 5. On 500, 502, 503, 504 or Network Error:│
                                                              │    - Check retry count (< maxRetries)     │
                                                              │    - Exponential backoff + randomized jitter│
                                                              │ 6. On final failure:                      │
                                                              │    - Throw normalized FifozoneOmsError    │
                                                              └───────────────────────────────────────────┘
```

### 3.2 Interceptor Logic Specifications

#### 1. Request Interceptor
- **Unique Request Tracing**: Generates `requestId = req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`.
- **Latency Timer**: Attaches `startTime = Date.now()` to `config.metadata`.
- **Header Injection**: Enforces `'X-OMS-Key': apiKey` and `'Content-Type': 'application/json'` on all outgoing requests.
- **Debug Logging**: Emits `logger.debug` with method, sanitized URL, and request ID.

#### 2. Response Interceptor (Success)
- Computes latency: `duration = Date.now() - config.metadata.startTime`.
- Emits `logger.debug` with status code, status text, duration in milliseconds, and request ID.

#### 3. Error Interceptor & Resilient Retry Mechanism
- **Retry Condition Check (`isRetryableError`)**:
  - Network Errors: `!error.response` (e.g. `ECONNABORTED`, `ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`, `EAI_AGAIN`).
  - Server Status: HTTP 500, 502, 503, 504.
  - Rate Limiting: HTTP 429.
  - Non-retryable: HTTP 400 (Bad Request), 403, 404, 422 (must fail fast to avoid useless retries).
- **Authentication Fallback on 401 (`_authFallbackTried`)**:
  - When server responds with HTTP 401 (`rest_forbidden`), check `if (!config._authFallbackTried)`.
  - If false:
    1. Set `config._authFallbackTried = true`.
    2. Add query parameter `config.params = { ...config.params, oms_key: apiKey }`.
    3. Log warning: `[Fifozone OMS] Received 401 Unauthorized with header auth. Retrying with query param ?oms_key=...`.
    4. Re-issue request: `return client(config)`.
  - If already tried, abort retry and throw normalized error.
- **Exponential Backoff with Jitter**:
  $$\text{delay} = \min(\text{initialDelay} \times 2^{(\text{retryCount} - 1)}, \text{maxDelay}) + \text{jitter}$$
  - Default parameters: `maxRetries = 3`, `initialDelay = 500ms`, `maxDelay = 4000ms`, `jitter = Math.floor(Math.random() * 200)`.
  - Attempt 1: ~500ms + jitter (500–700ms)
  - Attempt 2: ~1000ms + jitter (1000–1200ms)
  - Attempt 3: ~2000ms + jitter (2000–2200ms)
- **HTTP 429 Rate Limiting**:
  - Inspects `error.response.headers['retry-after']`.
  - If present in seconds, pauses for `parseInt(retryAfter) * 1000ms`. Otherwise falls back to exponential backoff.
- **Normalized Error Class (`FifozoneOmsError`)**:
  - Standardizes the error object:
    - `name`: `'FifozoneOmsError'`
    - `statusCode`: HTTP status code (or `null` if network error)
    - `code`: OMS API error code (e.g. `'rest_forbidden'`, `'bad_request'`) or Axios error code
    - `message`: Extracted human-readable message from `error.response.data.message`, `error.response.data.results[0].message`, or `error.message`
    - `details`: Raw response payload
    - `requestId`: The request correlation ID

---

## 4. Enhanced Connection Testing (`testConnection`)

### 4.1 Endpoint Strategy: Primary & Fallback
The Fifozone Universal OMS API exposes `/hub`, an endpoint engineered specifically for ERP/OMS integrations to retrieve aggregate store metrics in a single pass without loading catalog lists:
- **Primary**: `GET /hub?include=stats`
  - Latency: <100ms.
  - Validates authentication and provides immediate insight into store health:
    ```json
    {
      "status": "success",
      "timestamp": "2026-11-02 20:30:00",
      "execution_time": "95.12ms",
      "stats": {
        "total_products": 13599,
        "total_orders": 5,
        "processing_orders": 4,
        "pending_orders": 0,
        "outofstock_count": 20463
      }
    }
    ```
- **Fallback**: `GET /products?limit=1`
  - If `/hub` is not deployed or disabled by WordPress configuration, the service automatically falls back to `GET /products?limit=1`.
  - Returns `res.data.total` (13,599) and verifies read capability.

### 4.2 Return Contract & Backward Compatibility
To guarantee zero breakage with existing controller code (`platform.controller.js:77` reads `testRes.productCount`), the return contract is:
```javascript
{
  success: true,
  message: "Connected to Fifozone OMS API successfully. 13599 products found.",
  productCount: 13599, // 100% backward compatibility for platform.controller.js
  stats: {
    total_products: 13599,
    total_orders: 5,
    processing_orders: 4,
    pending_orders: 0,
    outofstock_count: 20463
  },
  timestamp: "2026-11-02 20:30:00",
  latencyMs: 95
}
```

### 4.3 Pre-Save Verification (Custom Credentials)
Accepts optional `credentials = { baseURL, apiKey }` parameter. When passed, `testConnection(credentials)` instantiates an isolated client instance, enabling the frontend settings page to test credentials *before* persisting them to the database.

---

## 5. Customer Ingestion (`pullCustomers`)

### 5.1 Endpoint Specification
- **Endpoint**: `GET /customers`
- **Supported Query Parameters**:
  - `page`: Page index (default: `1`)
  - `limit`: Items per page (default: `100`, max: `500`)
  - `search`: Keyword string matching customer name or email

### 5.2 Schema Normalization Matrix

| OMS API Field (`GET /customers`) | Internal Model (`Customer.model.js`) | Normalization Rule |
|:---|:---|:---|
| `id` / `user_id` | `platformCustomerId` | `String(c.id \|\| c.user_id)` |
| `first_name`, `last_name` | `name` | `${c.first_name \|\| ''} ${c.last_name \|\| ''}`.trim() \|\| c.email \|\| 'Unnamed Customer' |
| `first_name` | `firstName` | `c.first_name \|\| ''` |
| `last_name` | `lastName` | `c.last_name \|\| ''` |
| `email` | `email` | `(c.email \|\| '').trim().toLowerCase()` |
| `phone` | `phone` | `(c.phone \|\| '').trim()` |
| `city` | `city` | `c.city \|\| ''` |
| `state` | `state` | `c.state \|\| ''` |
| `postcode` | `pincode` | `c.postcode \|\| c.pincode \|\| ''` |
| `country` | `country` | `c.country \|\| 'India'` |
| `[object]` | `platforms` | `['fifozone']` |
| `[object]` | `raw` | Full un-mutated OMS customer object |

### 5.3 Method Usage Modes
1. **Auto-Paginated Sweeping (Default)**:
   ```javascript
   const customers = await FifozoneOmsService.pullCustomers();
   // Returns Array<NormalizedCustomer> iterating through all pages up to maxPages (default: 50)
   ```
2. **Single-Page Fetching**:
   ```javascript
   const result = await FifozoneOmsService.pullCustomers({ page: 2, limit: 50, fetchAll: false });
   // Returns { total, page, limit, totalPages, count, customers: [...] }
   ```

---

## 6. Brand Taxonomy Ingestion & Caching (`getBrands`)

### 6.1 Endpoint Specification
- **Endpoint**: `GET /brands`
- **Query Parameters**: `limit` (optional)
- **Response Structure**:
  ```json
  {
    "status": "success",
    "brands": [
      { "id": 120, "name": "Drools Focus", "slug": "drools-focus", "count": 45 },
      { "id": 121, "name": "Royal Canin", "slug": "royal-canin", "count": 78 }
    ]
  }
  ```

### 6.2 In-Memory Caching Strategy
- **Cache Storage**: `this._brandsCache = null;`
- **TTL**: 10 minutes (600,000 ms), tracking `this._brandsCacheExpiry`.
- **Bypass Flag**: `options.forceRefresh: true` forces a network request and updates cache.
- **Cache Invalidation**: `FifozoneOmsService.clearBrandsCache()` resets the cache immediately.

### 6.3 Flexible Output Formats
- `format: 'full'` (default): `Array<{ id, name, slug, count }>`
- `format: 'names'`: `Array<String>` (e.g. `['Drools Focus', 'Royal Canin', ...]`)
- `format: 'options'`: `Array<{ label: name, value: name, key: id }>` for frontend Select dropdowns.

---

## 7. Universal Hub Integration (`getHubStats` & `getHubData`)

### 7.1 Method Contracts
```javascript
// 1. Quick Stats Overview
async getHubStats()
// Returns:
// {
//   total_products: 13599,
//   total_orders: 5,
//   processing_orders: 4,
//   pending_orders: 0,
//   outofstock_count: 20463
// }

// 2. Comprehensive Unified Data Pull
async getHubData(options = {})
// Input: { include: 'all' | 'stats' | 'taxonomies' | 'products' | 'orders', modified_after, products_limit, orders_limit }
// Returns: Full /hub response object
```

---

## 8. Exported API Surface & Downstream Interface Compatibility Matrix

The table below catalogs every public method on `FifozoneOmsService`, ensuring 100% compatibility across existing methods and newly designed features:

| Method Name | Category | Inputs | Output Signature | Backward Compatible? |
|:---|:---|:---|:---|:---:|
| `getClient(options)` | Core Client | `options?: { baseURL, apiKey, timeout, maxRetries }` | Configured Axios Instance | ✅ Yes |
| `createClientInstance(config)` | Factory | `config: Object` | Interceptor-equipped Axios Instance | ✅ New |
| `formatCategories(categories, subCategory)` | Helper | `categories: String\|Array, subCategory?: String` | `Array<String>` | ✅ Yes |
| `formatImages(images)` | Helper | `images: Array<String\|Object>` | `Array<String>` (valid URLs) | ✅ Yes |
| `buildOmsPayload(product)` | Helper | `product: Object` | OMS product payload object | ✅ Yes |
| `pullProducts(options)` | Catalog | `options?: { page, limit, maxPages, ... }` | `Promise<Array<NormalizedProduct>>` | ✅ Yes |
| `createProduct(product)` | Catalog | `product: Object` | `Promise<{ success: true, wooProductId, action: 'created' }>` | ✅ Yes |
| `createProductsBatch(productsList)` | Catalog | `productsList: Array<Object>` | `Promise<Object>` (OMS batch response) | ✅ Yes |
| `updateProduct(product, wooProductId)` | Catalog | `product: Object, wooProductId?: Number\|String` | `Promise<{ success: true, wooProductId, action: 'updated' }>` | ✅ Yes |
| `updateProductsBatch(updatesList)` | Catalog | `updatesList: Array<Object>` | `Promise<Object>` (OMS batch response) | ✅ Yes |
| `pushStock(sku, quantity)` | Inventory | `sku: String, quantity: Number` | `Promise<{ success: true, sku, quantity, platform: 'fifozone', data }>` | ✅ Yes |
| `pushPrice(sku, price)` | Pricing | `sku: String, price: Number\|String` | `Promise<{ success: true, sku, price, platform: 'fifozone', data }>` | ✅ Yes |
| `deleteProduct(product, force)` | Catalog | `product: Object, force?: Boolean` | `Promise<{ success: true, wooProductId, action: 'deleted' }>` | ✅ Yes |
| `deleteProductsBatch(items, force)` | Catalog | `items: Array<Object>, force?: Boolean` | `Promise<Object>` (OMS batch response) | ✅ Yes |
| `testConnection(credentials)` | Connection | `credentials?: { baseURL, apiKey }` | `Promise<{ success: true, productCount, stats, message, latencyMs, timestamp }>` | ✅ Yes (Enhanced) |
| `pullCustomers(options)` | Customers | `options?: { page, limit, search, fetchAll, maxPages }` | `Promise<Array<Customer> \| Object>` | ✅ New |
| `getBrands(options)` | Taxonomies | `options?: { limit, forceRefresh, format }` | `Promise<Array<Brand> \| Array<String>>` | ✅ New |
| `clearBrandsCache()` | Taxonomies | none | `void` | ✅ New |
| `getHubStats()` | Hub | none | `Promise<Object>` (stats metrics) | ✅ New |
| `getHubData(options)` | Hub | `options?: Object` | `Promise<Object>` (hub response) | ✅ New |
| *(M1 Explorer 1 harmony)* `pullOrders(options)` | Orders | `options?: { page, limit, status, search, modified_after }` | `Promise<Array<NormalizedOrder>>` | Planned |
| *(M1 Explorer 1 harmony)* `updateOrder(orderId, updateData)` | Orders | `orderId: String\|Number, updateData: { status, tracking_number, carrier }` | `Promise<{ success, orderId, status, raw }>` | Planned |
| *(M1 Explorer 2 harmony)* `getCategoryTree()` | Categories | none | `Promise<Array<TreeNode>>` | Planned |
| *(M1 Explorer 2 harmony)* `getCategories(parentId)` | Categories | `parentId?: Number` | `Promise<Array<Category>>` | Planned |
| *(M1 Explorer 2 harmony)* `resolveCategoryId(name, parentId)` | Categories | `name: String, parentId?: Number` | `Promise<Number\|null>` | Planned |
| *(M1 Explorer 2 harmony)* `resolveSubCategoryId(cat, subCat)` | Categories | `cat: String, subCat: String` | `Promise<{ categoryId, subCategoryId }>` | Planned |
| *(M1 Explorer 2 harmony)* `getTaxonomies()` | Categories | none | `Promise<Object>` | Planned |

---

## 9. Concrete Implementation Design

The following complete code reflects the architecture designed for `server/src/services/fifozoneOms.service.js`. It includes the full Axios resilience interceptors, connection testing with fallback, customer pulling, brands fetching with caching, and hub integration, while preserving all existing product methods.

```javascript
const axios = require('axios');
const logger = require('../utils/logger');

// ─── Custom Normalized Error ──────────────────────────────────────────────────
class FifozoneOmsError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'FifozoneOmsError';
    this.statusCode = options.statusCode || null;
    this.code = options.code || 'OMS_ERROR';
    this.details = options.details || null;
    this.requestId = options.requestId || null;
  }
}

// ─── HTML Decoder Utility ─────────────────────────────────────────────────────
const decodeHtml = (str) => {
  if (!str) return '';
  let decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
  return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
};

class FifozoneOmsService {
  constructor() {
    this.name = 'Fifozone OMS';
    this.baseURL = process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1';
    this.apiKey = process.env.FIFOZONE_OMS_API_KEY || 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
    this.timeout = 60000;
    this.maxRetries = 3;
    this.initialRetryDelay = 500;
    this.maxRetryDelay = 4000;

    // In-memory brands cache
    this._brandsCache = null;
    this._brandsCacheExpiry = 0;
    this._brandsCacheTTL = 10 * 60 * 1000; // 10 minutes

    // Cached primary Axios client instance
    this._client = null;
    this._clientConfigHash = '';
  }

  // ─── Factory: Build Axios Client with Interceptors ──────────────────────────
  createClientInstance(config = {}) {
    const baseURL = (config.baseURL || process.env.FIFOZONE_OMS_BASE_URL || this.baseURL).replace(/\/+$/, '');
    const apiKey = config.apiKey || process.env.FIFOZONE_OMS_API_KEY || this.apiKey;
    const timeout = config.timeout || this.timeout;
    const maxRetries = config.maxRetries !== undefined ? config.maxRetries : this.maxRetries;
    const initialDelay = config.initialRetryDelay || this.initialRetryDelay;
    const maxDelay = config.maxRetryDelay || this.maxRetryDelay;

    const instance = axios.create({
      baseURL,
      headers: {
        'X-OMS-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout
    });

    // ── Request Interceptor ──
    instance.interceptors.request.use(
      (reqConfig) => {
        reqConfig.metadata = {
          startTime: Date.now(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };

        // Ensure X-OMS-Key is set
        if (!reqConfig.headers['X-OMS-Key'] && apiKey) {
          reqConfig.headers['X-OMS-Key'] = apiKey;
        }

        logger.debug(`[${this.name}] [${reqConfig.metadata.requestId}] --> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );

    // ── Response Interceptor ──
    instance.interceptors.response.use(
      (response) => {
        const duration = response.config.metadata ? Date.now() - response.config.metadata.startTime : 0;
        logger.debug(`[${this.name}] [${response.config.metadata?.requestId}] <-- ${response.status} ${response.statusText} (${duration}ms)`);
        return response;
      },
      async (error) => {
        const reqConfig = error.config;
        if (!reqConfig) return Promise.reject(error);

        const status = error.response?.status;
        const requestId = reqConfig.metadata?.requestId || 'unknown';

        // ── 1. Credential Fallback on 401 Unauthorized ──
        if (status === 401 && !reqConfig._authFallbackTried && apiKey) {
          reqConfig._authFallbackTried = true;
          logger.warn(`[${this.name}] [${requestId}] 401 Unauthorized on header auth. Retrying with query param ?oms_key=...`);
          reqConfig.params = { ...(reqConfig.params || {}), oms_key: apiKey };
          return instance(reqConfig);
        }

        // ── 2. Rate Limit (429) & Transient Server Error (5xx / Network) Retry ──
        const isNetworkError = !error.response && (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND' ||
          error.message?.toLowerCase().includes('timeout')
        );
        const isServerError = status >= 500 && status <= 599;
        const isRateLimited = status === 429;

        if ((isNetworkError || isServerError || isRateLimited) && (reqConfig._retryCount || 0) < maxRetries) {
          reqConfig._retryCount = (reqConfig._retryCount || 0) + 1;

          let delay = Math.min(initialDelay * Math.pow(2, reqConfig._retryCount - 1), maxDelay);
          // Add jitter (up to 20% random variance)
          delay += Math.floor(Math.random() * (delay * 0.2));

          if (isRateLimited) {
            const retryAfter = error.response?.headers?.['retry-after'];
            if (retryAfter) {
              const seconds = parseInt(retryAfter, 10);
              if (!isNaN(seconds) && seconds > 0) delay = seconds * 1000;
            }
          }

          logger.warn(`[${this.name}] [${requestId}] Transient error (${status || error.code || 'NETWORK_ERR'}). Retrying in ${Math.round(delay)}ms (attempt ${reqConfig._retryCount}/${maxRetries})...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return instance(reqConfig);
        }

        // ── 3. Normalize Final Error ──
        const errMsg = error.response?.data?.message ||
          error.response?.data?.results?.[0]?.message ||
          error.message ||
          'Unknown Fifozone OMS API Error';

        const normalizedError = new FifozoneOmsError(errMsg, {
          statusCode: status,
          code: error.response?.data?.code || error.code || 'OMS_ERROR',
          details: error.response?.data || null,
          requestId
        });

        logger.error(`[${this.name}] [${requestId}] Request failed: ${normalizedError.message} (status: ${status || 'NONE'})`);
        return Promise.reject(normalizedError);
      }
    );

    return instance;
  }

  // ─── Get Configured Client (Cached Singleton or Custom) ─────────────────────
  getClient(options = {}) {
    const baseURL = (options.baseURL || process.env.FIFOZONE_OMS_BASE_URL || this.baseURL).replace(/\/+$/, '');
    const apiKey = options.apiKey || process.env.FIFOZONE_OMS_API_KEY || this.apiKey;
    const timeout = options.timeout || this.timeout;

    // If options are default, return cached client
    const configHash = `${baseURL}|${apiKey}|${timeout}`;
    if (this._client && this._clientConfigHash === configHash) {
      return this._client;
    }

    const client = this.createClientInstance({ baseURL, apiKey, timeout });
    if (!options.baseURL && !options.apiKey) {
      this._client = client;
      this._clientConfigHash = configHash;
    }

    return client;
  }

  // ─── Category String Array Formatter ────────────────────────────────────────
  formatCategories(categories, subCategory) {
    const list = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    const cleanCats = [];

    list.forEach(c => {
      if (!c) return;
      if (typeof c === 'string' && c.includes('|')) {
        const name = c.split('|')[1].trim();
        if (name && !cleanCats.includes(name)) cleanCats.push(name);
      } else {
        const name = String(c).trim();
        if (name && !cleanCats.includes(name)) cleanCats.push(name);
      }
    });

    if (subCategory && typeof subCategory === 'string' && subCategory.trim()) {
      const sub = subCategory.trim();
      if (!cleanCats.includes(sub)) cleanCats.push(sub);
    }

    return cleanCats;
  }

  // ─── Image URLs Formatter ───────────────────────────────────────────────────
  formatImages(images) {
    if (!images || !Array.isArray(images)) return [];
    return images
      .map(img => (typeof img === 'string' ? img : img.url))
      .filter(url => {
        if (!url || typeof url !== 'string') return false;
        const u = url.toLowerCase();
        if (u.includes('example.com') || u.includes('localhost') || u.includes('127.0.0.1') || u.includes('placeholder')) {
          return false;
        }
        return u.startsWith('http://') || u.startsWith('https://');
      });
  }

  // ─── Build OMS Payload from Product Model ───────────────────────────────────
  buildOmsPayload(product) {
    const stockQty = (product.stockByPlatform?.fifozone > 0)
      ? product.stockByPlatform.fifozone
      : (product.totalStock ?? 0);

    const price = (product.sellingPrice?.fifozone > 0)
      ? product.sellingPrice.fifozone
      : (product.mrp > 0 ? product.mrp : 0);

    const categories = this.formatCategories(product.category, product.subCategory);
    const images = this.formatImages(product.images);

    const payload = {
      name: product.masterName || 'Unnamed Product',
      sku: product.sku || '',
      regular_price: price > 0 ? String(price) : '0',
      stock_quantity: stockQty,
      stock_status: stockQty > 0 ? 'instock' : 'outofstock',
      status: product.isActive ? 'publish' : 'draft',
      tax_status: 'taxable',
      tax_class: '',
      brand: product.brand || 'Generic',
      categories,
      tags: Array.isArray(product.tags) ? product.tags : [],
      description: product.description || '',
      short_description: product.shortDescription || '',
    };

    if (product.hsnCode || product.hsn_code) {
      payload.hsn_code = String(product.hsnCode || product.hsn_code);
    }

    if (product.gstPercent !== undefined && product.gstPercent !== null) {
      payload.gst_rate = String(product.gstPercent);
    } else if (product.gst_rate) {
      payload.gst_rate = String(product.gst_rate);
    }

    if (images.length > 0) {
      payload.images = images;
    }

    if (product.weight) {
      const weightVal = typeof product.weight === 'object' ? product.weight.value : product.weight;
      if (weightVal !== undefined && weightVal !== null && weightVal !== '') {
        payload.weight = String(weightVal);
      }
    }

    if (product.barcode) {
      payload.meta_data = {
        barcode_ean: String(product.barcode)
      };
    }

    return payload;
  }

  // ─── 1. LOAD / PULL PRODUCTS ────────────────────────────────────────────────
  async pullProducts(options = {}) {
    logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
    const client = this.getClient();
    const allProducts = [];
    let page = 1;
    const limit = options.limit || 500;

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS products page ${page} (limit=${limit})...`);
        const params = {
          page,
          limit,
          status: 'publish',
          ...options
        };

        const res = await client.get('/products', { params });
        const resData = res.data;
        const batch = resData?.data || [];

        if (!batch || batch.length === 0) {
          logger.info(`[${this.name}] Page ${page} returned 0 products — stopping pagination.`);
          break;
        }

        const mapped = batch.map(prod => {
          const imageList = [];
          if (prod.image) imageList.push(prod.image);
          if (Array.isArray(prod.gallery_images)) {
            prod.gallery_images.forEach(img => {
              if (img && !imageList.includes(img)) imageList.push(img);
            });
          }
          if (Array.isArray(prod.images)) {
            prod.images.forEach(img => {
              const url = typeof img === 'string' ? img : img?.url || img?.src;
              if (url && !imageList.includes(url)) imageList.push(url);
            });
          }

          const brand = Array.isArray(prod.brands) && prod.brands.length > 0
            ? (typeof prod.brands[0] === 'string' ? prod.brands[0] : prod.brands[0]?.name)
            : (prod.brand || 'Generic');

          const category = Array.isArray(prod.categories) && prod.categories.length > 0
            ? (typeof prod.categories[0] === 'string' ? prod.categories[0] : prod.categories[0]?.name)
            : (prod.category || 'Uncategorized');

          const manageStock = Boolean(prod.manage_stock);
          const stockStatus = prod.stock_status || (prod.stock_quantity > 0 ? 'instock' : 'outofstock');
          let stockQty = (prod.stock_quantity !== null && prod.stock_quantity !== undefined && prod.stock_quantity > 0)
            ? prod.stock_quantity
            : (stockStatus === 'instock' ? 50 : 0);

          return {
            platformProductId: String(prod.id),
            masterName: decodeHtml(prod.name),
            sku: prod.sku || `WC-${prod.id}`,
            barcode: prod.meta_data?.barcode_ean || '',
            brand: brand || 'Generic',
            category: category || 'Uncategorized',
            price: parseFloat(prod.price || prod.regular_price || 0),
            mrp: parseFloat(prod.regular_price || prod.price || 0),
            stock: stockQty,
            stockStatus,
            manageStock,
            slug: prod.slug || '',
            url: prod.url || '',
            images: imageList,
            shortDescription: decodeHtml(prod.short_description || ''),
            description: decodeHtml(prod.description || ''),
            weight: prod.weight ? parseFloat(prod.weight) : undefined,
            hsn_code: prod.hsn_code || '',
            gst_rate: prod.gst_rate || ''
          };
        });

        allProducts.push(...mapped);
        logger.info(`[${this.name}] Page ${page}: received ${batch.length} products (total so far: ${allProducts.length}/${resData.total || '?'})`);

        const totalPages = resData.total_pages ? parseInt(resData.total_pages, 10) : 1;
        if (options.maxPages && page >= options.maxPages) {
          logger.info(`[${this.name}] Reached maxPages limit (${options.maxPages}) — stopping.`);
          break;
        }
        if (page >= totalPages || batch.length < limit) {
          break;
        }

        page++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allProducts.length} total products via OMS API.`);
      return allProducts;
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] pullProducts error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullProducts failed: ${errMsg}`);
    }
  }

  // ─── 2. CREATE PRODUCT ──────────────────────────────────────────────────────
  async createProduct(product) {
    logger.info(`[${this.name}] Creating product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = this.buildOmsPayload(product);
      const res = await client.post('/products/create', payload);
      const data = res.data;

      const firstResult = data.results?.[0];
      const wooProductId = firstResult?.id || data.id;

      if (!wooProductId) {
        if (firstResult?.status === 'error') {
          logger.warn(`[${this.name}] Create returned error: ${firstResult.message || firstResult.error}. Attempting update...`);
          return await this.updateProduct(product);
        }
      }

      logger.info(`[${this.name}] Created product successfully. ID: ${wooProductId}`);
      return { success: true, wooProductId, action: 'created' };
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] createProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS createProduct failed: ${errMsg}`);
    }
  }

  async createProductsBatch(productsList) {
    logger.info(`[${this.name}] Batch creating ${productsList.length} products via OMS API...`);
    const client = this.getClient();

    try {
      const payloads = productsList.map(p => this.buildOmsPayload(p));
      const res = await client.post('/products/create', payloads);
      return res.data;
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] createProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS createProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 3. UPDATE PRODUCT ──────────────────────────────────────────────────────
  async updateProduct(product, wooProductId) {
    logger.info(`[${this.name}] Updating product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = this.buildOmsPayload(product);

      const targetId = wooProductId || product.platformIds?.fifozone?.productId;
      if (targetId && !isNaN(Number(targetId)) && Number(targetId) > 0) {
        payload.id = Number(targetId);
      } else if (product.sku) {
        payload.sku = product.sku;
      }

      const res = await client.post('/products/update', payload);
      const data = res.data;
      const firstResult = data.results?.[0];
      const resolvedId = firstResult?.id || payload.id;

      logger.info(`[${this.name}] Updated product successfully (ID: ${resolvedId})`);
      return { success: true, wooProductId: resolvedId, action: 'updated' };
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] updateProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS updateProduct failed: ${errMsg}`);
    }
  }

  async updateProductsBatch(updatesList) {
    logger.info(`[${this.name}] Batch updating ${updatesList.length} items via OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.post('/products/update', updatesList);
      return res.data;
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] updateProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS updateProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 4. PUSH STOCK ──────────────────────────────────────────────────────────
  async pushStock(sku, quantity) {
    logger.info(`[${this.name}] Pushing stock for SKU: ${sku} -> Qty: ${quantity}`);
    const client = this.getClient();

    try {
      const payload = {
        sku,
        stock_quantity: parseInt(quantity, 10) || 0,
        stock_status: (parseInt(quantity, 10) || 0) > 0 ? 'instock' : 'outofstock'
      };

      const res = await client.post('/products/update', payload);
      return { success: true, sku, quantity, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] pushStock error for SKU ${sku}: ${errMsg}`);
      throw new Error(`Fifozone OMS pushStock failed: ${errMsg}`);
    }
  }

  // ─── 5. PUSH PRICE ──────────────────────────────────────────────────────────
  async pushPrice(sku, price) {
    logger.info(`[${this.name}] Pushing price for SKU: ${sku} -> INR ${price}`);
    const client = this.getClient();

    try {
      const payload = {
        sku,
        regular_price: String(price)
      };

      const res = await client.post('/products/update', payload);
      return { success: true, sku, price, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] pushPrice error for SKU ${sku}: ${errMsg}`);
      throw new Error(`Fifozone OMS pushPrice failed: ${errMsg}`);
    }
  }

  // ─── 6. DELETE PRODUCT ──────────────────────────────────────────────────────
  async deleteProduct(product, force = true) {
    logger.info(`[${this.name}] Deleting product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = { force: force !== false };
      const wooId = product.platformIds?.fifozone?.productId;
      if (wooId && !isNaN(Number(wooId)) && Number(wooId) > 0) {
        payload.id = Number(wooId);
      }
      if (product.sku) {
        payload.sku = product.sku;
      }

      const res = await client.post('/products/delete', payload);
      const data = res.data;
      const firstResult = data.results?.[0];

      logger.info(`[${this.name}] Product deleted successfully: ${firstResult?.name || product.masterName}`);
      return { success: true, wooProductId: firstResult?.id || wooId, action: 'deleted' };
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] deleteProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS deleteProduct failed: ${errMsg}`);
    }
  }

  async deleteProductsBatch(items, force = true) {
    logger.info(`[${this.name}] Batch deleting ${items.length} items via OMS API...`);
    const client = this.getClient();

    try {
      const payload = items.map(item => ({
        ...(item.id ? { id: item.id } : {}),
        ...(item.sku ? { sku: item.sku } : {}),
        force: force !== false
      }));

      const res = await client.post('/products/delete', payload);
      return res.data;
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] deleteProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS deleteProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 7. TEST CONNECTION (Two-Tier: /hub?include=stats + /products?limit=1) ───
  async testConnection(customCreds = null) {
    logger.info(`[${this.name}] Testing connection to OMS API...`);
    const client = customCreds ? this.getClient(customCreds) : this.getClient();
    const startTime = Date.now();

    // Strategy A: Universal Hub Stats endpoint (Fastest, <100ms)
    try {
      const res = await client.get('/hub', { params: { include: 'stats' } });
      const latencyMs = Date.now() - startTime;
      const stats = res.data?.stats || {};
      const productCount = stats.total_products !== undefined ? stats.total_products : (res.data?.total || 0);

      logger.info(`[${this.name}] Connection verified via /hub (${latencyMs}ms). Store has ${productCount} products.`);
      return {
        success: true,
        message: `Connected to Fifozone OMS API successfully. Found ${productCount} products.`,
        productCount, // Backward compatibility for platform.controller.js line 77
        stats: {
          total_products: productCount,
          total_orders: stats.total_orders || 0,
          processing_orders: stats.processing_orders || 0,
          pending_orders: stats.pending_orders || 0,
          outofstock_count: stats.outofstock_count || 0
        },
        timestamp: res.data?.timestamp || new Date().toISOString(),
        latencyMs
      };
    } catch (hubError) {
      logger.warn(`[${this.name}] /hub connection probe failed (${hubError.message}). Falling back to /products?limit=1...`);

      // Strategy B: Fallback to /products?limit=1
      try {
        const res = await client.get('/products', { params: { limit: 1 } });
        const latencyMs = Date.now() - startTime;
        const total = res.data?.total || res.data?.count || 0;

        logger.info(`[${this.name}] Connection verified via /products fallback (${latencyMs}ms). Products: ${total}`);
        return {
          success: true,
          message: `Connected to Fifozone OMS API successfully via products fallback. Found ${total} products.`,
          productCount: total,
          stats: {
            total_products: total,
            total_orders: 0,
            processing_orders: 0,
            pending_orders: 0,
            outofstock_count: 0
          },
          timestamp: new Date().toISOString(),
          latencyMs
        };
      } catch (fallbackError) {
        const errMsg = fallbackError.message || 'Connection failed';
        logger.error(`[${this.name}] Connection test completely failed: ${errMsg}`);
        throw new Error(`Fifozone OMS connection test failed: ${errMsg}`);
      }
    }
  }

  // ─── 8. PULL CUSTOMERS (GET /customers) ─────────────────────────────────────
  async pullCustomers(options = {}) {
    logger.info(`[${this.name}] Pulling customers from OMS API...`);
    const client = this.getClient();
    const limit = options.limit || 100;
    const fetchAll = options.fetchAll !== false && options.page === undefined;

    // Single page mode
    if (!fetchAll) {
      const page = options.page || 1;
      const params = { page, limit, ...(options.search ? { search: options.search } : {}) };
      const res = await client.get('/customers', { params });
      const rawList = res.data?.data || [];

      const normalized = rawList.map(c => this._normalizeCustomer(c));
      return {
        total: res.data?.total || normalized.length,
        page: res.data?.page || page,
        limit: res.data?.limit || limit,
        totalPages: res.data?.total_pages || 1,
        count: normalized.length,
        customers: normalized
      };
    }

    // Full multi-page catalog sweep
    const allCustomers = [];
    let page = 1;
    const maxPages = options.maxPages || 50;

    try {
      while (page <= maxPages) {
        const params = { page, limit, ...(options.search ? { search: options.search } : {}) };
        const res = await client.get('/customers', { params });
        const batch = res.data?.data || [];

        if (!batch || batch.length === 0) break;

        const normalizedBatch = batch.map(c => this._normalizeCustomer(c));
        allCustomers.push(...normalizedBatch);

        const totalPages = res.data?.total_pages ? parseInt(res.data.total_pages, 10) : 1;
        if (page >= totalPages || batch.length < limit) break;

        page++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allCustomers.length} total customers.`);
      return allCustomers;
    } catch (error) {
      const errMsg = error.message;
      logger.error(`[${this.name}] pullCustomers error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullCustomers failed: ${errMsg}`);
    }
  }

  // Normalize single raw OMS customer object to internal Customer schema
  _normalizeCustomer(c) {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    return {
      platformCustomerId: String(c.id || c.user_id || ''),
      name: fullName || c.email || 'Unnamed Customer',
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      email: (c.email || '').trim().toLowerCase(),
      phone: (c.phone || '').trim(),
      city: c.city || '',
      state: c.state || '',
      pincode: c.postcode || c.pincode || '',
      country: c.country || 'India',
      platforms: ['fifozone'],
      raw: c
    };
  }

  // ─── 9. GET BRANDS (GET /brands with in-memory caching) ──────────────────────
  async getBrands(options = {}) {
    const now = Date.now();
    const forceRefresh = Boolean(options.forceRefresh);

    // Return cached brands if still valid
    if (!forceRefresh && this._brandsCache && this._brandsCacheExpiry > now) {
      logger.debug(`[${this.name}] Returning ${this._brandsCache.length} brands from in-memory cache.`);
      return this._formatBrandsOutput(this._brandsCache, options.format);
    }

    logger.info(`[${this.name}] Fetching brand taxonomy from OMS API...`);
    const client = this.getClient();

    try {
      const params = options.limit ? { limit: options.limit } : {};
      const res = await client.get('/brands', { params });
      const rawBrands = res.data?.brands || [];

      const normalized = rawBrands.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: b.count || 0
      }));

      // Cache normalized brands
      this._brandsCache = normalized;
      this._brandsCacheExpiry = now + this._brandsCacheTTL;

      logger.info(`[${this.name}] ✅ Retrieved and cached ${normalized.length} brands.`);
      return this._formatBrandsOutput(normalized, options.format);
    } catch (error) {
      // Fallback: Check if taxonomies dump contains brands
      logger.warn(`[${this.name}] /brands fetch failed (${error.message}). Attempting /taxonomies fallback...`);
      try {
        const taxRes = await client.get('/taxonomies');
        const taxBrands = taxRes.data?.taxonomies?.brands || [];
        const normalized = taxBrands.map(b => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          count: b.count || 0
        }));

        this._brandsCache = normalized;
        this._brandsCacheExpiry = now + this._brandsCacheTTL;
        return this._formatBrandsOutput(normalized, options.format);
      } catch (fallbackErr) {
        const errMsg = error.message;
        logger.error(`[${this.name}] getBrands failed: ${errMsg}`);
        throw new Error(`Fifozone OMS getBrands failed: ${errMsg}`);
      }
    }
  }

  clearBrandsCache() {
    this._brandsCache = null;
    this._brandsCacheExpiry = 0;
    logger.info(`[${this.name}] Brands cache cleared.`);
  }

  _formatBrandsOutput(brands, format) {
    if (format === 'names') {
      return brands.map(b => b.name);
    }
    if (format === 'options') {
      return brands.map(b => ({ label: b.name, value: b.name, key: b.id }));
    }
    return brands;
  }

  // ─── 10. UNIVERSAL HUB STATS & DATA ─────────────────────────────────────────
  async getHubStats() {
    const res = await this.testConnection();
    return res.stats;
  }

  async getHubData(options = {}) {
    logger.info(`[${this.name}] Fetching unified hub data...`);
    const client = this.getClient();
    try {
      const res = await client.get('/hub', { params: options });
      return res.data;
    } catch (error) {
      logger.error(`[${this.name}] getHubData error: ${error.message}`);
      throw new Error(`Fifozone OMS getHubData failed: ${error.message}`);
    }
  }
}

module.exports = new FifozoneOmsService();
```

---

## 10. Unit Testing & Verification Strategy

### 10.1 Safe Verification Mandate (R3)
During all automated Jest tests:
- **Write safety**: Every write method (`createProduct`, `createProductsBatch`, `updateProduct`, `updateProductsBatch`, `pushStock`, `pushPrice`, `deleteProduct`, `deleteProductsBatch`) must have its HTTP requests intercepted and mocked via Jest (`jest.spyOn(client, 'post')` or mocked Axios adapter) to avoid modifying live store data.
- **Read endpoints**: Live queries against `GET /hub`, `GET /products?limit=1`, `GET /brands`, and `GET /customers` can execute read-only probes against the live API using the configured key `oms_live_9f8d2b7e61a4c035824e87901bcdf562`.

### 10.2 Test Scenarios for Interceptors & Resilience
1. **Header Authentication**: Verify `X-OMS-Key` is passed on every outgoing request.
2. **Query Parameter Auth Fallback**:
   - Mock response returning HTTP 401 on initial request.
   - Verify client re-issues request appending `?oms_key=...`.
   - Verify request succeeds without blowing up.
3. **Transient 5xx Retry**:
   - Mock response returning HTTP 502 Bad Gateway twice, then HTTP 200 on attempt 3.
   - Verify request retries 2 times and ultimately resolves with success.
4. **Rate Limit 429 Retry**:
   - Mock response returning HTTP 429 with header `'retry-after': '1'`.
   - Verify client waits and retries successfully.
5. **Non-Retryable 400 Bad Request**:
   - Mock HTTP 400 with `{ code: 'bad_request', message: 'Invalid payload' }`.
   - Verify client does *not* retry and rejects immediately with `FifozoneOmsError`.
6. **Connection Testing**:
   - Verify `testConnection()` returns `{ success: true, productCount: 13599, stats: { ... } }`.
   - Simulate `/hub` failure and verify graceful fallback to `/products?limit=1`.
7. **Customer Ingestion**:
   - Verify `pullCustomers({ page: 1, limit: 10, fetchAll: false })` returns normalized customer object array matching `Customer.model.js`.
8. **Brands Fetching**:
   - Verify `getBrands()` returns array of brands with `id`, `name`, `slug`.
   - Verify subsequent call returns immediately from `_brandsCache` without triggering Axios GET.
   - Verify `clearBrandsCache()` invalidates cache.

---

## 11. Conclusion & Recommendations

The architecture described herein equips `server/src/services/fifozoneOms.service.js` with enterprise-grade resilience:
1. It maintains 100% interface backward compatibility with existing callers.
2. It adds robust error handling, automatic retry with backoff, and header-to-query-param credential fallback.
3. It integrates high-speed connection testing via `/hub?include=stats` with automatic fallback.
4. It introduces customer pulling and brand fetching with in-memory caching.
5. It is ready for seamless integration with Milestone 1 order management (`m1_explorer_1`) and category resolution (`m1_explorer_2`).
