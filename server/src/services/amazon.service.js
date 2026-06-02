const axios = require('axios');
const SellingPartnerAPI = require('amazon-sp-api');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

const USE_MOCK = () => process.env.USE_MOCK_API === 'true';
const MOCK_BASE = () => process.env.AMAZON_MOCK_BASE_URL || 'http://localhost:5001/mock/amazon';

class AmazonService {
  constructor() {
    this.name = 'Amazon India';
  }

  // ── Returns a real SP-API client (live mode only) ────────────────────────
  async getClient() {
    let creds = await PlatformCredential.findOne({ platform: 'amazon', isActive: true });

    let sellerId     = process.env.AMAZON_SELLER_ID;
    let clientId     = process.env.AMAZON_CLIENT_ID;
    let clientSecret = process.env.AMAZON_CLIENT_SECRET;
    let refreshToken = process.env.AMAZON_REFRESH_TOKEN;
    let accessKeyId  = process.env.AMAZON_AWS_ACCESS_KEY_ID;
    let secretAccessKey = process.env.AMAZON_AWS_SECRET_ACCESS_KEY;
    let roleArn      = process.env.AMAZON_ROLE_ARN;

    if (creds?.credentials) {
      sellerId        = creds.credentials.sellerId     || sellerId;
      clientId        = creds.credentials.clientId     || clientId;
      clientSecret    = creds.credentials.clientSecret || clientSecret;
      refreshToken    = creds.credentials.refreshToken || refreshToken;
      accessKeyId     = creds.credentials.awsAccessKey || accessKeyId;
      secretAccessKey = creds.credentials.awsSecretKey || secretAccessKey;
      roleArn         = creds.credentials.roleArn      || roleArn;
    }

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Amazon SP-API credentials are missing. Please configure them in settings.');
    }

    return new SellingPartnerAPI({
      region: 'eu',
      refresh_token: refreshToken,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID:     clientId,
        SELLING_PARTNER_APP_CLIENT_SECRET: clientSecret,
        AWS_ACCESS_KEY_ID:                 accessKeyId,
        AWS_SECRET_ACCESS_KEY:             secretAccessKey,
        AWS_SELLING_PARTNER_ROLE:          roleArn,
      },
    });
  }

  // ── Pull products (mock-aware) ────────────────────────────────────────────
  async pullProducts() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching products from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/catalog/2022-04-01/items`, { timeout: 8000 });
      const items = res.data?.items || res.data?.payload?.items || [];
      return items.map(item => ({
        asin:        item.asin,
        masterName:  item.summaries?.[0]?.itemName || item.title || 'Amazon Product',
        sku:         item.sku || item.sellerSku || item.asin,
        brand:       item.summaries?.[0]?.brand || item.brand || 'Generic',
        category:    'Pet Supplies',
        mrp:         item.price || item.mrp || 0,
        price:       item.sellingPrice || item.price || 0,
        stock:       item.stock ?? 10,
        url:         `https://www.amazon.in/dp/${item.asin}`,
      }));
    }

    // ── Live mode ──
    logger.info(`[${this.name}] Fetching listings from Seller Central via SP-API...`);
    const client = await this.getClient();
    const res = await client.callAPI({
      operation: 'catalogItems.searchCatalogItems',
      query: { keywords: ['pet', 'medicine'], marketplaceIds: ['A21TJRUUN4KGV'] },
    });
    const items = res?.items || [];
    return items.map(item => ({
      asin:       item.asin,
      masterName: item.summaries?.[0]?.itemName || 'Unknown Item',
      sku:        item.asin,
      brand:      item.summaries?.[0]?.brand || 'Generic',
      category:   'Pet Supplies',
      price: 0, stock: 0,
      url: `https://www.amazon.in/dp/${item.asin}`,
    }));
  }

  // ── Pull orders (mock-aware) ──────────────────────────────────────────────
  async pullOrders() {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK MODE — fetching orders from mock server`);
      const res = await axios.get(`${MOCK_BASE()}/orders/v0/orders`, { timeout: 8000 });
      const orders = res.data?.payload?.Orders || res.data?.orders || [];
      return orders.map(o => ({
        platformOrderId: o.AmazonOrderId || o.orderId,
        customer: {
          name:  o.BuyerInfo?.BuyerName  || o.buyerName  || 'Amazon Customer',
          email: o.BuyerInfo?.BuyerEmail || o.buyerEmail || 'amazon@amazon.in',
          phone: o.phone || '',
        },
        shippingAddress: {
          line1:   o.ShippingAddress?.AddressLine1 || o.shippingAddress?.line1 || '',
          line2:   o.ShippingAddress?.AddressLine2 || o.shippingAddress?.line2 || '',
          city:    o.ShippingAddress?.City         || o.shippingAddress?.city  || '',
          state:   o.ShippingAddress?.StateOrRegion|| o.shippingAddress?.state || '',
          pincode: o.ShippingAddress?.PostalCode   || o.shippingAddress?.pincode || '',
        },
        items: (o.orderItems || o.items || []).map(i => ({
          sku:       i.SellerSKU   || i.sellerSku || i.sku,
          asin:      i.ASIN        || i.asin,
          quantity:  i.QuantityOrdered || i.quantity || 1,
          unitPrice: i.ItemPrice   ? parseFloat(i.ItemPrice.Amount) : (i.unitPrice || 0),
        })),
        subtotal:      o.OrderTotal ? parseFloat(o.OrderTotal.Amount) : (o.subtotal || 0),
        shippingCharge: 0,
        totalAmount:   o.OrderTotal ? parseFloat(o.OrderTotal.Amount) : (o.totalAmount || 0),
        paymentMethod: o.PaymentMethod || 'Amazon',
        paymentStatus: 'paid',
      }));
    }

    // ── Live mode ──
    logger.info(`[${this.name}] Fetching orders via Amazon SP-API...`);
    const client = await this.getClient();
    const createdAfter = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await client.callAPI({
      operation: 'orders.getOrders',
      query: { MarketplaceIds: ['A21TJRUUN4KGV'], CreatedAfter: createdAfter, OrderStatuses: ['Unshipped', 'PartiallyShipped'] },
    });

    const orders = [];
    for (const order of (res?.payload?.Orders || [])) {
      const itemsRes = await client.callAPI({
        operation: 'orders.getOrderItems',
        path: { orderId: order.AmazonOrderId },
      });
      orders.push({
        platformOrderId: order.AmazonOrderId,
        customer: {
          name:  order.BuyerInfo?.BuyerName  || 'Amazon Customer',
          email: order.BuyerInfo?.BuyerEmail || 'amazon-customer@amazon.in',
          phone: '',
        },
        shippingAddress: {
          line1:   order.ShippingAddress?.AddressLine1   || '',
          line2:   order.ShippingAddress?.AddressLine2   || '',
          city:    order.ShippingAddress?.City            || '',
          state:   order.ShippingAddress?.StateOrRegion  || '',
          pincode: order.ShippingAddress?.PostalCode      || '',
        },
        items: (itemsRes?.payload?.OrderItems || []).map(i => ({
          sku:       i.SellerSKU,
          asin:      i.ASIN,
          quantity:  i.QuantityOrdered,
          unitPrice: i.ItemPrice ? parseFloat(i.ItemPrice.Amount) : 0,
        })),
        subtotal:       order.OrderTotal ? parseFloat(order.OrderTotal.Amount) : 0,
        shippingCharge: 0,
        totalAmount:    order.OrderTotal ? parseFloat(order.OrderTotal.Amount) : 0,
        paymentMethod:  order.PaymentMethod || 'Amazon',
        paymentStatus:  'paid',
      });
    }
    return orders;
  }

  async pushStock(sku, quantity) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushStock ${sku} → ${quantity}`);
      return { success: true, sku, quantity, platform: 'amazon' };
    }
    const client = await this.getClient();
    await client.callAPI({
      operation: 'listingsItems.patchListingsItem',
      path: { sellerId: process.env.AMAZON_SELLER_ID || 'AXXXXXXXXXXXXX', sku },
      query: { marketplaceIds: ['A21TJRUUN4KGV'] },
      body: { productType: 'PRODUCT', patches: [{ op: 'replace', path: '/fulfillmentAvailability/0/quantity', value: [{ quantity }] }] },
    });
    return { success: true, sku, quantity, platform: 'amazon' };
  }

  async pushPrice(sku, price) {
    if (USE_MOCK()) {
      logger.info(`[${this.name}] MOCK — pushPrice ${sku} → ₹${price}`);
      return { success: true, sku, price, platform: 'amazon' };
    }
    const client = await this.getClient();
    await client.callAPI({
      operation: 'listingsItems.patchListingsItem',
      path: { sellerId: process.env.AMAZON_SELLER_ID || 'AXXXXXXXXXXXXX', sku },
      query: { marketplaceIds: ['A21TJRUUN4KGV'] },
      body: { productType: 'PRODUCT', patches: [{ op: 'replace', path: '/purchasableOffer/0/ourPrice', value: [{ schedule: [{ valueWithTax: price }] }] }] },
    });
    return { success: true, sku, price, platform: 'amazon' };
  }
}

module.exports = new AmazonService();
