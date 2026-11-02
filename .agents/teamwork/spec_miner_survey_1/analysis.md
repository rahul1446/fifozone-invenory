# Fifozone OMS API Specification Mining & Architecture Analysis

**Author**: `spec_miner_survey_1`  
**Date**: 2026-11-02  
**Target Backend**: `c:\Users\uttim\Downloads\fi`  
**Authoritative Documentation Sources**:
1. `c:\Users\uttim\Downloads\justcategoriszong\fifozone_universal_hub_documentation.md`
2. `c:\Users\uttim\Downloads\fi\fifozone_oms_api_complete_guide.md`
3. Live Probing of OMS API: `https://fifozone.com/wp-json/oms/v1` (Live API Key: `oms_live_9f8d2b7e61a4c035824e87901bcdf562`)

---

## 1. Executive Summary

This report establishes the complete interface specification and behavioral analysis for the Fifozone Order Management System (OMS) REST API (`/wp-json/oms/v1`). It provides the exact schema mapping, endpoint behaviors, edge-case analysis, and transition requirements needed to replace legacy WooCommerce REST API (`/wp-json/wc/v3`) calls across the backend inventory and order management system.

The Fifozone OMS API is an optimized, high-speed REST interface tailored for external OMS/ERP platforms. It bypasses standard WordPress/WooCommerce plugin execution pipelines, reading directly from database tables (including High-Performance Order Storage `wpww_wc_orders`) with read latencies under 100ms, and performing atomic updates that automatically synchronize `wpww_wc_product_meta_lookup`, invalidate object caches, and deduplicate sideloaded media.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Auth | API Key Header Auth | Authenticates requests using secret API key in request header | Header `X-OMS-Key: <key>` | HTTP 200 on authorized routes | HTTP 401 `rest_forbidden` if key missing or invalid | Spec guide §1 & Live probe |
| 2 | Auth | API Key Query Fallback | Fallback authentication via URL query parameter for clients unable to pass custom headers | Query param `?oms_key=<key>` | HTTP 200 on authorized routes | HTTP 401 `rest_forbidden` if missing or invalid | Hub doc §1 & Live probe |
| 3 | Products | Catalog Bulk Read | Fast paginated catalog read with filters for category, brand, stock, and delta sync | Query params: `page`, `limit` (max 1000), `status`, `type`, `search`, `category`, `brand`, `stock_status`, `modified_after` | `{ status: "success", total, page, limit, total_pages, count, data: [...] }` | Empty array in `data: []` if no matches | Spec guide §4 & Live probe |
| 4 | Products | Single Product Lookup by ID | Instant full lookup of single product dataset including variations, SEO, and reviews | Query param `?id=<product_id>` | `{ status: "success", product: { ... } }` | Falls back to catalog format with `total: 0, count: 0, data: []` if ID not found | Hub doc §4 & Live probe |
| 5 | Products | Single Product Lookup by SKU | Instant full lookup of single product dataset by unique SKU | Query param `?sku=<product_sku>` | `{ status: "success", product: { ... } }` | Falls back to catalog format with `total: 0, count: 0, data: []` if SKU not found | Hub doc §4 & Live probe |
| 6 | Products | Product Creation (Single) | Create a new WooCommerce product with automatic media sideloading, taxonomy tagging, and tax calculation | POST body: Single product object (`name` required, all others optional) | `{ status: "success", total_submitted: 1, total_created: 1, total_failed: 0, results: [{ index, id, sku, name, url, status: "created" }] }` | Missing name: HTTP 200 `partial_success` with error in `results[0]`. Empty JSON body: HTTP 400 `bad_request` | Spec guide §5 & Live probe |
| 7 | Products | Product Creation (Batch) | Bulk create up to 500 products in a single atomic request | POST body: Array of product objects `[ { ... }, ... ]` | `{ status: "success", total_submitted, total_created, total_failed, results: [...] }` | Per-item errors reported in `results` array while valid items succeed (partial success) | Spec guide §5 & Live probe |
| 8 | Products | Product Update (Partial) | Updates specific fields of an existing product without overwriting omitted fields | POST body: Object with `id` or `sku`, plus fields to change | `{ status: "success", total_submitted: 1, total_updated: 1, total_failed: 0, results: [{ index, id, sku, name, status: "updated", updated_fields: [...] }] }` | Missing identifier: HTTP 200 `partial_success` with error message. Non-existent ID/SKU: `status: "error"` in results | Spec guide §6 & Live probe |
| 9 | Products | Product Update (Batch) | Bulk update up to 500 products in a single call | POST body: Array of update objects `[ { ... }, ... ]` | `{ status: "success", total_submitted, total_updated, total_failed, results: [...] }` | Per-item errors reported in `results` array with `updated_fields` listed | Spec guide §6 & Live probe |
| 10 | Products | Stock / Price Atomic Push | Micro-updates for stock quantity and regular price; immediately synchronizes `wc_product_meta_lookup` | POST body to `/products/update`: `{ sku, stock_quantity, stock_status }` or `{ sku, regular_price }` | Standard product update response | Returns error if SKU not found | Spec guide §6 & Backend code |
| 11 | Products | Product Deletion | Permanently delete or trash products by `id` or `sku` | POST `/products/delete` or `DELETE /products` with `{ sku, force: true|false }` or `{ id, force: true|false }` | `{ status: "success", total_submitted, total_deleted, total_failed, results: [{ index, id, sku, name, status: "permanently_deleted" }] }` | Empty body: HTTP 400. Not found: `status: "error"` in results | Spec guide §7 & Live probe |
| 12 | Products | Mass Product Deletion | Bulk delete up to 500 products in one request | POST `/products/delete` with array `[ { sku }, { id } ]` | Standard delete summary response | Per-item status reported in results | Spec guide §7 & Live probe |
| 13 | Categories | Root Categories List | Fetch only top-level parent categories for main navigation | `GET /categories?parent=0` | `{ status: "success", parent_id: 0, total, categories: [{ id, name, slug, parent_id, parent_name, count, subcategories: [] }] }` | Non-existent parent returns `total: 0, categories: []` | Hub doc §2 & Live probe |
| 14 | Categories | Subcategories List | Fetch direct child subcategories under a specific parent ID | `GET /categories?parent=<parent_id>` | `{ status: "success", parent_id, total, categories: [...] }` | Non-existent parent returns `total: 0, categories: []` | Hub doc §2 & Live probe |
| 15 | Categories | Complete Category Tree | Fetch hierarchical nested category tree for UI TreeSelect components | `GET /categories?format=tree` | `{ status: "success", total_categories, top_level_count, categories_tree: [...] }` | Valid tree returned | Hub doc §2 & Live probe |
| 16 | Categories | Category Search | Search categories by keyword | `GET /categories?search=<keyword>` | `{ status: "success", total_categories, top_level_count, categories_tree: [...], categories_flat: [...] }` | Returns matching trees and flat list | Live probe |
| 17 | Orders | Orders Catalog Read | Ingest customer orders with line items, addresses, payment info, and shipping tracking | `GET /orders` with optional query params `limit`, `page`, `status`, `search`, `modified_after` | `{ status: "success", total, page, limit, total_pages, count, data: [{ id, status, currency, total, tax, payment_method, billing, shipping, items, shipping_tracking, shipping_lines }] }` | Empty `data: []` if no orders match | Hub doc §3 & Live probe |
| 18 | Orders | Order Status & Tracking Update | Update order fulfillment status, carrier, and tracking number | `POST /orders/update` with body `{ id: <order_id>, status: <status>, tracking_number: <num>, carrier: <carrier> }` | `{ status: "success", total_submitted: 1, total_updated: 1, total_failed: 0, results: [...] }` | Empty body: HTTP 400. Missing ID or non-existent order: HTTP 200 `partial_success` with descriptive error | Live probe & Hub doc §5 |
| 19 | Orders | Batch Order Updates | Update multiple orders in a single request | POST `/orders/update` with array of order updates or POST `/hub` with `update_orders: [...]` | Summary response with per-order success/error results | Partial success on individual errors | Live probe & Hub doc §5 |
| 20 | Universal Hub | Unified Data Sync (`/hub` or `/sync`) | Retrieve stats, products, orders, and complete taxonomies in a single round-trip HTTP request | `GET /hub` or `GET /sync` with query params `include`, `modified_after`, `products_limit`, `orders_limit`, `order_status`, `search` | `{ status: "success", timestamp, execution_time, stats: { total_products, total_orders, processing_orders, pending_orders, outofstock_count }, products, orders, taxonomies }` | Unrecognized query params ignored | Hub doc §3 & Live probe |
| 21 | Universal Hub | Multi-Entity Action Execution | Execute batch product creations, updates, and order status updates in one combined request | `POST /hub` with body `{ action: "batch", create_products: [...], update_products: [...], update_orders: [...] }` | Combined execution summary | Empty body: HTTP 400 | Hub doc §5 & Live probe |
| 22 | Customers | Customers Read | List registered customers and user accounts | `GET /customers` with optional `page`, `limit` | `{ status: "success", total, page, limit, total_pages, count, data: [{ id, user_id, first_name, last_name, email, city, state, postcode, country }] }` | Standard empty pagination if out of range | Live route discovery & probe |
| 23 | Brands | Brands Taxonomy Read | List all product brands registered in the `product_brand` taxonomy | `GET /brands` with optional `limit` | `{ status: "success", brands: [{ id, name, slug, count }] }` | Returns brand array | Live route discovery & probe |
| 24 | Taxonomies | Full Taxonomy Dump | Dump complete categories tree, flat categories, and brands list in one call | `GET /taxonomies` | `{ status: "success", taxonomies: { categories_count, brands_count, categories_tree, categories_flat, brands } }` | Always returns complete taxonomies | Live route discovery & probe |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Authentication | Request without `X-OMS-Key` header and without `?oms_key` | Returns `HTTP 401 Unauthorized` with JSON body: `{"code": "rest_forbidden", "message": "Unauthorized: Invalid or missing X-OMS-Key header.", "data": {"status": 401}}`. Server aborts before touching database. |
| 2 | Authentication | Request with invalid `X-OMS-Key: invalid_key` | Returns identical `HTTP 401 Unauthorized` response. |
| 3 | Authentication | Request with URL query param `?oms_key=oms_live_...` | Authenticates successfully (HTTP 200) identical to header-based auth. |
| 4 | Product Lookup | `GET /products?id=186782` (Found) | Response format changes from list (`data: [...]`) to single object: `{ "status": "success", "product": { ... } }`. |
| 5 | Product Lookup | `GET /products?sku=DCOHA0003TR` (Found) | Returns `{ "status": "success", "product": { ... } }`. |
| 6 | Product Lookup | `GET /products?id=99999999` (Not Found) | Returns HTTP 200 with empty catalog structure: `{ "status": "success", "total": 0, "page": 1, "limit": 100, "total_pages": 0, "count": 0, "data": [] }`. `product` key is undefined. |
| 7 | Product Lookup | `GET /products?sku=NON_EXISTENT_SKU` (Not Found) | Returns HTTP 200 with empty catalog structure: `{ "status": "success", "total": 0, "page": 1, "limit": 100, "total_pages": 0, "count": 0, "data": [] }`. |
| 8 | Product Create | `POST /products/create` with empty JSON body `{}` | Returns `HTTP 400 Bad Request` with `{"code": "bad_request", "message": "Invalid JSON payload. Expected product data.", "data": {"status": 400}}`. |
| 9 | Product Create | `POST /products/create` with missing `name`: `{"sku": "TEST"}` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_created: 0, total_failed: 1, results: [{"index": 0, "status": "error", "message": "Product name/title is required."}]`. |
| 10 | Product Update | `POST /products/update` with empty JSON body `{}` | Returns `HTTP 400 Bad Request` with `{"code": "bad_request", "message": "Invalid JSON payload. Expected product update data.", "data": {"status": 400}}`. |
| 11 | Product Update | `POST /products/update` without `id` or `sku`: `{"regular_price": "500"}` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_updated: 0, total_failed: 1, results: [{"index": 0, "id": null, "sku": null, "status": "error", "message": "Product not found by specified id or sku."}]`. |
| 12 | Product Update | `POST /products/update` with non-existent `id: 99999999` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_updated: 0, total_failed: 1, results: [{"index": 0, "id": 99999999, "sku": null, "status": "error", "message": "Product not found by specified id or sku."}]`. |
| 13 | Product Delete | `POST /products/delete` with empty body `{}` | Returns `HTTP 400 Bad Request` with `{"code": "bad_request", "message": "Invalid payload. Expected product ID(s) or SKU(s) to delete.", "data": {"status": 400}}`. |
| 14 | Product Delete | `POST /products/delete` with non-existent `id: 99999999` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_deleted: 0, total_failed: 1, results: [{"index": 0, "id": 99999999, "sku": null, "status": "error", "message": "Product not found by specified id or sku."}]`. |
| 15 | Categories | `GET /categories?parent=999999` (Non-existent parent ID) | Returns `HTTP 200 OK` with `{ status: "success", parent_id: 999999, total: 0, categories: [] }`. |
| 16 | Categories | `GET /categories?search=Dog` | Returns `{ status: "success", total_categories: N, top_level_count: M, categories_tree: [...], categories_flat: [...] }` containing both tree and flat representations of matching branches. |
| 17 | Orders Update | `POST /orders/update` with empty body `{}` | Returns `HTTP 400 Bad Request` with `{"code": "bad_request", "message": "Invalid JSON payload. Expected order update data.", "data": {"status": 400}}`. |
| 18 | Orders Update | `POST /orders/update` with missing `id` or `order_id`: `{"status": "completed"}` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_updated: 0, total_failed: 1, results: [{"index": 0, "status": "error", "message": "Missing required order_id or id."}]`. |
| 19 | Orders Update | `POST /orders/update` with non-existent `id: 9999999` | Returns `HTTP 200 OK` with `status: "partial_success", total_submitted: 1, total_updated: 0, total_failed: 1, results: [{"index": 0, "order_id": 9999999, "status": "error", "message": "Order #9999999 not found."}]`. |
| 20 | Orders Lookup | `GET /orders/189248` (Path parameter URL) | Returns `HTTP 404` (`"No route was found matching the URL and request method"`). Orders cannot be fetched by URL path ID; use `GET /orders?id=189248` or `GET /orders?search=189248`. |
| 21 | Orders Search | `GET /orders?search=Amar` (Customer Name) or `?search=189248` (Order ID) | Successfully matches and filters orders by customer first name, last name, email, or order ID number. |
| 22 | Hub Action | `POST /hub` with unrecognized action: `{"action": "unknown"}` | Returns `HTTP 200 OK` partial success with error in `results: [{"index": "action", "status": "error", "message": "Product not found by specified id or sku."}]`. |

---

## 4. Comprehensive Endpoint Specification & Schema Reference

### 4.1 Base URL & Authentication

- **Base URL**: `https://fifozone.com/wp-json/oms/v1`
- **Required Header**:
  ```http
  X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562
  Content-Type: application/json
  ```
- **Fallback URL Query Parameter**:
  ```text
  ?oms_key=oms_live_9f8d2b7e61a4c035824e87901bcdf562
  ```

---

### 4.2 Products Endpoints

#### 1. `GET /products` — List / Search Catalog
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (integer, default `100`, max `1000`): Items per page.
  - `page` (integer, default `1`): Pagination page.
  - `search` (string): Text query matching name, SKU, or ID.
  - `category` (string): Category slug (e.g. `dog-food`).
  - `brand` (string): Brand slug (e.g. `drools-focus`).
  - `stock_status` (string): Filter by `instock` or `outofstock`.
  - `modified_after` (string): Incremental delta sync filter format `YYYY-MM-DD HH:MM:SS`.
  - `type` (string, default `product`): `product`, `variation`, or `all`.
  - `status` (string, default `publish`): `publish`, `draft`, `private`, or `any`.
  - `id` (integer): Instant single product lookup (switches output schema to `{ status: "success", product: { ... } }`).
  - `sku` (string): Instant single product lookup by SKU.
- **Response Format (List)**:
  ```json
  {
    "status": "success",
    "total": 13599,
    "page": 1,
    "limit": 100,
    "total_pages": 136,
    "count": 100,
    "data": [
      {
        "id": 186782,
        "sku": "DROOLS-PUP-01",
        "name": "Drools Focus Super Premium Puppy Dog Dry Food",
        "slug": "drools-focus-puppy-super-premium-dry-food",
        "url": "https://fifozone.com/product/drools-focus-puppy-super-premium-dry-food/",
        "type": "variable",
        "status": "publish",
        "price": 644.0,
        "regular_price": 644.0,
        "sale_price": null,
        "tax_status": "taxable",
        "tax_class": "",
        "gst_rate": "18",
        "hsn_code": "23091000",
        "barcode": "8901234567890",
        "manage_stock": true,
        "stock_quantity": 25,
        "stock_status": "instock",
        "low_stock_amount": 5,
        "backorders": "no",
        "description": "<p>...</p>",
        "short_description": "<p>...</p>",
        "categories": ["Dog Food", "Puppy Food"],
        "category_slugs": ["dog-food", "dog-puppy-food"],
        "categories_detail": [
          { "id": 1650, "name": "Dog Food", "slug": "dog-food", "parent_id": 1640, "parent_name": "DOGS" }
        ],
        "brands": ["Drools Focus"],
        "brands_detail": [
          { "id": 120, "name": "Drools Focus", "slug": "drools-focus" }
        ],
        "tags": ["Dry Dog Food"],
        "attributes": [
          {
            "name": "Size",
            "slug": "size",
            "is_variation": true,
            "is_visible": true,
            "options": ["1.2kg", "3kg"]
          }
        ],
        "variations": [
          {
            "id": 186801,
            "sku": "DFODF0007DR",
            "title": "Drools Focus Puppy - 1.2kg",
            "price": 644.0,
            "regular_price": 644.0,
            "sale_price": null,
            "stock_quantity": 10,
            "stock_status": "instock",
            "manage_stock": true,
            "attributes": { "size": "1.2kg" },
            "image": "https://fifozone.com/wp-content/uploads/drools-1.2kg.png",
            "hsn_code": "23091000",
            "gst_rate": "18"
          }
        ],
        "image": "https://fifozone.com/wp-content/uploads/drools-main.png",
        "gallery_images": [
          "https://fifozone.com/wp-content/uploads/drools-back.png"
        ],
        "weight": "3.0",
        "dimensions": { "length": "30", "width": "20", "height": "10" },
        "reviews": { "average_rating": 4.8, "review_count": 27 },
        "seo": { "meta_title": "...", "meta_description": "..." },
        "date_created": "2026-08-31 16:54:49",
        "date_modified": "2026-10-14 08:30:15"
      }
    ]
  }
  ```

#### 2. `POST /products/create` — Create Product(s)
- **Method**: `POST`
- **Aliases**: `POST /products`
- **Payload**: Single product object `{ ... }` OR JSON array of up to 500 product objects `[ { ... }, ... ]`.
- **Field Schema**:
  - `name` / `title` (string, **required**): Product title.
  - `sku` (string, optional): Product SKU.
  - `regular_price` (string | number, optional): Base INR price.
  - `sale_price` (string | number, optional): Discount price (or `null`/`""`).
  - `stock_quantity` (integer, optional): Inventory count.
  - `stock_status` (string, optional): `instock`, `outofstock`, or `onbackorder`.
  - `tax_status` (string, optional, default `"taxable"`): `taxable`, `none`, or `shipping`.
  - `tax_class` (string, optional): Tax class slug.
  - `gst_rate` (string | number, optional): GST percentage (e.g. `"18"`).
  - `hsn_code` (string, optional): Harmonized System code (e.g. `"23091000"`).
  - `brand` / `brands` (string | array, optional): Brand taxonomy name(s).
  - `categories` (array of strings, optional): Category names or slugs.
  - `tags` (array of strings, optional): Tag names or slugs.
  - `images` (array of URLs, optional): Flat array of remote URLs. First becomes featured image, remainder become gallery photos.
  - `weight` (string | number, optional): Weight in kg.
  - `dimensions` (object, optional): `{"length": "30", "width": "20", "height": "10"}`.
  - `description` (string, optional): Full HTML description.
  - `short_description` (string, optional): Excerpt text.
  - `status` (string, optional, default `"publish"`): `publish`, `draft`, `private`.
  - `meta_data` (object, optional): Key-value pairs (e.g. `barcode_ean`, `warehouse_bin`).
- **Response Format**:
  ```json
  {
    "status": "success",
    "total_submitted": 2,
    "total_created": 2,
    "total_failed": 0,
    "results": [
      {
        "index": 0,
        "id": 189210,
        "sku": "PED-ADULT-3KG",
        "name": "Pedigree Adult Meat & Rice 3kg",
        "url": "https://fifozone.com/product/pedigree-adult-meat-rice-3kg/",
        "status": "created"
      }
    ]
  }
  ```

#### 3. `POST /products/update` — Update Product(s)
- **Method**: `POST`
- **Aliases**: `PUT /products`, `PATCH /products`
- **Payload**: Single update object OR JSON array of up to 500 update objects.
- **Identifier**: Must supply `id` (integer) OR `sku` (string).
- **Semantics**: Strict partial update. Only sent keys are updated; omitted keys are preserved.
- **Response Format**:
  ```json
  {
    "status": "success",
    "total_submitted": 1,
    "total_updated": 1,
    "total_failed": 0,
    "results": [
      {
        "index": 0,
        "id": 186782,
        "sku": "DROOLS-PUP-01",
        "name": "Drools Focus Super Premium Puppy Dog Dry Food",
        "status": "updated",
        "updated_fields": [
          "regular_price",
          "stock_quantity",
          "stock_status"
        ]
      }
    ]
  }
  ```

#### 4. `POST /products/delete` — Delete Product(s)
- **Method**: `POST`
- **Aliases**: `DELETE /products`
- **Payload**: Object or array of objects with `id` or `sku`, and optional `"force": true|false` (default: `true` for permanent delete, `false` to move to trash).
- **Response Format**:
  ```json
  {
    "status": "success",
    "total_submitted": 1,
    "total_deleted": 1,
    "total_failed": 0,
    "results": [
      {
        "index": 0,
        "id": 189204,
        "sku": "OLD-SKU-001",
        "name": "Old Sample Product 1",
        "status": "permanently_deleted"
      }
    ]
  }
  ```

---

### 4.3 Categories Endpoints

#### 1. `GET /categories`
- **Method**: `GET`
- **Modes**:
  1. **Top-Level Root Categories**: `GET /categories?parent=0`
     - Returns `{ status: "success", parent_id: 0, total: 11, categories: [{ id, name, slug, parent_id, parent_name, count, subcategories: [] }] }`.
  2. **Direct Subcategories**: `GET /categories?parent=1640`
     - Returns `{ status: "success", parent_id: 1640, total: 13, categories: [{ id, name, slug, parent_id, parent_name, count, subcategories: [] }] }`.
  3. **Full Tree**: `GET /categories?format=tree`
     - Returns `{ status: "success", total_categories: 192, top_level_count: 11, categories_tree: [{ id, name, slug, parent_id, count, subcategories: [...] }] }`.
  4. **Keyword Search**: `GET /categories?search=Dog`
     - Returns `{ status: "success", total_categories, top_level_count, categories_tree: [...], categories_flat: [...] }`.

---

### 4.4 Orders Endpoints

#### 1. `GET /orders` — Ingest / List Orders
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (integer, default `50`, max `500`).
  - `page` (integer, default `1`).
  - `status` (string, optional): Order status filter (`processing`, `completed`, `cancelled`, `pending`, `on-hold`, `refunded`, `failed`).
  - `search` (string, optional): Matches order ID, customer name, customer email.
  - `modified_after` (string, optional): Format `YYYY-MM-DD HH:MM:SS`.
- **Response Format**:
  ```json
  {
    "status": "success",
    "total": 5,
    "page": 1,
    "limit": 50,
    "total_pages": 1,
    "count": 5,
    "data": [
      {
        "id": 189248,
        "status": "processing",
        "currency": "INR",
        "total": 344.0,
        "tax": 0,
        "payment_method": "cod",
        "payment_method_title": "Pay On Delivery",
        "transaction_id": "",
        "customer_id": 0,
        "customer_email": "customer@example.com",
        "customer_note": "",
        "shipping_tracking": {
          "tracking_number": "AWB12345678",
          "carrier": "Delhivery",
          "tracking_url": "https://..."
        },
        "billing": {
          "first_name": "Amar",
          "last_name": "Chakraborty",
          "full_name": "Amar Chakraborty",
          "company": "",
          "address_1": "Kalyangarh",
          "address_2": "574/3",
          "city": "Ashoknagar",
          "state": "WB",
          "postcode": "743272",
          "country": "IN",
          "email": "customer@example.com",
          "phone": "9046488900"
        },
        "shipping": {
          "first_name": "Amar",
          "last_name": "Chakraborty",
          "address_1": "Kalyangarh",
          "city": "Ashoknagar",
          "state": "WB",
          "postcode": "743272",
          "country": "IN",
          "phone": "9046488900"
        },
        "items": [
          {
            "item_id": 259,
            "product_id": 186632,
            "variation_id": 186643,
            "name": "Purepet Ocean Fish Kitten Dry Food - 1.2kg",
            "quantity": 1,
            "subtotal": 244.0,
            "total": 244.0
          }
        ],
        "shipping_lines": {
          "method": "Flat rate",
          "cost": 0
        },
        "date_created": "2026-10-14 10:20:00",
        "date_modified": "2026-11-02 12:00:00"
      }
    ]
  }
  ```

#### 2. `POST /orders/update` — Update Order Fulfillment / Status
- **Method**: `POST`
- **Payload**: Single order object or array of objects:
  ```json
  {
    "id": 189248,
    "status": "completed",
    "tracking_number": "AWB9988776655",
    "carrier": "BlueDart"
  }
  ```
  *(Note: Accepts either `"id"` or `"order_id"`).*
- **Response Format**:
  ```json
  {
    "status": "success",
    "total_submitted": 1,
    "total_updated": 1,
    "total_failed": 0,
    "results": [
      {
        "index": 0,
        "order_id": 189248,
        "status": "updated"
      }
    ]
  }
  ```

---

### 4.5 Universal Hub Endpoint (`GET` / `POST /hub` or `/sync`)

#### 1. `GET /hub` — Store Overview in Single Call
- **Query Parameters**:
  - `include`: `stats`, `products`, `orders`, `customers`, `taxonomies`, or `all` (default `all`).
  - `modified_after`: Incremental timestamp `YYYY-MM-DD HH:MM:SS`.
  - `products_limit`, `products_page`
  - `orders_limit`, `orders_page`
  - `order_status`, `search`
- **Response Format**:
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
    },
    "products": { ... },
    "orders": { ... },
    "taxonomies": {
      "categories_count": 192,
      "brands_count": 418,
      "categories_tree": [ ... ],
      "categories_flat": [ ... ],
      "brands": [ ... ]
    }
  }
  ```

#### 2. `POST /hub` — Atomic Multi-Entity Execution
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "action": "batch",
    "create_products": [ ... ],
    "update_products": [ ... ],
    "update_orders": [ ... ]
  }
  ```

---

### 4.6 Additional Discovered Endpoints

1. **`GET /customers`**:
   - Query params: `page`, `limit`.
   - Returns: `{ status: "success", total, page, limit, total_pages, count, data: [{ id, user_id, first_name, last_name, email, city, state, postcode, country }] }`.
2. **`GET /brands`**:
   - Query params: `limit`.
   - Returns: `{ status: "success", brands: [{ id, name, slug, count }] }`.
3. **`GET /taxonomies`**:
   - Returns complete taxonomies object with nested `categories_tree`, `categories_flat`, and `brands`.

---

## 5. Schema Comparison: WooCommerce REST API v3 vs Fifozone OMS API

| Dimension | Legacy WooCommerce REST API (`wc/v3`) | Fifozone OMS REST API (`oms/v1`) | Migration Impact & Rules |
| :--- | :--- | :--- | :--- |
| **Authentication** | Basic Auth or query string with Consumer Key & Secret (`ck_...`, `cs_...`) | Single custom header `X-OMS-Key: oms_live_...` or query param `?oms_key=...` | Remove consumer key/secret logic. Store and pass single `X-OMS-Key` header. |
| **Base URL** | `https://store.com/wp-json/wc/v3` (often required `/index.php/wp-json/wc/v3`) | `https://fifozone.com/wp-json/oms/v1` | Update base URL configuration in environment and platform credentials. |
| **Package Dependency** | Requires `@woocommerce/woocommerce-rest-api` NPM package | Standard HTTP client (`axios` or `fetch`) | Completely uninstall `@woocommerce/woocommerce-rest-api` package. |
| **Product Create Endpoint** | `POST /wp-json/wc/v3/products` | `POST /wp-json/oms/v1/products/create` (or `POST /products`) | Change target endpoint path. |
| **Product Update Endpoint** | `PUT /wp-json/wc/v3/products/<id>` | `POST /wp-json/oms/v1/products/update` | Identifier (`id` or `sku`) goes inside JSON payload, not in URL path. |
| **Product Delete Endpoint** | `DELETE /wp-json/wc/v3/products/<id>?force=true` | `POST /wp-json/oms/v1/products/delete` | Identifier (`id` or `sku`) and `force: true` go inside JSON body. |
| **Batch Operations** | Complex envelope: `POST /products/batch` with `{ create: [], update: [], delete: [] }` | Native arrays: Send JSON array `[ {...}, {...} ]` directly to `/products/create`, `/products/update`, or `/products/delete` (up to 500 items). Also supports `POST /hub` batch envelope. | Flatten payloads: Send arrays directly to dedicated endpoints. |
| **Single Product Lookup** | `GET /products/<id>` | `GET /products?id=<id>` or `GET /products?sku=<sku>` | Returns `{ status: "success", product: { ... } }`. If not found, returns `{ status: "success", count: 0, data: [] }`. |
| **Category Spec on Product** | Array of numeric objects: `categories: [{ id: 1650 }]`. Numeric IDs strictly required; strings fail or create duplicates. | Array of string names or slugs: `categories: ["Dog Food", "Puppy Food"]`. OMS server automatically resolves or links IDs. | Stop maintaining complex local ID caches. Pass plain-text category name strings. |
| **Category Tree Retrieval** | Must page through `GET /products/categories?per_page=100&page=N` and manually stitch parent/child nodes in Node.js. | Single call: `GET /categories?format=tree` or `GET /categories?parent=0` / `parent={id}`. | Replace recursive multi-page category loop with single call to `GET /categories?format=tree`. |
| **Images Format** | Object array with `src`: `images: [{ src: "https://..." }]`. Placeholders can break sideloading. | Flat array of URLs: `images: ["https://...", "https://..."]`. First is featured, subsequent are gallery. Sideloading handles thumbnail generation and MD5 deduplication. | Send clean string URLs in `images` array. |
| **Brand Representation** | Stored in custom taxonomy terms or attributes, often plugin-dependent. | First-class field: `"brand": "Drools Focus"` or `"brands": ["Drools Focus"]`. | Directly pass brand string. |
| **GST Rate & HSN Code** | Hidden in WordPress postmeta: `meta_data: [{ key: "_hsn_code", value: "23091000" }]`. | First-class fields: `"hsn_code": "23091000"`, `"gst_rate": "18"`. | Move GST and HSN to top-level payload keys. |
| **Order Fetching** | `GET /orders` with pagination headers `x-wp-totalpages`. Line items in `line_items` array. | `GET /orders` with body pagination (`total`, `total_pages`, `count`). Line items in `items` array with `item_id`, `product_id`, `variation_id`, `quantity`, `subtotal`, `total`. | Map `order.items` directly; read pagination from JSON body. |
| **Order Status Update** | `PUT /orders/<id>` with `{ status: "completed" }` | `POST /orders/update` with `{ id: <order_id>, status: "completed", tracking_number: "...", carrier: "..." }` | Change endpoint to `/orders/update` with body parameters. |
| **Stock & Price Lookup Sync** | Async lookup table regeneration often causes delays on storefront. | Synchronous atomic update to `wpww_wc_product_meta_lookup` guaranteed on every write. | Instant store consistency upon receiving HTTP 200. |

---

## 6. Codebase Audit: Legacy WooCommerce Locations in `c:\Users\uttim\Downloads\fi`

The codebase audit reveals all locations that currently reference WooCommerce REST APIs or the `@woocommerce/woocommerce-rest-api` library:

### 6.1 Server Backend

1. **`server/package.json`**:
   - Line 23: `"@woocommerce/woocommerce-rest-api": "^1.0.2"` must be removed from `dependencies`.
2. **`server/src/services/woocommerce.service.js`**:
   - Contains legacy `WooCommerceRestApi` instantiation (`new WooCommerceRestApi(...)`), `resolveCategoryId`, `resolveSubCategoryId`, `getCategoryTree`, `resolveWooId`, `findWooProductId`, and `pullOrders` calling `wc/v3`.
   - Migration Action: Replace all calls with `FifozoneOmsService` methods, or rewrite this service as a thin adapter over `FifozoneOmsService` without legacy WooCommerce dependencies.
3. **`server/src/services/fifozoneOms.service.js`**:
   - Currently implements `pullProducts`, `createProduct`, `createProductsBatch`, `updateProduct`, `updateProductsBatch`, `pushStock`, `pushPrice`, `deleteProduct`, `deleteProductsBatch`, `testConnection`.
   - Migration Action: Add missing methods:
     - `pullOrders(options)` calling `GET /orders`
     - `updateOrder(orderId, updateData)` calling `POST /orders/update`
     - `getCategoryTree()` calling `GET /categories?format=tree`
     - `getCategories(parentId)` calling `GET /categories?parent=<id>`
     - `pullCustomers()` calling `GET /customers`
     - `getTaxonomies()` calling `GET /taxonomies`
4. **`server/src/services/sync.service.js`**:
   - Line 1: `const WooCommerceService = require('./woocommerce.service');`
   - Line 38: `WooCommerceService.clearCategoryCache();`
   - Line 249: `{ service: WooCommerceService, key: 'fifozone' }` in `syncOrders()` -> Change to `FifozoneOmsService`.
5. **`server/src/controllers/platform.controller.js`**:
   - Line 7: `const WooCommerceService = require('../services/woocommerce.service');`
   - Line 20: `getWooCommerceCategories` calling `WooCommerceService.getCategoryTree()` -> Route to `FifozoneOmsService.getCategoryTree()`.
6. **`server/src/controllers/import.controller.js`**:
   - Line 8: `const WooCommerceService = require('../services/woocommerce.service');`
   - Lines 230-256: `resolveSubCategoryId` and `resolveCategoryId` loops using `WooCommerceService.getClient()` -> Replace with direct string category passing (OMS auto-resolves category names).
7. **`server/src/routes/platform.routes.js`**:
   - Line 14: `router.get('/woocommerce/categories', requireAuth, getWooCommerceCategories);` -> Keep route alias for frontend backward compatibility while backend implementation routes to OMS `/categories?format=tree`.
8. **Scripts & Test Files**:
   - `server/test_wc_api.js`, `server/test_wc_hypo.js`, `server/test_wc_farmina.js`, `server/test_woo_connection.js` instantiate `WooCommerceRestApi` with `version: 'wc/v3'`.
   - Migration Action: Replace or migrate to test against Fifozone OMS endpoints with mocks for write operations.

---

## 7. Automated Test & Safe Verification Rules

Per requirement **R3**:
- Live API calls against `https://fifozone.com/wp-json/oms/v1` during testing must be **strictly read-only** (`GET /products`, `GET /categories`, `GET /orders`, `GET /hub`, `GET /taxonomies`, `GET /customers`, `GET /brands`).
- All product creations (`POST /products/create`), updates (`POST /products/update`), deletions (`POST /products/delete`), and order status updates (`POST /orders/update`) must be mocked or stubbed using Jest / Supertest mocks during automated verification.
- An automated verification scan script must check that zero occurrences of `wc/v3` or `@woocommerce/woocommerce-rest-api` remain in active server files.

---

## 8. Summary of Migration Steps for Implementation Agents

1. **Expand `FifozoneOmsService`**:
   - Add `pullOrders()` with pagination and mapping.
   - Add `updateOrder()` for fulfillment and status updates.
   - Add `getCategoryTree()` calling `GET /categories?format=tree`.
2. **Update `SyncService`**:
   - Switch `syncOrders()` from `WooCommerceService` to `FifozoneOmsService`.
   - Remove WooCommerce category cache calls (not needed; OMS resolves category names automatically).
3. **Update `import.controller.js` & `platform.controller.js`**:
   - Direct category resolution to `FifozoneOmsService`.
4. **Remove Legacy Dependency**:
   - Run `npm uninstall @woocommerce/woocommerce-rest-api` in `server/`.
   - Remove obsolete WC test files or update them to OMS.
5. **Add Automated Verification Script**:
   - Verify 0 instances of `wc/v3` across backend code.
   - Unit tests covering read/write workflows with mocked writes.
