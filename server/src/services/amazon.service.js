const axios = require('axios');
const SellingPartnerAPI = require('amazon-sp-api');
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

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

  // ── Pull products ────────────────────────────────────────────────────────
  async pullProducts() {
    try {
      const client = await this.getClient();
      logger.info(`[${this.name}] Fetching listings from Seller Central via SP-API...`);
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
    } catch (err) {
      logger.warn(`[${this.name}] pullProducts skipped: ${err.message}`);
      return [];
    }
  }

  // ── Pull orders ──────────────────────────────────────────────────────────
  async pullOrders() {
    try {
      const client = await this.getClient();
      logger.info(`[${this.name}] Fetching orders via Amazon SP-API...`);
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
    } catch (err) {
      logger.warn(`[${this.name}] pullOrders skipped: ${err.message}`);
      return [];
    }
  }

  async pushStock(sku, quantity) {
    try {
      const client = await this.getClient();
      await client.callAPI({
        operation: 'listingsItems.patchListingsItem',
        path: { sellerId: process.env.AMAZON_SELLER_ID || 'AXXXXXXXXXXXXX', sku },
        query: { marketplaceIds: ['A21TJRUUN4KGV'] },
        body: { productType: 'PRODUCT', patches: [{ op: 'replace', path: '/fulfillmentAvailability/0/quantity', value: [{ quantity }] }] },
      });
      return { success: true, sku, quantity, platform: 'amazon' };
    } catch (err) {
      logger.warn(`[${this.name}] pushStock skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }

  async pushPrice(sku, price) {
    try {
      const client = await this.getClient();
      await client.callAPI({
        operation: 'listingsItems.patchListingsItem',
        path: { sellerId: process.env.AMAZON_SELLER_ID || 'AXXXXXXXXXXXXX', sku },
        query: { marketplaceIds: ['A21TJRUUN4KGV'] },
        body: { productType: 'PRODUCT', patches: [{ op: 'replace', path: '/purchasableOffer/0/ourPrice', value: [{ schedule: [{ valueWithTax: price }] }] }] },
      });
      return { success: true, sku, price, platform: 'amazon' };
    } catch (err) {
      logger.warn(`[${this.name}] pushPrice skipped: ${err.message}`);
      return { success: false, reason: err.message };
    }
  }
}

module.exports = new AmazonService();
