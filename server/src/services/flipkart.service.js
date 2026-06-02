const axios = require('axios');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

const USE_MOCK = () => process.env.USE_MOCK_API === 'true';
const MOCK_BASE = () => process.env.FLIPKART_MOCK_BASE_URL || 'http://localhost:5001/mock/flipkart';

class FlipkartService {
  constructor() {
    this.name    = 'Flipkart Seller API';
    this.baseURL = 'https://api.flipkart.net/sellers';
  }

  async getCredentials() {
    let creds = await PlatformCredential.findOne({ platform: 'flipkart', isActive: true });

    let appId        = process.env.FLIPKART_APP_ID;
    let clientId     = process.env.FLIPKART_CLIENT_ID;
    let clientSecret = process.env.FLIPKART_CLIENT_SECRET;

    if (creds?.credentials) {
      appId        = creds.credentials.appId        || appId;
      clientId     = creds.credentials.clientId     || clientId;
      clientSecret = creds.credentials.clientSecret || clientSecret;
    }

    if (!clientId || !clientSecret) {
      throw new Error('Flipkart API credentials missing. Please configure them in settings.');
    }

    return { appId, clientId, clientSecret };
  }

  async getAccessToken() {
    if (USE_MOCK()) {
      // Mock OAuth — return a fake token without hitting Flipkart servers
      const res = await axios.post(`${MOCK_BASE()}/oauth/token`, {}, { timeout: 5000 });
      return res.data?.access_token || 'mock_flipkart_token_' + Date.now();
    }

    const { clientId, clientSecret } = await this.getCredentials();
    const tokenString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.get('https://api.flipkart.net/oauth-service/oauth/token', {
      params: { grant_type: 'client_credentials' },
      headers: { Authorization: `Basic ${tokenString}` },
    });
    return response.data.access_token;
  }

  // ── Pull products (mock-aware) ────────────────────────────────────────────
  async pullProducts() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching listings from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/listings`, { timeout: 8000 });
      const listings = res.data?.listings || [];
      return listings.map(item => ({
        fsin:       item.fsn || item.fsin || '',
        listingId:  item.listingId || '',
        masterName: item.title || item.productTitle || item.masterName || 'Flipkart Product',
        sku:        item.sku || item.sellerSku || item.fsn || '',
        brand:      item.brand || 'Generic',
        category:   'Pet Supplies',
        mrp:        item.flipkartMrp?.amount || item.mrp || 0,
        price:      item.flipkartSellingPrice?.amount || item.sellingPrice || 0,
        stock:      item.stockCount ?? item.stock ?? 10,
        url:        `https://www.flipkart.com/p/itm?pid=${item.fsn}`,
      }));
    }

    // ── Live mode ──
    logger.info(`[${this.name}] Fetching listings via API...`);
    const token = await this.getAccessToken();
    const res = await axios.get(`${this.baseURL}/listings/v3`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listingsMap = res.data?.listings || {};
    return Object.keys(listingsMap).map(sku => {
      const item = listingsMap[sku];
      return {
        fsin:       item.attributeValues?.fsin?.[0] || '',
        listingId:  item.listingId || '',
        masterName: item.attributeValues?.title?.[0] || 'Flipkart Product',
        sku,
        brand:    item.attributeValues?.brand?.[0] || 'Generic',
        category: 'Pet Supplies',
        price:    item.price?.mrp || 0,
        stock:    item.location_details?.[0]?.inventory?.[0]?.available || 0,
        url:      `https://www.flipkart.com/p/itm?pid=${item.attributeValues?.fsin?.[0]}`,
      };
    });
  }

  // ── Pull orders (mock-aware) ──────────────────────────────────────────────
  async pullOrders() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching orders from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/orders`, { timeout: 8000 });
      const orders = res.data?.orders || [];
      return orders.map(o => {
        const firstItem = (o.orderItems || [])[0] || {};
        const addr = firstItem.deliveryAddress || o.shippingAddress || {};
        return {
          platformOrderId: o.orderId || o.id,
          customer: {
            name:  o.buyerName  || addr.firstName || 'Flipkart Customer',
            email: o.buyerEmail || 'flipkart-customer@flipkart.com',
            phone: o.phone      || addr.contactNumber || '',
          },
          shippingAddress: {
            line1:   addr.addressLine1 || addr.line1 || '',
            line2:   addr.addressLine2 || addr.line2 || '',
            city:    addr.city    || '',
            state:   addr.state   || '',
            pincode: addr.pincode || '',
          },
          items: (o.orderItems || []).map(i => ({
            sku:       i.sku || i.sellerSku || '',
            quantity:  i.quantity || i.qty || 1,
            unitPrice: i.priceComponents?.sellingPrice || i.unitPrice || 0,
          })),
          subtotal:       (o.orderItems || []).reduce((s, i) => s + ((i.priceComponents?.sellingPrice || i.unitPrice || 0) * (i.quantity || 1)), 0),
          shippingCharge: (o.orderItems || []).reduce((s, i) => s + (i.priceComponents?.shippingCharge || 0), 0),
          totalAmount:    o.totalAmount || (o.orderItems || []).reduce((s, i) => s + (i.priceComponents?.totalPrice || i.unitPrice || 0), 0),
          paymentMethod:  o.paymentMethod || o.paymentType || 'Flipkart',
          paymentStatus:  'paid',
        };
      });
    }

    // ── Live mode ──
    logger.info(`[${this.name}] Fetching orders via API...`);
    const token = await this.getAccessToken();
    const res = await axios.post(`${this.baseURL}/orders/search/v2`, {
      filter: { orderDate: { fromDate: new Date(Date.now() - 7 * 86400000).toISOString(), toDate: new Date().toISOString() } },
    }, { headers: { Authorization: `Bearer ${token}` } });

    const grouped = (res.data?.orderItems || []).reduce((acc, item) => {
      if (!acc[item.orderId]) acc[item.orderId] = [];
      acc[item.orderId].push(item);
      return acc;
    }, {});

    return Object.entries(grouped).map(([orderId, items]) => {
      const first = items[0];
      return {
        platformOrderId: orderId,
        customer: {
          name:  first.deliveryAddress?.firstName || 'Flipkart Customer',
          email: 'flipkart-customer@flipkart.com',
          phone: first.deliveryAddress?.contactNumber || '',
        },
        shippingAddress: {
          line1:   first.deliveryAddress?.addressLine1 || '',
          line2:   first.deliveryAddress?.addressLine2 || '',
          city:    first.deliveryAddress?.city    || '',
          state:   first.deliveryAddress?.state   || '',
          pincode: first.deliveryAddress?.pincode || '',
        },
        items: items.map(i => ({
          sku:       i.sku,
          quantity:  i.quantity,
          unitPrice: i.priceComponents?.sellingPrice || 0,
        })),
        subtotal:       items.reduce((s, i) => s + (i.priceComponents?.sellingPrice || 0) * i.quantity, 0),
        shippingCharge: items.reduce((s, i) => s + (i.priceComponents?.shippingCharge || 0), 0),
        totalAmount:    items.reduce((s, i) => s + (i.priceComponents?.totalPrice || 0), 0),
        paymentMethod:  first.paymentType || 'Flipkart',
        paymentStatus:  'paid',
      };
    });
  }

  async pushStock(sku, quantity) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushStock ${sku} → ${quantity}`);
      return { success: true, sku, quantity, platform: 'flipkart' };
    }
    const token = await this.getAccessToken();
    await axios.post(`${this.baseURL}/listings/v3/update`, {
      listings: { [sku]: { location_details: [{ location_id: 'LOC1', inventory: [{ available: quantity }] }] } },
    }, { headers: { Authorization: `Bearer ${token}` } });
    return { success: true, sku, quantity, platform: 'flipkart' };
  }

  async pushPrice(sku, price) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushPrice ${sku} → ₹${price}`);
      return { success: true, sku, price, platform: 'flipkart' };
    }
    const token = await this.getAccessToken();
    await axios.post(`${this.baseURL}/listings/v3/update`, {
      listings: { [sku]: { price: { selling_price: price } } },
    }, { headers: { Authorization: `Bearer ${token}` } });
    return { success: true, sku, price, platform: 'flipkart' };
  }
}

module.exports = new FlipkartService();
