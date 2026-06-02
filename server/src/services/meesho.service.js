const axios = require('axios');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

const USE_MOCK = () => process.env.USE_MOCK_API === 'true';
const MOCK_BASE = () => process.env.MEESHO_MOCK_BASE_URL || 'http://localhost:5001/mock/meesho';

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
    if (USE_MOCK()) {
      const res = await axios.post(`${MOCK_BASE()}/auth/token`, {}, { timeout: 5000 });
      return res.data?.access_token || 'mock_meesho_token_' + Date.now();
    }
    const { apiKey } = await this.getCredentials();
    return apiKey;
  }

  async pullProducts() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching listings from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/listings`, { timeout: 8000 });
      const listings = res.data?.listings || [];
      return listings.map(item => ({
        productId:  item.product_id   || item.productId  || '',
        sku:        item.supplier_sku || item.sku        || '',
        masterName: item.name         || item.title      || 'Meesho Product',
        brand:      item.brand        || 'Generic',
        category:   'Pet Supplies',
        mrp:        item.mrp          || 0,
        price:      item.selling_price || item.price     || 0,
        stock:      item.inventory    || item.stock      || 10,
        url:        `https://www.meesho.com/p/${item.product_id}`,
      }));
    }

    logger.info(`[${this.name}] Fetching listings via API...`);
    const token = await this.getAccessToken();
    const res = await axios.get(`${this.baseURL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, page_size: 200 },
      timeout: 15000,
    });
    const products = res.data?.products || res.data?.data || [];
    return products.map(item => ({
      productId:  item.product_id   || '',
      sku:        item.supplier_sku || item.sku || '',
      masterName: item.name         || 'Meesho Product',
      brand:      item.brand        || 'Generic',
      category:   item.category     || 'Pet Supplies',
      mrp:        item.mrp          || 0,
      price:      item.selling_price || 0,
      stock:      item.inventory    || 0,
      url:        `https://www.meesho.com/p/${item.product_id}`,
    }));
  }

  async pullOrders() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching orders from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/orders`, { timeout: 8000 });
      const orders = res.data?.orders || [];
      return orders.map(o => ({
        platformOrderId: o.order_id || o.orderId,
        customer: {
          name:  o.customer_name || 'Meesho Customer',
          email: 'meesho-customer@meesho.com',
          phone: o.phone         || '',
        },
        shippingAddress: {
          line1:   o.address || '',
          line2:   '',
          city:    o.city    || '',
          state:   o.state   || '',
          pincode: o.pincode || '',
        },
        items: [{
          sku:       o.supplier_sku  || '',
          quantity:  o.quantity      || 1,
          unitPrice: o.selling_price || 0,
        }],
        subtotal:       (o.selling_price || 0) * (o.quantity || 1),
        shippingCharge: 0,
        totalAmount:    (o.selling_price || 0) * (o.quantity || 1),
        paymentMethod:  o.payment_mode || 'Meesho',
        paymentStatus:  o.payment_mode === 'COD' ? 'pending' : 'paid',
      }));
    }

    logger.info(`[${this.name}] Fetching orders via API...`);
    const token = await this.getAccessToken();
    const res = await axios.get(`${this.baseURL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { from_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] },
      timeout: 15000,
    });
    const orders = res.data?.orders || [];
    return orders.map(o => ({
      platformOrderId: o.order_id,
      customer: {
        name:  o.customer_name || 'Meesho Customer',
        email: 'meesho-customer@meesho.com',
        phone: o.phone         || '',
      },
      shippingAddress: {
        line1:   o.address || '',
        line2:   '',
        city:    o.city    || '',
        state:   o.state   || '',
        pincode: o.pincode || '',
      },
      items: [{
        sku:       o.supplier_sku  || '',
        quantity:  o.quantity      || 1,
        unitPrice: o.selling_price || 0,
      }],
      subtotal:       (o.selling_price || 0) * (o.quantity || 1),
      shippingCharge: 0,
      totalAmount:    (o.selling_price || 0) * (o.quantity || 1),
      paymentMethod:  o.payment_mode || 'Meesho',
      paymentStatus:  o.payment_mode === 'COD' ? 'pending' : 'paid',
    }));
  }

  async pushStock(sku, quantity) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushStock ${sku} → ${quantity}`);
      return { success: true, sku, quantity, platform: 'meesho' };
    }
    const token = await this.getAccessToken();
    await axios.patch(`${this.baseURL}/inventory`, { sku, quantity },
      { headers: { Authorization: `Bearer ${token}` } });
    return { success: true, sku, quantity, platform: 'meesho' };
  }

  async pushPrice(sku, price) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushPrice ${sku} → ₹${price}`);
      return { success: true, sku, price, platform: 'meesho' };
    }
    const token = await this.getAccessToken();
    await axios.patch(`${this.baseURL}/listings`, { sku, selling_price: price },
      { headers: { Authorization: `Bearer ${token}` } });
    return { success: true, sku, price, platform: 'meesho' };
  }
}

module.exports = new MeeshoService();
