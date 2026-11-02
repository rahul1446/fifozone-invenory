# Fifozone Order Management System (OMS) REST API Documentation

Welcome to the official developer documentation for the Fifozone Custom OMS Integration API. 

This API is built specifically for external Order Management Systems (OMS), Enterprise Resource Planning (ERP), and Warehouse Management Systems (WMS). It bypasses standard WordPress/WooCommerce plugin bloat to provide **high-speed bulk reads (<100ms)** and **safe, atomic writes** that keep WooCommerce catalog search, prices, stock statuses, and lookup tables (`wc_product_meta_lookup`) 100% synchronized.

---

## 1. Quick Start & Authentication

All API requests are made over HTTPS to:
```text
https://fifozone.com/wp-json/oms/v1
```

### Authentication Header (Required)
Every request must include your secret API key in the request header:

| Header Name | Header Value |
| :--- | :--- |
| `X-OMS-Key` | `oms_live_9f8d2b7e61a4c035824e87901bcdf562` |
| `Content-Type` | `application/json` *(for POST / PUT requests)* |

> [!TIP]
> **Query Parameter Fallback**: If your client or webhook cannot send custom HTTP headers, you can append `?oms_key=oms_live_9f8d2b7e61a4c035824e87901bcdf562` to the URL.
>
> **Security Notice**: Requests without a valid key are instantly blocked with `HTTP 401 Unauthorized` without querying the database or consuming server resources.

---

## 2. API Endpoints Overview

| Operation | Method | Endpoint Path | Description |
| :--- | :--- | :--- | :--- |
| **View / Load Products** | `GET` | `/wp-json/oms/v1/products` | Ultra-fast read of the product catalog with search, filters & delta sync. |
| **Create Products** | `POST` | `/wp-json/oms/v1/products/create` | Create a single product or batch upload up to 500 products at once. |
| **Edit Products** | `POST` | `/wp-json/oms/v1/products/update` | Update single or multiple products by `id` or `sku` with partial payload support. |
| **Delete Products** | `POST` / `DELETE` | `/wp-json/oms/v1/products/delete` | Permanently delete or trash single or mass products by `id` or `sku`. |

---

## 3. Product Fields Reference

The following table lists all supported fields. **All fields are optional except where noted.**

| Field Name | Type | Used In | Description |
| :--- | :--- | :--- | :--- |
| **`name`** / **`title`** | `string` | Create, Edit | **Mandatory on Create**. The product title. |
| **`sku`** | `string` | Create, Edit | Unique product SKU. On Edit, acts as the product identifier if `id` is omitted. |
| **`id`** | `integer` | Edit | Product ID (WordPress post ID). Acts as the primary identifier on Edit. |
| **`new_sku`** | `string` | Edit | Renames an existing product's SKU to a new unique SKU. |
| **`regular_price`** | `string`/`number` | Create, Edit | Regular base selling price in INR (e.g. `"499"` or `499`). |
| **`sale_price`** | `string`/`number` | Create, Edit | Discounted selling price. Send `null` or `""` to remove a sale price. |
| **`stock_quantity`** | `integer` | Create, Edit | Available stock. Automatically enables inventory management and sets status. |
| **`stock_status`** | `string` | Create, Edit | `instock`, `outofstock`, or `onbackorder`. |
| **`tax_status`** | `string` | Create, Edit | `taxable` (default), `none`, or `shipping`. |
| **`tax_class`** | `string` | Create, Edit | Tax class slug (e.g. `""` for Standard, or custom tax classes). |
| **`gst_rate`** | `string`/`number` | Create, Edit | GST percentage rate (e.g. `"18"`, `"12"`, `"5"`, `"0"`). |
| **`hsn_code`** | `string` | Create, Edit | Harmonized System of Nomenclature code (e.g. `"23091000"`). |
| **`brand`** / **`brands`**| `string`/`array` | Create, Edit | Brand name(s) linked to the Fifozone `product_brand` taxonomy (e.g. `"Drools"`). |
| **`categories`** | `array` | Create, Edit | Array of category names or slugs (e.g. `["Dog Food", "Puppy Food"]`). |
| **`tags`** | `array` | Create, Edit | Array of tag names or slugs (e.g. `["Dry Food", "Chicken"]`). |
| **`images`** | `array` | Create, Edit | **Unified image array**. First image becomes featured; all others become gallery images. |
| **`image_url`** | `string` | Create, Edit | Direct URL for the featured image (auto-downloaded and sideloaded). |
| **`gallery_images`** | `array` | Create, Edit | Array of image URLs to attach into the product gallery. |
| **`weight`** | `string`/`number` | Create, Edit | Product weight in kg (e.g. `"1.2"`). |
| **`dimensions`** | `object` | Create, Edit | Physical dimensions: `{"length": "30", "width": "20", "height": "10"}`. |
| **`description`** | `string` | Create, Edit | Full product description (HTML supported). |
| **`short_description`** | `string` | Create, Edit | Short excerpt/bullet summary. |
| **`status`** | `string` | Create, Edit | Product visibility: `publish`, `draft`, `private`, or `trash`. |
| **`meta_data`** | `object` | Create, Edit | Key-value dictionary for any custom data (e.g. barcode, warehouse bin). |

---

## 4. Endpoint 1: View / Load Products (`GET`)

Use this endpoint to inspect products, fetch full catalog data, search by SKU/ID, or perform fast delta syncs.

### Endpoint URL
```text
GET https://fifozone.com/wp-json/oms/v1/products
```

### Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `limit` | `integer` | `100` | Number of products to retrieve per page (max `1000`). |
| `page` | `integer` | `1` | Page number for pagination. |
| `search` | `string` | `""` | Search by product name, SKU, or product ID. |
| `category` | `string` | `""` | Filter by category slug (e.g. `dog-food`). |
| `brand` | `string` | `""` | Filter by brand slug (e.g. `drools`). |
| `stock_status` | `string` | `""` | Filter by `instock` or `outofstock`. |
| `modified_after` | `string` | `""` | **Delta Sync**: Only returns items modified on or after timestamp (`YYYY-MM-DD HH:MM:SS`). |
| `type` | `string` | `product` | `product` (main store products), `variation`, or `all`. |
| `status` | `string` | `publish` | `publish`, `draft`, `private`, or `any`. |

---

### Example A: View / Search a Single Product by SKU
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/products?search=DROOLS-PUP-01" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

### Example B: View Catalog in Bulk (100 products per page)
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/products?limit=100&page=1" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

### Example C: Incremental Delta Sync (Changes since yesterday)
```bash
curl -X GET "https://fifozone.com/wp-json/oms/v1/products?modified_after=2026-10-13%2000:00:00&limit=500" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562"
```

### Standard Response Format (`HTTP 200 OK`)
```json
{
  "status": "success",
  "total": 13599,
  "page": 1,
  "limit": 1,
  "total_pages": 13599,
  "count": 1,
  "data": [
    {
      "id": 186782,
      "sku": "DROOLS-PUP-01",
      "name": "Drools Focus Super Premium Puppy Dog Dry Food",
      "slug": "drools-focus-puppy-super-premium-dry-food",
      "url": "https://fifozone.com/product/drools-focus-puppy-super-premium-dry-food/",
      "type": "simple",
      "status": "publish",
      "price": 644.0,
      "regular_price": 644.0,
      "sale_price": null,
      "tax_status": "taxable",
      "tax_class": "",
      "hsn_code": "23091000",
      "gst_rate": "18",
      "manage_stock": true,
      "stock_quantity": 25,
      "stock_status": "instock",
      "categories": [
        "Dog Food",
        "Puppy Food"
      ],
      "category_slugs": [
        "dog-food",
        "dog-puppy-food"
      ],
      "brands": [
        "Drools Focus"
      ],
      "tags": [
        "Dog Food",
        "Chicken"
      ],
      "image": "https://fifozone.com/wp-content/uploads/2026/08/drools-main.png",
      "gallery_images": [
        "https://fifozone.com/wp-content/uploads/2026/08/drools-back.png",
        "https://fifozone.com/wp-content/uploads/2026/08/drools-nutrition.png"
      ],
      "weight": "3.0",
      "dimensions": {
        "length": "30",
        "width": "20",
        "height": "10"
      },
      "date_created": "2026-08-31 16:54:49",
      "date_modified": "2026-10-14 08:30:15"
    }
  ]
}
```

---

## 5. Endpoint 2: Create Products (`POST`)

Use this endpoint to create new products in Fifozone.

### Endpoint URL
```text
POST https://fifozone.com/wp-json/oms/v1/products/create
```
*(Also accepts `POST /wp-json/oms/v1/products`)*

### Key Rules
1. **Payload Flexibility**: You can send a **single product object** `{ ... }` or an **array of products** `[ { ... }, { ... } ]` (up to 500 items).
2. **Mandatory Field**: Only **`name`** is required. All other fields (prices, stock, images, GST) are optional.
3. **SKU Uniqueness**: If an SKU already exists in WooCommerce, the API reports an error specifically for that item without failing the other items in the batch.
4. **Multiple Images**: You can pass multiple image URLs in the `images` array. The first image becomes the main featured photo, and subsequent images become the product gallery.

---

### Example A: Create a Single Product (Minimal)
```json
{
  "name": "Basic Cotton Dog Leash"
}
```

### Example B: Create a Single Product (Full Details + Multiple Images)
```json
{
  "name": "Drools Focus Super Premium Adult Dog Food 12kg",
  "sku": "DROOLS-ADULT-12KG",
  "regular_price": "3499",
  "sale_price": "3199",
  "tax_status": "taxable",
  "tax_class": "",
  "hsn_code": "23091000",
  "gst_rate": "18",
  "stock_quantity": 40,
  "brand": "Drools Focus",
  "categories": ["Dog Food", "Adult Dog Food"],
  "tags": ["Dry Dog Food", "Chicken"],
  "weight": "12.0",
  "dimensions": {
    "length": "60",
    "width": "40",
    "height": "20"
  },
  "description": "<p>Complete nutrition formula for adult dogs with real chicken.</p>",
  "short_description": "Premium chicken dry food for adult dogs.",
  "images": [
    "https://example.com/drools-front.jpg",
    "https://example.com/drools-back.jpg",
    "https://example.com/drools-nutrition.jpg"
  ],
  "meta_data": {
    "barcode_ean": "8901234567890",
    "warehouse_bin": "A1-RACK-03"
  }
}
```

### Example C: Bulk Create Multiple Products in One Call
```json
[
  {
    "name": "Pedigree Adult Meat & Rice 3kg",
    "sku": "PED-ADULT-3KG",
    "regular_price": "899",
    "stock_quantity": 50,
    "brand": "Pedigree",
    "categories": ["Dog Food"]
  },
  {
    "name": "Whiskas Ocean Fish Cat Food 1.2kg",
    "sku": "WHIS-FISH-12KG",
    "regular_price": "499",
    "sale_price": "449",
    "stock_quantity": 35,
    "brand": "Whiskas",
    "categories": ["Cat Food"]
  }
]
```

### Response Format (`HTTP 200 OK`)
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
    },
    {
      "index": 1,
      "id": 189211,
      "sku": "WHIS-FISH-12KG",
      "name": "Whiskas Ocean Fish Cat Food 1.2kg",
      "url": "https://fifozone.com/product/whiskas-ocean-fish-cat-food-12kg/",
      "status": "created"
    }
  ]
}
```

---

## 6. Endpoint 3: Edit / Update Products (`POST` / `PUT`)

Use this endpoint to update inventory, prices, tax details, descriptions, or images of existing products.

### Endpoint URL
```text
POST https://fifozone.com/wp-json/oms/v1/products/update
```
*(Also accepts `PUT` or `PATCH` on `/wp-json/oms/v1/products`)*

### Key Rules
1. **Identifier**: Each item must have either **`id`** OR **`sku`**.
2. **Partial Updates**: Send **only the fields you want to change**. Any omitted fields are left completely untouched.
3. **Lookup Table Sync**: Changes to price or stock immediately update `wpww_wc_product_meta_lookup`, guaranteeing instant synchronization across the store, search bar, and filters.
4. **Bulk Support**: Accepts single objects or batch arrays (up to 500 items).

---

### Example A: Edit a Single Product by SKU (Update Stock & Sale Price Only)
```json
{
  "sku": "DROOLS-ADULT-12KG",
  "stock_quantity": 18,
  "sale_price": "2999"
}
```

### Example B: Edit a Single Product by ID (Update Regular Price & GST)
```json
{
  "id": 186782,
  "regular_price": "699",
  "gst_rate": "18"
}
```

### Example C: Bulk Edit Multiple Products at Once
```json
[
  {
    "sku": "PED-ADULT-3KG",
    "stock_quantity": 42,
    "regular_price": "929"
  },
  {
    "sku": "WHIS-FISH-12KG",
    "stock_quantity": 0,
    "stock_status": "outofstock"
  },
  {
    "id": 186782,
    "stock_quantity": 10
  }
]
```

### Response Format (`HTTP 200 OK`)
```json
{
  "status": "success",
  "total_submitted": 3,
  "total_updated": 3,
  "total_failed": 0,
  "results": [
    {
      "index": 0,
      "id": 189210,
      "sku": "PED-ADULT-3KG",
      "name": "Pedigree Adult Meat & Rice 3kg",
      "status": "updated",
      "updated_fields": [
        "regular_price",
        "stock_quantity",
        "stock_status"
      ]
    },
    {
      "index": 1,
      "id": 189211,
      "sku": "WHIS-FISH-12KG",
      "name": "Whiskas Ocean Fish Cat Food 1.2kg",
      "status": "updated",
      "updated_fields": [
        "stock_quantity",
        "stock_status"
      ]
    },
    {
      "index": 2,
      "id": 186782,
      "sku": "DROOLS-PUP-01",
      "name": "Drools Focus Super Premium Puppy Dog Dry Food",
      "status": "updated",
      "updated_fields": [
        "stock_quantity",
        "stock_status"
      ]
    }
  ]
}
```

---

## 7. Endpoint 4: Delete Products (`POST` / `DELETE`)

Use this endpoint to delete single products or mass-delete hundreds of products at once.

### Endpoint URL
```text
POST https://fifozone.com/wp-json/oms/v1/products/delete
```
*(Also accepts `DELETE https://fifozone.com/wp-json/oms/v1/products`)*

### Key Rules
1. **Identifier**: Each item to delete can be matched by **`sku`** OR **`id`**.
2. **Mass / Bulk Deletion**: Send a batch array of products up to 500 items per request.
3. **Permanent Deletion (`force`)**: Defaults to `true` (permanently cleans up WordPress posts, postmeta, terms, and the `wc_product_meta_lookup` table). Pass `"force": false` if you want items moved to the Trash instead.
4. **Detailed Status**: Returns a per-item success or failure status report.

---

### Example A: Delete a Single Product by SKU
```bash
curl -X POST "https://fifozone.com/wp-json/oms/v1/products/delete" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PED-ADULT-3KG"
  }'
```

### Example B: Mass / Bulk Delete Multiple Products at Once
```bash
curl -X POST "https://fifozone.com/wp-json/oms/v1/products/delete" \
  -H "X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562" \
  -H "Content-Type: application/json" \
  -d '[
    { "sku": "OLD-SKU-001" },
    { "sku": "OLD-SKU-002" },
    { "id": 186782 }
  ]'
```

### Example C: Soft Delete (Move to Trash instead of Permanent Delete)
```json
{
  "sku": "PED-ADULT-3KG",
  "force": false
}
```

### Response Format (`HTTP 200 OK`)
```json
{
  "status": "success",
  "total_submitted": 2,
  "total_deleted": 2,
  "total_failed": 0,
  "results": [
    {
      "index": 0,
      "id": 189204,
      "sku": "OLD-SKU-001",
      "name": "Old Sample Product 1",
      "status": "permanently_deleted"
    },
    {
      "index": 1,
      "id": 189205,
      "sku": "OLD-SKU-002",
      "name": "Old Sample Product 2",
      "status": "permanently_deleted"
    }
  ]
}
```

---

## 8. Complete Code Snippets for Integration

### 1. Python (`requests`)

```python
import requests

API_KEY = "oms_live_9f8d2b7e61a4c035824e87901bcdf562"
BASE_URL = "https://fifozone.com/wp-json/oms/v1"
HEADERS = {
    "X-OMS-Key": API_KEY,
    "Content-Type": "application/json"
}

# 1. LOAD: Fetch products modified in last 24 hours
def sync_inventory_from_fifozone():
    params = {
        "limit": 100,
        "modified_after": "2026-10-13 00:00:00"
    }
    response = requests.get(f"{BASE_URL}/products", headers=HEADERS, params=params)
    data = response.json()
    print(f"Total catalog count: {data['total']}, fetched: {data['count']}")
    for product in data['data']:
        print(f"[{product['sku']}] {product['name']} - ₹{product['price']} (Stock: {product['stock_quantity']})")

# 2. CREATE: Upload new products
def create_new_products(products_list):
    response = requests.post(f"{BASE_URL}/products/create", headers=HEADERS, json=products_list)
    result = response.json()
    print(f"Created: {result['total_created']} / Failed: {result['total_failed']}")
    return result

# 3. UPDATE: Bulk edit stock & price
def update_stock_and_price(updates_list):
    response = requests.post(f"{BASE_URL}/products/update", headers=HEADERS, json=updates_list)
    result = response.json()
    print(f"Updated: {result['total_updated']} / Failed: {result['total_failed']}")
    return result

# Example Execution
if __name__ == "__main__":
    # Bulk update stock for 2 products
    update_payload = [
        {"sku": "DROOLS-ADULT-12KG", "stock_quantity": 25},
        {"sku": "PED-ADULT-3KG", "stock_quantity": 50, "regular_price": "949"}
    ]
    update_stock_and_price(update_payload)
```

---

### 2. JavaScript / Node.js (`axios`)

```javascript
const axios = require('axios');

const omsApi = axios.create({
  baseURL: 'https://fifozone.com/wp-json/oms/v1',
  headers: {
    'X-OMS-Key': 'oms_live_9f8d2b7e61a4c035824e87901bcdf562',
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// 1. Fetch single product by SKU
async function getProductBySku(sku) {
  try {
    const { data } = await omsApi.get('/products', { params: { search: sku } });
    if (data.count > 0) {
      console.log('Found product:', data.data[0]);
      return data.data[0];
    }
    console.log('Product not found.');
    return null;
  } catch (err) {
    console.error('Error fetching product:', err.response?.data || err.message);
  }
}

// 2. Bulk update inventory
async function bulkUpdateInventory(items) {
  try {
    const { data } = await omsApi.post('/products/update', items);
    console.log(`Success: Updated ${data.total_updated} items.`);
    return data;
  } catch (err) {
    console.error('Bulk update error:', err.response?.data || err.message);
  }
}

// Example usage
bulkUpdateInventory([
  { sku: 'DROOLS-ADULT-12KG', stock_quantity: 14 },
  { sku: 'PED-ADULT-3KG', stock_quantity: 8 }
]);
```

---

### 3. Postman Setup

To test in Postman:
1. **Base URL**: `https://fifozone.com/wp-json/oms/v1`
2. **Headers Tab**:
   - `X-OMS-Key`: `oms_live_9f8d2b7e61a4c035824e87901bcdf562`
   - `Content-Type`: `application/json`
3. **Body Tab** *(for POST /create and POST /update)*:
   - Select **raw** and set format to **JSON**.
   - Paste your payload array or single object.

---

## 8. Error Handling & Status Codes

The API uses standard HTTP response codes accompanied by detailed JSON error descriptions:

| HTTP Code | Description | Cause |
| :--- | :--- | :--- |
| `200 OK` | Success | Operation completed. Check `total_failed` in the body for any individual item issues. |
| `400 Bad Request` | Invalid Input | Malformed JSON or batch limit exceeded (>500 items). |
| `401 Unauthorized` | Authentication Error | Missing or invalid `X-OMS-Key` header. |
| `500 Server Error` | Execution Exception | PHP/Database error. |

### Partial Success Handling in Bulk Requests
If a batch of 50 products is sent and 1 product has an invalid SKU collision:
- The HTTP status code remains `200 OK`.
- `total_created` will show `49`, and `total_failed` will show `1`.
- The `results` array specifies the exact error for index 49 (e.g. `"SKU already exists on product ID #186782"`), while all other 49 products are created successfully.
