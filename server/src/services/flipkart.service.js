const axios = require('axios');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

class FlipkartService {
  constructor() {
    this.name    = 'Flipkart Seller API';
    this.baseURL = 'https://api.flipkart.net/sellers';
  }

  async getCredentials(overrideCreds = null) {
    let creds = overrideCreds;
    if (!creds || !Object.keys(creds).length) {
      const dbCreds = await PlatformCredential.findOne({ platform: 'flipkart', isActive: true });
      creds = dbCreds?.credentials || {};
    }

    // Support all common alias names for Flipkart Application ID / API Key
    let clientId =
      creds.clientId ||
      creds.appId ||
      creds.apiKey ||
      process.env.FLIPKART_CLIENT_ID ||
      process.env.FLIPKART_APP_ID ||
      '';

    // Support all common alias names for Flipkart Application Secret / API Secret
    let clientSecret =
      creds.clientSecret ||
      creds.appSecret ||
      creds.apiSecret ||
      process.env.FLIPKART_CLIENT_SECRET ||
      process.env.FLIPKART_APP_SECRET ||
      '';

    if (typeof clientId === 'string') clientId = clientId.trim();
    if (typeof clientSecret === 'string') clientSecret = clientSecret.trim();

    if (!clientId || !clientSecret) {
      throw new Error('Flipkart API credentials missing. Please enter your Application ID (Client ID) and Application Secret (Client Secret).');
    }

    return { appId: clientId, clientId, clientSecret };
  }

  async getAccessToken(overrideCreds = null) {
    const { clientId, clientSecret } = await this.getCredentials(overrideCreds);
    const tokenString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
      const response = await axios.get('https://api.flipkart.net/oauth-service/oauth/token', {
        params: { grant_type: 'client_credentials' },
        headers: { Authorization: `Basic ${tokenString}` },
        timeout: 15000,
      });
      return response.data?.access_token;
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 401 || status === 403) {
        throw new Error('Invalid Flipkart credentials (401 Unauthorized). Please check your Application ID and Application Secret.');
      }
      const desc = data?.error_description || data?.message || data?.error;
      if (desc) {
        throw new Error(`Flipkart API authentication failed: ${desc}`);
      }
      throw err;
    }
  }

  async testConnection(overrideCreds = null) {
    const token = await this.getAccessToken(overrideCreds);
    if (!token) {
      throw new Error('Flipkart returned an empty access token.');
    }
    return { success: true, message: 'Flipkart API authenticated successfully! OAuth token acquired.' };
  }

  async pullProducts() {
    try {
      const token = await this.getAccessToken();
      logger.info(`[${this.name}] Fetching listings from Flipkart Seller API...`);
      const response = await axios.get(`${this.baseURL}/listings/v3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listings = response.data?.listings || [];
      return listings.map(item => ({
        fsin:       item.fsn || item.fsin || '',
        listingId:  item.listingId || '',
        masterName: item.title || item.productTitle || 'Flipkart Product',
        sku:        item.sku || item.sellerSku || item.fsn || '',
        brand:      item.brand || 'Generic',
        category:   'Pet Supplies',
        mrp:        item.price?.mrp || item.mrp || 0,
        price:      item.price?.sellingPrice || item.price || 0,
        stock:      item.totalQuantity || item.stock || 0,
        url:        item.fsn ? `https://www.flipkart.com/item/p/itmdummy?pid=${item.fsn}` : '',
      }));
    } catch (err) {
      logger.warn(`[${this.name}] pullProducts skipped: ${err.message}`);
      return [];
    }
  }

  async pullOrders() {
    try {
      const token = await this.getAccessToken();
      logger.info(`[${this.name}] Fetching orders via Flipkart Seller API...`);
      const response = await axios.post(
        `${this.baseURL}/v3/orders/search`,
        { filter: { states: ['APPROVED', 'PACKED', 'SHIPPED'] } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const orders = response.data?.orderItems || response.data?.orders || [];
      return orders.map(item => ({
        platformOrderId: item.orderId,
        customer: {
          name:  item.buyerName || 'Flipkart Customer',
          email: item.buyerEmail || 'flipkart-customer@flipkart.com',
          phone: item.buyerContact || '',
        },
        shippingAddress: {
          line1:   item.shippingAddress?.addressLine1 || '',
          line2:   item.shippingAddress?.addressLine2 || '',
          city:    item.shippingAddress?.city         || '',
          state:   item.shippingAddress?.state        || '',
          pincode: item.shippingAddress?.pinCode      || '',
        },
        items: [{
          sku:       item.sku,
          fsin:      item.fsn,
          quantity:  item.quantity || 1,
          unitPrice: item.priceComponents?.sellingPrice || 0,
        }],
        subtotal:       item.priceComponents?.totalPrice || 0,
        shippingCharge: item.priceComponents?.shippingCharge || 0,
        totalAmount:    item.priceComponents?.totalPrice || 0,
        paymentMethod:  item.paymentType || 'Flipkart',
        paymentStatus:  'paid',
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
        `${this.baseURL}/v2/inventory`,
        { sku, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true, sku, quantity, platform: 'flipkart' };
    } catch (err) {
      logger.warn(`[${this.name}] pushStock skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }

  async pushPrice(sku, price) {
    try {
      const token = await this.getAccessToken();
      await axios.patch(
        `${this.baseURL}/v2/listings`,
        { sku, price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true, sku, price, platform: 'flipkart' };
    } catch (err) {
      logger.warn(`[${this.name}] pushPrice skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }
}

module.exports = new FlipkartService();
