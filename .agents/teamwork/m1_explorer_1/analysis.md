# Fifozone OMS Order Ingestion & Fulfillment Update Architecture Analysis

**Author**: `m1_explorer_1`  
**Milestone**: M1 (Core Fifozone OMS Service Expansion)  
**Date**: 2026-11-02  
**Target File**: `server/src/services/fifozoneOms.service.js`  
**Related Files**:  
- `server/src/models/Order.model.js`
- `server/src/services/sync.service.js`
- `server/src/controllers/order.controller.js`
- `server/src/controllers/shipping.controller.js`
- `server/src/controllers/shiprocket.controller.js`

---

## 1. Executive Summary

This document specifies the exact implementation design for adding order management methods to `server/src/services/fifozoneOms.service.js`. External communication with the Fifozone storefront is transitioning away from the legacy `@woocommerce/woocommerce-rest-api` (`/wp-json/wc/v3`) to the custom high-performance Fifozone OMS REST API (`https://fifozone.com/wp-json/oms/v1`).

The two core order capabilities required for Milestone M1 are:
1. **Order Ingestion (`pullOrders`)**: Ultra-fast fetching of customer orders from High-Performance Order Storage (HPOS `wpww_wc_orders`) via `GET /wp-json/oms/v1/orders`, supporting dual-mode pagination (single-page or full pagination), query filters (`status`, `search`, `modified_after`), and robust schema normalization directly to the internal dashboard `Order` model (`Order.model.js`).
2. **Order Fulfillment Update (`updateOrder`)**: Pushing order status transitions and shipping carrier tracking details directly to the Fifozone store via `POST /wp-json/oms/v1/orders/update`, handling partial success envelopes, non-existent order IDs, and HTTP status anomalies.

All live route behaviors, response schemas, and error codes documented herein were verified against the live Fifozone OMS API (`https://fifozone.com/wp-json/oms/v1`).

---

## 2. Fifozone OMS Orders API Specification

### 2.1 Authentication & Endpoint Overview

| Parameter | Value |
| :--- | :--- |
| **Base URL** | `https://fifozone.com/wp-json/oms/v1` |
| **Orders Read Endpoint** | `GET /orders` |
| **Orders Update Endpoint** | `POST /orders/update` |
| **Auth Header** | `X-OMS-Key: oms_live_9f8d2b7e61a4c035824e87901bcdf562` |
| **Query Param Fallback** | `?oms_key=oms_live_9f8d2b7e61a4c035824e87901bcdf562` |
| **Content-Type** | `application/json` |

---

### 2.2 Endpoint: `GET /orders` (Order Retrieval)

#### Query Parameters
- `limit` (integer, optional, default `50`, max `500`): Maximum orders per page.
- `page` (integer, optional, default `1`): Page number for pagination.
- `status` (string, optional): Order status filter (`processing`, `completed`, `cancelled`, `pending`, `on-hold`, `refunded`, `failed`). Supports comma-separated strings (e.g. `processing,completed`).
- `search` (string, optional): Matches order ID, customer first name, last name, or customer email. (Note: searching by order ID e.g. `search=189248` returns the single matching order).
- `modified_after` (string, optional): Incremental delta sync filter in format `YYYY-MM-DD HH:MM:SS` (URL-encoded e.g. `2026-10-20%2000:00:00`).

#### Verified Live API Response
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
      "customer_email": "amar.chan777@gmail.com",
      "customer_note": "",
      "shipping_tracking": {
        "tracking_number": "AWB12345678",
        "carrier": "Delhivery",
        "tracking_url": ""
      },
      "billing": {
        "first_name": "Amar",
        "last_name": "Chakraborty",
        "full_name": "Amar Chakraborty",
        "company": "",
        "address_1": "Kalyangarh, North 24 Parganas",
        "address_2": "574/3,kankpul p.o kankpul",
        "city": "Ashoknagar, north 24 PGS",
        "state": "WB",
        "postcode": "743272",
        "country": "IN",
        "email": "amar.chan777@gmail.com",
        "phone": "9046488900"
      },
      "shipping": {
        "first_name": "Amar",
        "last_name": "Chakraborty",
        "full_name": "Amar Chakraborty",
        "company": "",
        "address_1": "Kalyangarh, North 24 Parganas",
        "address_2": "574/3,kankpul p.o kankpul",
        "city": "Ashoknagar, north 24 PGS",
        "state": "WB",
        "postcode": "743272",
        "country": "IN",
        "email": "",
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
      "date_created": "2026-10-31 14:25:35",
      "date_modified": "2026-10-31 14:25:41"
    }
  ]
}
```

---

### 2.3 Endpoint: `POST /orders/update` (Fulfillment & Status Update)

#### Request Payload
Accepts a single JSON object or array of objects (up to 500 items).
```json
{
  "id": 189248,
  "status": "completed",
  "tracking_number": "AWB9988776655",
  "carrier": "BlueDart"
}
```
*(Accepts either `"id"` or `"order_id"`).*

#### Success Response (`HTTP 200 OK`)
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

#### Partial Success / Failure Response (`HTTP 200 OK`)
If the order ID does not exist:
```json
{
  "status": "partial_success",
  "total_submitted": 1,
  "total_updated": 0,
  "total_failed": 1,
  "results": [
    {
      "index": 0,
      "order_id": 9999999,
      "status": "error",
      "message": "Order #9999999 not found."
    }
  ]
}
```

---

## 3. Schema Normalization Architecture

The normalized output produced by `FifozoneOmsService` serves as the clean adapter between Fifozone's external HPOS order schema and the internal database (`Order.model.js` and `sync.service.js`).

### 3.1 Field-by-Field Mapping Matrix

| Internal Target (`Order.model.js`) | Legacy WC REST Field | Fifozone OMS Field (`/orders`) | Transformation & Fallback Logic |
| :--- | :--- | :--- | :--- |
| `platformOrderId` | `String(order.id)` | `order.id` | `String(order.id)` |
| `number` | `order.number` | `order.id` | `String(order.number \|\| order.id)` |
| `orderDate` | `order.date_created` | `order.date_created` | `order.date_created ? new Date(order.date_created) : new Date()` |
| `platformStatus` | `order.status` | `order.status` | `String(order.status \|\| 'pending').toLowerCase()` |
| `customer.name` | `billing.first_name + ' ' + billing.last_name` | `billing.full_name` or `billing.first_name / last_name` | `order.billing?.full_name \|\| `${order.billing?.first_name \|\| ''} ${order.billing?.last_name \|\| ''}`.trim() \|\| order.shipping?.full_name \|\| 'Unknown Customer'` |
| `customer.email` | `billing.email` | `order.customer_email` or `billing.email` | `order.customer_email \|\| order.billing?.email \|\| ''` |
| `customer.phone` | `billing.phone` | `billing.phone` or `shipping.phone` | `order.billing?.phone \|\| order.shipping?.phone \|\| ''` |
| `customer.alternatePhone` | N/A | `shipping.phone` | `(order.shipping?.phone && order.shipping.phone !== order.billing?.phone) ? order.shipping.phone : ''` |
| `shippingAddress.line1` | `shipping.address_1` | `shipping.address_1` | `order.shipping?.address_1 \|\| order.billing?.address_1 \|\| 'N/A'` |
| `shippingAddress.line2` | `shipping.address_2` | `shipping.address_2` | `order.shipping?.address_2 \|\| order.billing?.address_2 \|\| ''` |
| `shippingAddress.city` | `shipping.city` | `shipping.city` | `order.shipping?.city \|\| order.billing?.city \|\| 'Unknown'` |
| `shippingAddress.state` | `shipping.state` | `shipping.state` | `order.shipping?.state \|\| order.billing?.state \|\| 'XX'` |
| `shippingAddress.pincode`| `shipping.postcode` | `shipping.postcode` | `order.shipping?.postcode \|\| order.billing?.postcode \|\| '000000'` |
| `shippingAddress.country`| `shipping.country` | `shipping.country` | `order.shipping?.country \|\| order.billing?.country \|\| 'India'` |
| `billingAddress.line1` | `billing.address_1` | `billing.address_1` | `order.billing?.address_1 \|\| ''` |
| `billingAddress.line2` | `billing.address_2` | `billing.address_2` | `order.billing?.address_2 \|\| ''` |
| `billingAddress.city` | `billing.city` | `billing.city` | `order.billing?.city \|\| ''` |
| `billingAddress.state` | `billing.state` | `billing.state` | `order.billing?.state \|\| ''` |
| `billingAddress.pincode`| `billing.postcode` | `billing.postcode` | `order.billing?.postcode \|\| ''` |
| `billingAddress.country`| `billing.country` | `billing.country` | `order.billing?.country \|\| 'India'` |
| `items[].sku` | `item.sku` | `item.sku` | `item.sku \|\| ''` |
| `items[].name` | `item.name` | `item.name` | `decodeHtml(item.name \|\| 'Unknown Product')` |
| `items[].platformProductId` | `String(item.product_id)` | `item.variation_id` or `item.product_id` | `String((item.variation_id && item.variation_id > 0) ? item.variation_id : (item.product_id \|\| ''))` |
| `items[].quantity` | `item.quantity` | `item.quantity` | `parseInt(item.quantity, 10) \|\| 1` |
| `items[].unitPrice` | `parseFloat(item.price)` | `item.total / item.quantity` | `item.quantity > 0 ? parseFloat((item.total / item.quantity).toFixed(2)) : parseFloat(item.total \|\| 0)` |
| `items[].total` | `parseFloat(item.total)` | `item.total` | `parseFloat(item.total \|\| 0)` |
| `items[].subtotal` | `parseFloat(item.subtotal)` | `item.subtotal` | `parseFloat(item.subtotal \|\| item.total \|\| 0)` |
| `shippingCharge` | `parseFloat(order.shipping_total)` | `shipping_lines.cost` | `parseFloat(order.shipping_lines?.cost \|\| order.shipping_total \|\| 0)` |
| `totalAmount` | `parseFloat(order.total)` | `order.total` | `parseFloat(order.total \|\| 0)` |
| `subtotal` | `order.total - order.shipping_total` | Computed | `Math.max(0, parseFloat((order.total - (order.shipping_lines?.cost \|\| 0)).toFixed(2)))` |
| `gstAmount` | `parseFloat(order.total_tax)` | `order.tax` | `parseFloat(order.tax \|\| 0)` |
| `currency` | `order.currency` | `order.currency` | `order.currency \|\| 'INR'` |
| `paymentMethod` | `order.payment_method` | `order.payment_method` & `title` | `order.payment_method === 'cod' ? 'cod' : (order.payment_method_title \|\| order.payment_method \|\| 'Prepaid')` |
| `paymentStatus` | Computed | Computed | `(order.payment_method === 'cod' && !['completed', 'delivered'].includes(order.status)) ? 'pending' : 'paid'` |
| `trackingNumber` | N/A | `shipping_tracking.tracking_number` | `order.shipping_tracking?.tracking_number \|\| ''` |
| `courierPartner` | N/A | `shipping_tracking.carrier` | `order.shipping_tracking?.carrier \|\| ''` |
| `trackingUrl` | N/A | `shipping_tracking.tracking_url` | `order.shipping_tracking?.tracking_url \|\| ''` |
| `raw` | `order` | `order` | `order` (Complete original OMS JSON object) |

---

### 3.2 Status Mapping to Internal Order Status

In `sync.service.js`, the platform status string from Fifozone is mapped into the internal MongoDB order status:

```javascript
let internalStatus = 'pending';
if (rawOrd.platformStatus) {
  const stat = rawOrd.platformStatus.toLowerCase();
  if (stat === 'processing') internalStatus = 'processing';
  else if (stat === 'completed') internalStatus = 'delivered';
  else if (stat === 'cancelled') internalStatus = 'cancelled';
  else if (stat === 'failed') internalStatus = 'failed';
  else if (stat === 'refunded') internalStatus = 'refunded';
  else if (stat === 'checkout-draft') internalStatus = 'draft';
  else if (stat === 'packed') internalStatus = 'packed';
  else if (stat === 'on-hold') internalStatus = 'pending';
  else if (stat === 'pending') internalStatus = 'pending';
}
```

---

## 4. Implementation Design for `fifozoneOms.service.js`

Below are the exact methods designed for inclusion in `FifozoneOmsService`.

### 4.1 Order Normalizer: `normalizeOmsOrder(order)`

```javascript
  // ─── Normalize OMS Order to Internal Schema ────────────────────────────────
  normalizeOmsOrder(order) {
    if (!order || typeof order !== 'object') return null;

    const billing = order.billing || {};
    const shipping = order.shipping || {};

    // Customer Name resolution
    const customerName = billing.full_name ||
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      shipping.full_name ||
      `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
      'Unknown Customer';

    // Address resolution
    const shippingAddress = {
      line1: shipping.address_1 || billing.address_1 || 'N/A',
      line2: shipping.address_2 || billing.address_2 || '',
      city: shipping.city || billing.city || 'Unknown',
      state: shipping.state || billing.state || 'XX',
      pincode: shipping.postcode || billing.postcode || '000000',
      country: shipping.country || billing.country || 'India'
    };

    const billingAddress = {
      line1: billing.address_1 || '',
      line2: billing.address_2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.postcode || '',
      country: billing.country || 'India'
    };

    // Items mapping
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems.map(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const total = parseFloat(item.total || 0);
      const subtotal = parseFloat(item.subtotal || total);
      const unitPrice = qty > 0 ? parseFloat((total / qty).toFixed(2)) : total;
      const platformProductId = String(
        (item.variation_id && Number(item.variation_id) > 0)
          ? item.variation_id
          : (item.product_id || '')
      );

      return {
        sku: item.sku || '',
        name: decodeHtml(item.name || 'Unknown Product'),
        platformProductId,
        productId: String(item.product_id || ''),
        variationId: String(item.variation_id || ''),
        itemId: String(item.item_id || ''),
        quantity: qty,
        unitPrice,
        total,
        subtotal
      };
    });

    // Financials
    const totalAmount = parseFloat(order.total || 0);
    const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);
    const subtotal = Math.max(0, parseFloat((totalAmount - shippingCharge).toFixed(2)));
    const gstAmount = parseFloat(order.tax || 0);

    // Payment details
    const paymentMethod = order.payment_method === 'cod'
      ? 'cod'
      : (order.payment_method_title || order.payment_method || 'Prepaid');

    const paymentStatus = (order.payment_method === 'cod' && !['completed', 'delivered'].includes(order.status))
      ? 'pending'
      : 'paid';

    return {
      platformOrderId: String(order.id),
      number: String(order.number || order.id),
      platformStatus: String(order.status || 'pending').toLowerCase(),
      orderDate: order.date_created ? new Date(order.date_created) : new Date(),
      dateModified: order.date_modified ? new Date(order.date_modified) : undefined,
      customer: {
        name: customerName,
        email: order.customer_email || billing.email || '',
        phone: billing.phone || shipping.phone || '',
        alternatePhone: (shipping.phone && shipping.phone !== billing.phone) ? shipping.phone : ''
      },
      shippingAddress,
      billingAddress,
      items,
      subtotal,
      shippingCharge,
      totalAmount,
      gstAmount,
      currency: order.currency || 'INR',
      paymentMethod,
      paymentStatus,
      shippingTracking: {
        trackingNumber: order.shipping_tracking?.tracking_number || '',
        courierPartner: order.shipping_tracking?.carrier || '',
        trackingUrl: order.shipping_tracking?.tracking_url || ''
      },
      raw: order
    };
  }
```

---

### 4.2 Order Ingestion: `pullOrders(options)`

```javascript
  // ─── 8. PULL ORDERS (High-speed order ingestion) ───────────────────────────
  /**
   * Pull customer orders from Fifozone OMS API.
   *
   * Dual-mode behavior:
   * 1. Single Page Mode: If `options.page` is explicitly supplied, fetches that single page.
   * 2. Full Pagination Mode: If `options.page` is omitted, automatically iterates through
   *    all available pages until complete or `options.maxPages` is reached.
   *
   * @param {Object} options
   * @param {number} [options.page]           Specific page to fetch (default: undefined -> auto-paginates)
   * @param {number} [options.limit=100]      Orders per page (max 500)
   * @param {string} [options.status]         Status filter (e.g. 'processing', 'completed')
   * @param {string} [options.search]         Search by ID, name, email
   * @param {string} [options.modified_after] Delta sync timestamp (YYYY-MM-DD HH:MM:SS)
   * @param {number} [options.maxPages]       Safety cap on pages during auto-pagination
   * @returns {Promise<Array>} Normalized order objects matching internal Order schema
   */
  async pullOrders(options = {}) {
    logger.info(`[${this.name}] Pulling orders from Fifozone OMS API...`);
    const client = this.getClient();
    const allOrders = [];

    const isSinglePage = options.page !== undefined && options.page !== null && !options.fetchAll;
    let currentPage = isSinglePage ? parseInt(options.page, 10) : 1;
    const limit = Math.min(parseInt(options.limit, 10) || 100, 500);

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS orders page ${currentPage} (limit=${limit})...`);
        const params = {
          page: currentPage,
          limit,
          ...(options.status ? { status: options.status } : {}),
          ...(options.search ? { search: options.search } : {}),
          ...(options.modified_after ? { modified_after: options.modified_after } : {})
        };

        const res = await client.get('/orders', { params });
        const resData = res.data;
        const batch = Array.isArray(resData?.data) ? resData.data : [];

        if (batch.length === 0) {
          logger.info(`[${this.name}] Page ${currentPage} returned 0 orders — pagination complete.`);
          break;
        }

        const normalizedBatch = batch
          .map(order => this.normalizeOmsOrder(order))
          .filter(Boolean);

        allOrders.push(...normalizedBatch);
        logger.info(`[${this.name}] Page ${currentPage}: ingested ${batch.length} orders (total: ${allOrders.length}/${resData.total || '?'})`);

        // If single page was requested, terminate after one fetch
        if (isSinglePage) break;

        const totalPages = resData.total_pages ? parseInt(resData.total_pages, 10) : 1;
        if (options.maxPages && currentPage >= options.maxPages) {
          logger.info(`[${this.name}] Reached maxPages limit (${options.maxPages}) — stopping pagination.`);
          break;
        }
        if (currentPage >= totalPages || batch.length < limit) {
          break;
        }

        currentPage++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allOrders.length} total orders via OMS API.`);
      return allOrders;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] pullOrders error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullOrders failed: ${errMsg}`);
    }
  }
```

---

### 4.3 Instant Order Lookup: `getOrder(orderId)`

```javascript
  // ─── 9. GET SINGLE ORDER ───────────────────────────────────────────────────
  /**
   * Fetch a single order by its ID from Fifozone OMS.
   *
   * @param {string|number} orderId Order ID number
   * @returns {Promise<Object|null>} Normalized order or null if not found
   */
  async getOrder(orderId) {
    if (!orderId) throw new Error('Fifozone OMS getOrder: orderId is required.');
    const client = this.getClient();

    try {
      const res = await client.get('/orders', {
        params: { search: String(orderId), limit: 1 }
      });
      const batch = res.data?.data || [];
      const match = batch.find(o => String(o.id) === String(orderId));
      if (!match) return null;
      return this.normalizeOmsOrder(match);
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] getOrder error for #${orderId}: ${errMsg}`);
      throw new Error(`Fifozone OMS getOrder failed: ${errMsg}`);
    }
  }
```

---

### 4.4 Order Fulfillment Update: `updateOrder(orderId, updateData)`

```javascript
  // ─── 10. UPDATE ORDER FULFILLMENT & STATUS ──────────────────────────────────
  /**
   * Update order status and fulfillment tracking on Fifozone storefront.
   * Calls POST /orders/update with { id, status, tracking_number, carrier, tracking_url }.
   *
   * @param {string|number|Object} orderId   Order ID or update object
   * @param {Object} [updateData]            Update fields if orderId is string/number
   * @param {string} [updateData.status]     Status ('processing', 'completed', 'cancelled')
   * @param {string} [updateData.tracking_number] Shipping AWB tracking number
   * @param {string} [updateData.trackingNumber]  CamelCase alias for tracking_number
   * @param {string} [updateData.carrier]    Courier name ('Delhivery', 'BlueDart', 'Shiprocket')
   * @param {string} [updateData.courierPartner]  Alias for carrier
   * @param {string} [updateData.tracking_url]    Tracking link URL
   * @param {string} [updateData.trackingUrl]     CamelCase alias for tracking_url
   * @returns {Promise<Object>} Result summary { success: true, orderId, status, raw }
   */
  async updateOrder(orderId, updateData = {}) {
    // Support object-first signature: updateOrder({ id: 189248, status: 'completed' })
    if (typeof orderId === 'object' && orderId !== null) {
      updateData = orderId;
      orderId = updateData.id || updateData.order_id;
    }

    const targetId = Number(orderId || updateData.id || updateData.order_id);
    if (!targetId || isNaN(targetId) || targetId <= 0) {
      throw new Error('Fifozone OMS updateOrder failed: A valid numeric orderId is required.');
    }

    const status = updateData.status;
    const trackingNumber = updateData.tracking_number || updateData.trackingNumber;
    const carrier = updateData.carrier || updateData.courierPartner;
    const trackingUrl = updateData.tracking_url || updateData.trackingUrl;

    if (!status && !trackingNumber && !carrier && !trackingUrl) {
      throw new Error('Fifozone OMS updateOrder failed: At least one update field (status, tracking_number, or carrier) is required.');
    }

    const payload = {
      id: targetId,
      ...(status ? { status } : {}),
      ...(trackingNumber ? { tracking_number: String(trackingNumber) } : {}),
      ...(carrier ? { carrier: String(carrier) } : {}),
      ...(trackingUrl ? { tracking_url: String(trackingUrl) } : {})
    };

    logger.info(`[${this.name}] Updating order #${targetId} (status: ${status || 'unchanged'}, carrier: ${carrier || 'none'})...`);
    const client = this.getClient();

    try {
      const res = await client.post('/orders/update', payload);
      const data = res.data;

      // Handle OMS partial_success or per-item error reports
      const firstResult = data.results?.[0];
      if (data.total_failed > 0 || firstResult?.status === 'error' || data.status === 'partial_success') {
        const errMsg = firstResult?.message || `Failed to update order #${targetId}`;
        logger.error(`[${this.name}] updateOrder rejected for #${targetId}: ${errMsg}`);
        throw new Error(`Fifozone OMS updateOrder failed: ${errMsg}`);
      }

      logger.info(`[${this.name}] ✅ Order #${targetId} updated successfully.`);
      return {
        success: true,
        orderId: firstResult?.order_id || targetId,
        status: payload.status,
        trackingNumber: payload.tracking_number || null,
        carrier: payload.carrier || null,
        raw: data
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] updateOrder error for #${targetId}: ${errMsg}`);
      throw new Error(`Fifozone OMS updateOrder failed: ${errMsg}`);
    }
  }
```

---

### 4.5 Batch Order Updates: `updateOrdersBatch(updatesList)`

```javascript
  // ─── 11. BATCH ORDER UPDATES ───────────────────────────────────────────────
  /**
   * Update multiple orders in a single atomic request (up to 500 orders).
   *
   * @param {Array<Object>} updatesList Array of order update objects
   * @returns {Promise<Object>} Batch summary response
   */
  async updateOrdersBatch(updatesList) {
    if (!Array.isArray(updatesList) || updatesList.length === 0) {
      throw new Error('Fifozone OMS updateOrdersBatch failed: updatesList array is required.');
    }

    const payloads = updatesList.map(item => {
      const targetId = Number(item.id || item.order_id);
      if (!targetId || isNaN(targetId)) {
        throw new Error(`Fifozone OMS updateOrdersBatch: Invalid order ID on item ${JSON.stringify(item)}`);
      }
      return {
        id: targetId,
        ...(item.status ? { status: item.status } : {}),
        ...(item.tracking_number || item.trackingNumber ? { tracking_number: String(item.tracking_number || item.trackingNumber) } : {}),
        ...(item.carrier || item.courierPartner ? { carrier: String(item.carrier || item.courierPartner) } : {}),
        ...(item.tracking_url || item.trackingUrl ? { tracking_url: String(item.tracking_url || item.trackingUrl) } : {})
      };
    });

    logger.info(`[${this.name}] Batch updating ${payloads.length} orders via OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.post('/orders/update', payloads);
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] updateOrdersBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS updateOrdersBatch failed: ${errMsg}`);
    }
  }
```

---

## 5. Error Resilience & Edge Cases

| Scenario | Raw OMS API Behavior | Service Mitigation in `fifozoneOms.service.js` |
| :--- | :--- | :--- |
| **Network Timeout** | Axios drops connection after `timeout: 60000` (60s) with `ECONNABORTED`. | Trapped in `catch (error)`, logs `pullOrders error: Request timed out`, throws clean error message. |
| **Invalid or Missing API Key** | HTTP 401 `{"code": "rest_forbidden", "message": "Unauthorized: Invalid or missing X-OMS-Key header."}`. | Trapped, preserves message `error.response?.data?.message`, alerts admin via logger. |
| **Empty JSON Payload on Update** | HTTP 400 Bad Request `{"code": "bad_request", "message": "Invalid JSON payload..."}`. | Pre-validated before sending; if server returns 400, wrapped in informative error. |
| **Missing `id` on Update** | HTTP 200 `partial_success` with `results[0].message: "Missing required order_id or id."`. | Pre-validated `targetId > 0`; response parser checks `total_failed > 0` and throws error. |
| **Non-Existent Order ID on Update** | HTTP 200 `partial_success` with `results[0].message: "Order #9999999 not found."`. | Checks `results[0].status === 'error'` and throws `Fifozone OMS updateOrder failed: Order #9999999 not found.`. |
| **Empty Orders Table / Out of Pages** | HTTP 200 with `data: []`, `count: 0`. | Safely breaks pagination loop and returns accumulated orders without throwing. |
| **Missing Shipping / Billing Sub-objects** | Some orders have empty billing or shipping addresses. | Safe optional chaining (`order.billing?.address_1 || order.shipping?.address_1 || 'N/A'`) prevents `TypeError`. |
| **Missing SKU on Order Items** | HPOS orders sometimes omit SKU in `order.items[].sku`. | Maps `sku: item.sku || ''` and includes `platformProductId: String(item.variation_id || item.product_id)` to enable fallback lookup by ID in `sync.service.js`. |
| **COD Order Payment Status** | COD orders are unpaid at checkout. | Computes `paymentStatus: 'pending'` for COD orders unless status is `completed` or `delivered`. |

---

## 6. Downstream Consumer Integration

### 6.1 `SyncService.syncOrders()` (`server/src/services/sync.service.js`)
Currently in `sync.service.js`:
```javascript
const platforms = [
  { service: WooCommerceService, key: 'fifozone' },
  ...
];
```
In Milestone M2, this switches to:
```javascript
const FifozoneOmsService = require('./fifozoneOms.service');
const platforms = [
  { service: FifozoneOmsService, key: 'fifozone' },
  ...
];
```
Because `FifozoneOmsService.pullOrders()` produces normalized objects with identical keys (`platformOrderId`, `platformStatus`, `orderDate`, `customer`, `shippingAddress`, `items`, `subtotal`, `shippingCharge`, `totalAmount`, `paymentMethod`, `paymentStatus`, `raw`), `syncOrders()` requires zero schema redesign and works immediately.

### 6.2 `shipping.controller.js` (`server/src/controllers/shipping.controller.js`)
In `markAsShipped`:
```javascript
if (order.platform === 'fifozone' && order.platformOrderId) {
  await FifozoneOmsService.updateOrder(order.platformOrderId, {
    status: 'completed',
    tracking_number: trackingNumber,
    carrier: courierPartner,
    tracking_url: trackingUrl
  });
}
```

### 6.3 `shiprocket.controller.js` (`server/src/controllers/shiprocket.controller.js`)
In `generateAWB`:
```javascript
if (order.platform === 'fifozone' && order.platformOrderId) {
  await FifozoneOmsService.updateOrder(order.platformOrderId, {
    status: 'shipped',
    tracking_number: order.awbCode,
    carrier: order.courierPartner,
    tracking_url: order.trackingUrl
  });
}
```

---

## 7. Verification Method

1. **Read-only live test of `pullOrders()`**:
   ```bash
   node -e "
   const oms = require('./server/src/services/fifozoneOms.service');
   oms.pullOrders({ limit: 2 }).then(orders => {
     console.log('Pulled orders:', orders.length);
     console.log('First order ID:', orders[0].platformOrderId, 'Customer:', orders[0].customer.name);
   });
   "
   ```
2. **Safe mock test for write update (`updateOrder`)**:
   Verify with Jest mock that `updateOrder` correctly sends `{ id: 189248, status: 'completed', tracking_number: 'AWB1', carrier: 'Delhivery' }` and rejects `partial_success` errors.
