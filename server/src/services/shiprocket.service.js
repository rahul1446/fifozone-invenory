const axios   = require('axios');
const logger  = require('../utils/logger');

// Lazy-require to avoid circular deps
const getDbCredentials = async () => {
  try {
    const Settings = require('../models/Settings.model');
    const s = await Settings.findOne().lean();
    if (s?.shiprocket?.email && s?.shiprocket?.password) {
      return {
        email:          s.shiprocket.email,
        password:       s.shiprocket.password,
        pickupLocation: s.shiprocket.pickupLocation || 'Primary',
      };
    }
  } catch { /* DB not ready yet — fall through to .env */ }
  return null;
};

class ShiprocketService {
  constructor() {
    this.baseURL      = 'https://apiv2.shiprocket.in/v1/external';
    this.token        = null;
    this.tokenExpiry  = null;
  }

  // ─── Auth ────────────────────────────────────────────────────
  async authenticate() {
    if (this.token && this.tokenExpiry && new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60000)) {
      return this.token;
    }

    // Try DB credentials first, fall back to .env
    const db       = await getDbCredentials();
    const email    = db?.email    || process.env.SHIPROCKET_EMAIL;
    const password = db?.password || process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new Error('Shiprocket credentials not configured. Go to Settings → Platform Sync → Shiprocket.');
    }

    let response;
    try {
      response = await axios.post(
        `${this.baseURL}/auth/login`,
        { email, password },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
    } catch (networkErr) {
      // Axios threw — either network error or HTTP 4xx/5xx
      const srMsg = networkErr.response?.data?.message
                 || networkErr.response?.data?.error
                 || networkErr.response?.data
                 || networkErr.message;
      logger.error('Shiprocket auth network error:', srMsg);
      throw new Error(`Shiprocket API error: ${JSON.stringify(srMsg)}`);
    }

    // Shiprocket returns 200 but sometimes no token (wrong credentials)
    const token = response.data?.token;
    if (!token) {
      const srMsg = response.data?.message || response.data?.error || JSON.stringify(response.data);
      logger.error('Shiprocket returned no token:', srMsg);
      throw new Error(`Shiprocket rejected login: ${srMsg}`);
    }

    this.token       = token;
    this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    logger.info('Shiprocket: authenticated successfully');
    return this.token;
  }

  async getPickupLocation() {
    const db = await getDbCredentials();
    return db?.pickupLocation || process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
  }

  async getHeaders() {
    const token = await this.authenticate();
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }

  // ─── Create Order ────────────────────────────────────────────
  async createOrder(order, pickupLocationOverride = null) {
    const headers = await this.getHeaders();

    // Sanitise phone: Shiprocket requires 10-digit Indian number
    const rawPhone = order.customer?.phone || order.customerPhone || '';
    const phone    = rawPhone.replace(/\D/g, '').slice(-10).padStart(10, '9') || '9999999999';

    // Sanitise pincode: must be 6 digits
    const rawPin   = order.shippingAddress?.pincode || '';
    const pincode  = rawPin.replace(/\D/g, '').slice(0, 6) || '110001';

    // Payment method: Shiprocket expects exactly "Prepaid" or "COD"
    const pm = (order.paymentMethod || '').toLowerCase();
    const paymentMethod = (pm === 'prepaid' || pm === 'online' || pm === 'paid') ? 'Prepaid' : 'COD';

    const orderItems = order.items.map(item => ({
      name:          (item.productSnapshot?.masterName || item.productName || 'Product').substring(0, 100),
      sku:           item.productSnapshot?.sku || item.sku || 'SKU001',
      units:         item.quantity || item.qty || 1,
      selling_price: item.unitPrice || item.productSnapshot?.sellingPrice || 0,
      discount:      item.discount || 0,
      tax:           item.gstAmount || 0,
      hsn:           item.productSnapshot?.hsnCode || ''
    }));

    const payload = {
      order_id:               String(order.orderNumber),
      order_date:             new Date(order.orderDate || order.createdAt).toISOString().split('T')[0],
      pickup_location:        pickupLocationOverride || await this.getPickupLocation(),

      billing_customer_name:  (order.customer?.name || 'Customer').split(' ')[0],
      billing_last_name:      (order.customer?.name || '').split(' ').slice(1).join(' ') || '.',
      billing_address:        (order.shippingAddress?.line1 || 'Address').substring(0, 200),
      billing_address_2:      (order.shippingAddress?.line2 || '').substring(0, 200),
      billing_city:           order.shippingAddress?.city    || 'Delhi',
      billing_pincode:        pincode,
      billing_state:          order.shippingAddress?.state   || 'Delhi',
      billing_country:        order.shippingAddress?.country || 'India',
      billing_email:          order.customer?.email          || 'customer@example.com',
      billing_phone:          phone,

      shipping_is_billing:    true,
      order_items:            orderItems,
      payment_method:         paymentMethod,
      shipping_charges:       order.shippingCharge || 0,
      giftwrap_charges:       0,
      transaction_charges:    0,
      total_discount:         order.discount || 0,
      sub_total:              order.subtotal || order.totalAmount || 0,
      length:                 10,
      breadth:                10,
      height:                 10,
      weight:                 0.5
    };

    let response;
    try {
      response = await axios.post(`${this.baseURL}/orders/create/adhoc`, payload, { headers });
    } catch (err) {
      const srData = err.response?.data;
      const srMsg  = srData?.message
                  || (Array.isArray(srData?.errors) ? srData.errors.join(', ') : null)
                  || JSON.stringify(srData)
                  || err.message;
      logger.error('Shiprocket createOrder failed:', JSON.stringify(srData || err.message));

      // Special case: Shiprocket tells us which locations ARE valid — pass them back
      if (srData?.message?.toLowerCase().includes('pickup location')) {
        const validLocations = srData?.data?.data || [];
        const structuredErr  = new Error(`WRONG_PICKUP_LOCATION:${srMsg}`);
        structuredErr.pickupLocations = validLocations
          .filter(l => l.status === 1) // only active ones
          .map(l => ({
            id:      l.id,
            name:    l.pickup_location,
            address: [l.address, l.address_2, l.city, l.state, l.pin_code].filter(Boolean).join(', '),
            primary: l.status === 2,
          }));
        throw structuredErr;
      }

      throw new Error(`Shiprocket: ${srMsg}`);
    }

    // Log the FULL response so we can debug response structure
    logger.info('Shiprocket raw response:', JSON.stringify(response.data));

    // Shiprocket can wrap response in different shapes — handle all of them
    const d = response.data;

    // Extract order_id — may be at root or nested inside .payload / .data
    const orderId    = d?.order_id    ?? d?.payload?.order_id    ?? d?.data?.order_id    ?? null;
    const shipmentId = d?.shipment_id ?? d?.payload?.shipment_id ?? d?.data?.shipment_id ?? null;
    const status     = d?.status      ?? d?.payload?.status      ?? d?.data?.status      ?? 'NEW';

    if (!orderId && !shipmentId) {
      // Something went wrong even though HTTP was 200 — throw so the UI shows the real response
      logger.error('Shiprocket returned 200 but no order_id/shipment_id:', JSON.stringify(d));
      throw new Error(`Shiprocket returned success but no order was created. Response: ${JSON.stringify(d)}`);
    }

    logger.info(`Shiprocket order created: orderId=${orderId} shipmentId=${shipmentId}`);
    // Return a normalised object the controller can rely on
    return { ...d, order_id: orderId, shipment_id: shipmentId, status };
  }

  // ─── Cancel Order ────────────────────────────────────────────
  async cancelOrder(shiprocketOrderIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/orders/cancel`, { ids: shiprocketOrderIds }, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket cancelOrder failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to cancel Shiprocket order');
    }
  }

  // ─── Generate AWB ────────────────────────────────────────────
  async generateAWB(shipmentId, courierId = null) {
    try {
      const headers = await this.getHeaders();
      const payload = { shipment_id: shipmentId };
      if (courierId) payload.courier_id = courierId;
      const response = await axios.post(`${this.baseURL}/courier/assign/awb`, payload, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket generateAWB failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate AWB');
    }
  }

  // ─── Request Pickup ──────────────────────────────────────────
  async requestPickup(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/courier/generate/pickup`, { shipment_id: [shipmentId] }, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket requestPickup failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to request pickup');
    }
  }

  // ─── Print Label ─────────────────────────────────────────────
  async printLabel(shipmentIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/courier/generate/label`, { shipment_id: shipmentIds }, { headers });
      return response.data; // Contains label_url
    } catch (error) {
      logger.error('Shiprocket printLabel failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate label');
    }
  }

  // ─── Print Invoice ───────────────────────────────────────────
  async printInvoice(orderIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/orders/print/invoice`, { ids: orderIds }, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket printInvoice failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate invoice');
    }
  }

  // ─── Generate Manifest ───────────────────────────────────────
  async generateManifest(shipmentIds) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/manifests/generate`, { shipment_id: shipmentIds }, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket manifest failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate manifest');
    }
  }

  // ─── Track Shipment ──────────────────────────────────────────
  async trackShipment(awbCode) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/courier/track/awb/${awbCode}`, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket track failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to track shipment');
    }
  }

  // ─── Check Serviceability ────────────────────────────────────
  async checkServiceability({ pickupPostcode, deliveryPostcode, weight, cod }) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/courier/serviceability`, {
        headers,
        params: {
          pickup_postcode:   pickupPostcode,
          delivery_postcode: deliveryPostcode,
          weight:            weight || 0.5,
          cod:               cod ? 1 : 0
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket serviceability failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to check serviceability');
    }
  }

  // ─── Get Available Couriers ──────────────────────────────────
  async getAvailableCouriers(shipmentId) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/courier/courierListWithCounts?shipment_id=${shipmentId}`, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket getCouriers failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch couriers');
    }
  }

  // ─── Get Pickup Locations ────────────────────────────────────
  async getPickupLocations() {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/settings/company/pickup`, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket pickup locations failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch pickup locations');
    }
  }

  // ─── NDR Actions ─────────────────────────────────────────────
  async getNDRList() {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/ndr`, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket NDR list failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch NDR list');
    }
  }

  async submitNDRAction(awbCode, action, remarks = '') {
    try {
      const headers = await this.getHeaders();
      const payload = {
        request_type: action, // 're-attempt' | 'rto'
        comment:      remarks
      };
      const response = await axios.post(`${this.baseURL}/ndr/${awbCode}/action`, payload, { headers });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket NDR action failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to submit NDR action');
    }
  }

  // ─── All Shipments ───────────────────────────────────────────
  async getAllShipments(params = {}) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/shipments`, { headers, params });
      return response.data;
    } catch (error) {
      logger.error('Shiprocket getAllShipments failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch shipments');
    }
  }
}

module.exports = new ShiprocketService();
