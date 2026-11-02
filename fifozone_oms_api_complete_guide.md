# Fifozone Universal OMS API Hub & Companion Endpoints Complete Guide

Welcome to the official developer documentation for the Fifozone Order Management System (OMS) API.

This API provides **high-speed bulk reads (<100ms)** and **safe, atomic writes** that bypass standard WooCommerce REST overhead while maintaining 100% data integrity with WordPress High-Performance Order Storage (HPOS), catalog search, and lookup tables (`wc_product_meta_lookup`).

Every WordPress operation across the Fifozone Dashboard (products, pricing, inventory/stock, orders, categories, taxonomies, and analytics) communicates directly with these endpoints.

---

## 1. Authentication & Base URLs

### Primary Authentication Header
| Header Name | Header Value | Description |
| :--- | :--- | :--- |
| `X-OMS-Key` | `oms_live_9f8d2b7e61a4c035824e87901bcdf562` | Secret OMS live authentication key |
| `Content-Type` | `application/json` | Required for all `POST` / `PUT` requests |
| `Accept` | `application/json` | Recommended |

> [!TIP]
> **Query Parameter Fallback**: If a client or webhook cannot send custom headers, append `?oms_key=oms_live_9f8d2b7e61a4c035824e87901bcdf562` to any endpoint URL.
>
> **Instant Security Rejection**: Requests without a valid key are rejected immediately with `HTTP 401 Unauthorized` without loading plugins or hitting the database.

### Endpoints Sitemap
| Resource | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **Universal Hub (Everything in One)** | `GET` | `/wp-json/oms/v1/hub` | Retrieve store stats, products, orders, and taxonomies in a single round-trip. |
| **Universal Hub (Batch Execution)** | `POST` | `/wp-json/oms/v1/hub` | Execute batch product creates, updates, and order status changes in one call. |
| **View Products** | `GET` | `/wp-json/oms/v1/products` | High-speed catalog search with pagination, filters, and delta sync (`modified_after`). |
| **Create Product(s)** | `POST` | `/wp-json/oms/v1/products/create` | Create a single product or batch upload up to 500 products at once. |
| **Update Product(s)** | `POST` | `/wp-json/oms/v1/products/update` | Atomic partial updates for stock, prices, or details by `id` or `sku`. |
| **Delete Product(s)** | `POST` | `/wp-json/oms/v1/products/delete` | Permanently delete or trash single or mass products by `id` or `sku`. |
| **View Orders** | `GET` | `/wp-json/oms/v1/orders` | HPOS order queries with search, status filtering, and dual-mode pagination. |
| **Update Order** | `POST` | `/wp-json/oms/v1/orders/update` | Update order status, tracking numbers, courier partner, and tracking URLs. |
| **Categories & Hierarchy** | `GET` | `/wp-json/oms/v1/categories` | Parent-child category tree, top-level roots (`?parent=0`), or subcategories (`?parent={id}`). |
| **Taxonomies & Brands** | `GET` | `/wp-json/oms/v1/taxonomies` | Full list of brands and category taxonomies with product counts. |

---

## 2. Universal API Hub (`/wp-json/oms/v1/hub`)

The Universal Hub allows external systems to sync an entire store in a single HTTP request.

### A. Read Everything (`GET /hub`)
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/hub?include=stats,orders,taxonomies" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

#### Query Parameters
- `include`: Comma-separated list (`stats`, `products`, `orders`, `customers`, `taxonomies`, or `all`).
- `modified_after`: Timestamp (`YYYY-MM-DD HH:MM:SS`) for unified delta sync across products and orders.
- `products_limit`: Products per page (default `100`, max `1000`).
- `products_page`: Products page number.
- `orders_limit`: Orders per page (default `50`, max `500`).
- `orders_page`: Orders page number.
- `order_status`: Filter orders (e.g. `processing`, `completed`, `pending`).
- `search`: Keyword search matching products and orders.

### B. Batch Action Execution (`POST /hub`)
```json
{
  "action": "batch",
  "create_products": [
    {
      "name": "Orthopedic Memory Foam Dog Bed (Large)",
      "sku": "BED-ORTHO-LG",
      "regular_price": "2999",
      "sale_price": "2599",
      "stock_quantity": 15,
      "brand": "Trixie",
      "categories": ["Dog Beds & Mats"],
      "gst_rate": "18",
      "hsn_code": "94049000",
      "images": ["https://images.unsplash.com/photo-1541599540903-216a46ca1dc0"]
    }
  ],
  "update_products": [
    {
      "sku": "DFODF0007DR",
      "stock_quantity": 40,
      "regular_price": "670"
    }
  ],
  "update_orders": [
    {
      "id": 189195,
      "status": "completed",
      "tracking_number": "AWB9988776655",
      "carrier": "BlueDart"
    }
  ]
}
```

---

## 3. Categories & Hierarchical Subcategories (`/categories`)

Designed specifically for hierarchical selectors, cascaders, and category tree builders.

### 1. Get Top-Level (Main) Categories:
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/categories?parent=0" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```
**Response Sample**:
```json
{
  "status": "success",
  "parent_id": 0,
  "total": 11,
  "categories": [
    { "id": 1640, "name": "DOGS", "slug": "dogs", "parent_id": 0, "parent_name": "", "count": 5420 },
    { "id": 1639, "name": "CATS", "slug": "cat", "parent_id": 0, "parent_name": "", "count": 6705 },
    { "id": 1820, "name": "Collars & Leashes", "slug": "collars-leashes", "parent_id": 0, "parent_name": "", "count": 412 }
  ]
}
```

### 2. Get Subcategories of a Parent Category:
Pass `?parent={id}` to fetch subcategories:
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/categories?parent=1640" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

### 3. Get Full Category Tree:
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/categories?format=tree" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

---

## 4. Products Management Endpoints

### A. View Products (`GET /products`)
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/products?limit=50&page=1" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```
- **Instant SKU Lookup**: `GET /products?sku=DFODF0007DR`
- **Instant ID Lookup**: `GET /products?id=186782`
- **Delta Sync**: `GET /products?modified_after=2026-11-01+00:00:00`

### B. Create Product(s) (`POST /products/create`)
Send a single JSON object or an array of up to 500 items:
```json
[
  {
    "name": "Carniwel Fresh Chicken Adult Dog Food",
    "sku": "CARN-CHK-AD-10KG",
    "regular_price": "4299",
    "sale_price": "3899",
    "stock_quantity": 30,
    "stock_status": "instock",
    "brand": "Carniwel",
    "categories": ["Dog Food", "DOGS"],
    "gst_rate": "18",
    "hsn_code": "23091000",
    "images": [
      "https://example.com/carniwel-front.jpg",
      "https://example.com/carniwel-back.jpg"
    ],
    "description": "Premium fresh chicken dry food for adult dogs.",
    "short_description": "Grain-free, fresh chicken dog food."
  }
]
```

### C. Update Product(s) (`POST /products/update`)
Supports atomic partial updates. Specify either `id` or `sku`:
```json
[
  {
    "sku": "CARN-CHK-AD-10KG",
    "stock_quantity": 25,
    "regular_price": "4199"
  }
]
```

### D. Delete Product(s) (`POST /products/delete`)
Permanently deletes products and cleans lookup tables and metadata:
```json
[
  { "sku": "OLD-SKU-001" },
  { "id": 186782 }
]
```

---

## 5. Orders Management Endpoints

### A. View Orders (`GET /orders`)
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/orders?limit=100&page=1" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

#### Supported Query Parameters
- `limit`: Number of orders per page (default `100`, max `500`).
- `page`: Page number.
- `status`: Filter by status (`pending`, `processing`, `completed`, `cancelled`, `failed`, `refunded`, `checkout-draft`).
- `search`: Search by order ID, customer name, phone, or email.
- `modified_after`: Only orders modified on or after timestamp.

#### Response Structure
```json
{
  "status": "success",
  "total": 5,
  "page": 1,
  "limit": 100,
  "total_pages": 1,
  "count": 5,
  "data": [
    {
      "id": 189248,
      "number": "189248",
      "status": "processing",
      "currency": "INR",
      "total": 344.0,
      "date_created": "2026-10-15 14:22:10",
      "billing": {
        "full_name": "Amar Chakraborty",
        "email": "amar.chan777@gmail.com",
        "phone": "9046488900",
        "address_1": "Flat 4B, Green Glen",
        "city": "Kolkata",
        "state": "WB",
        "postcode": "700032"
      },
      "shipping": {
        "full_name": "Amar Chakraborty",
        "address_1": "Flat 4B, Green Glen",
        "city": "Kolkata",
        "state": "WB",
        "postcode": "700032"
      },
      "shipping_tracking": {
        "tracking_number": "DEL123456789",
        "carrier": "Delhivery",
        "tracking_url": "https://track.delhivery.com/shipping-tracking?awb=DEL123456789"
      },
      "items": [
        {
          "item_id": 252,
          "product_id": 186782,
          "variation_id": 186801,
          "name": "Henlo Chicken in Gravy 100g",
          "sku": "CFOWF0010HNREW",
          "quantity": 2,
          "price": 172.0,
          "total": 344.0
        }
      ]
    }
  ]
}
```

### B. Update Order Status & Courier Tracking (`POST /orders/update`)
```bash
curl -X POST "https://fifozone.com/wp-json/oms/v1/orders/update" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 189248,
    "status": "shipped",
    "tracking_number": "1234567890",
    "carrier": "Shiprocket",
    "tracking_url": "https://shiprocket.co/tracking/1234567890"
  }'
```

---

## 6. Under-the-Hood WordPress Handlers

Whenever products or orders are queried or mutated via this API:
1. **HPOS Compatibility**: Queries orders from high-performance order storage tables (`wpww_wc_orders`).
2. **Lookup Tables**: Automatically syncs `wpww_wc_product_meta_lookup` so stock and price filters work on the storefront immediately.
3. **Image Sideloading**: Downloads remote images, generates all responsive thumbnail sizes, and registers them into the WordPress Media Library with MD5 deduplication.
4. **Cache Flushing**: Automatically clears object caches and transients upon update.
5. **Zero Legacy Overhead**: Bypasses slow `wc/v3` endpoints, authentication keys, and heavyweight hooks.
