const axios = require('axios');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

class MeeshoService {
  constructor() {
    this.name    = 'Meesho Seller API';
    this.baseURL = 'https://api.meesho.io/v1';
  }

  async getCredentials() {
    const creds = await PlatformCredential.findOne({ platform: 'meesho', isActive: true });
    let supplierId = process.env.MEESHO_SUPPLIER_ID;
    let apiKey     = process.env.MEESHO_API_KEY;
    if (creds?.credentials) {
      supplierId = creds.credentials.supplierId || supplierId;
      apiKey     = creds.credentials.apiKey     || apiKey;
    }
    if (!apiKey) {
      throw new Error('Meesho API credentials missing. Please configure them in Settings → Platforms.');
    }
    return { supplierId, apiKey };
  }

  async getAccessToken() {
    const { apiKey } = await this.getCredentials();
    return apiKey;
  }

  async pullProducts() {
    try {
      logger.info(`[${this.name}] Fetching listings via API...`);
      const token = await this.getAccessToken();
      const res = await axios.get(`${this.baseURL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, page_size: 200 },
        timeout: 15000,
      });
      const items = res.data?.products || res.data?.data || [];
      return items.map(item => ({
        productId:  item.product_id   || item.id    || '',
        sku:        item.supplier_sku || item.sku   || '',
        masterName: item.name         || item.title || 'Meesho Product',
        brand:      item.brand        || 'Generic',
        category:   item.category     || 'Pet Supplies',
        mrp:        item.mrp          || 0,
        price:      item.price        || item.selling_price || 0,
        stock:      item.inventory    || item.stock || 0,
        url:        item.product_id ? `https://www.meesho.com/p/${item.product_id}` : '',
      }));
    } catch (err) {
      logger.warn(`[${this.name}] pullProducts skipped: ${err.message}`);
      return [];
    }
  }

  async pullOrders() {
    try {
      logger.info(`[${this.name}] Fetching orders via API...`);
      const token = await this.getAccessToken();
      const res = await axios.get(`${this.baseURL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'PENDING,CONFIRMED', page: 1, page_size: 100 },
        timeout: 15000,
      });
      const orders = res.data?.orders || [];
      return orders.map(o => ({
        platformOrderId: o.order_id || o.id,
        customer: {
          name:  o.customer_name  || 'Meesho Customer',
          email: o.customer_email || 'meesho-buyer@meesho.com',
          phone: o.customer_phone || '',
        },
        shippingAddress: {
          line1:   o.address || '',
          city:    o.city    || '',
          state:   o.state   || '',
          pincode: o.pincode || '',
        },
        items: [{
          sku:       o.supplier_sku || o.sku,
          quantity:  o.quantity || 1,
          unitPrice: o.selling_price || o.price || 0,
        }],
        subtotal:       (o.selling_price || 0) * (o.quantity || 1),
        shippingCharge: 0,
        totalAmount:    (o.selling_price || 0) * (o.quantity || 1),
        paymentMethod:  o.payment_mode || 'Online',
        paymentStatus:  o.payment_mode === 'COD' ? 'pending' : 'paid',
      }));
    } catch (err) {
      logger.warn(`[${this.name}] pullOrders skipped: ${err.message}`);
      return [];
    }
  }

  async pushStock(sku, quantity) {
    try {
      const token = await this.getAccessToken();
      await axios.patch(
        `${this.baseURL}/inventory`,
        { supplier_sku: sku, inventory: quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true, sku, quantity, platform: 'meesho' };
    } catch (err) {
      logger.warn(`[${this.name}] pushStock skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }

  async pushPrice(sku, price) {
    try {
      const token = await this.getAccessToken();
      await axios.patch(
        `${this.baseURL}/listings`,
        { supplier_sku: sku, price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true, sku, price, platform: 'meesho' };
    } catch (err) {
      logger.warn(`[${this.name}] pushPrice skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }
}

module.exports = new MeeshoService();
