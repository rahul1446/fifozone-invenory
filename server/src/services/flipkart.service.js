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
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          const dbCreds = await PlatformCredential.findOne({ platform: 'flipkart', isActive: true });
          creds = dbCreds?.credentials || {};
        } catch (_) {
          creds = {};
        }
      } else {
        creds = {};
      }
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
      logger.info(`[${this.name}] Fetching listings from Flipkart Seller API v3...`);

      // Step 1: Search all active listings
      const searchRes = await axios.post(
        `${this.baseURL}/listings/v3/search`,
        { filters: { listing_status: 'ACTIVE' }, page_id: null },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
      );

      const rawListings = searchRes.data?.listings || [];
      if (!rawListings.length) return [];

      logger.info(`[${this.name}] Found ${rawListings.length} active listings on Flipkart. Enriching product details...`);

      // Step 2: Batch enrich details for listings (up to 10 SKUs per request)
      const enrichedProducts = [];
      const batchSize = 10;
      const skusToEnrich = rawListings.map(l => l.sku_id).filter(Boolean);

      for (let i = 0; i < Math.min(skusToEnrich.length, 100); i += batchSize) {
        const batch = skusToEnrich.slice(i, i + batchSize);
        try {
          const detailRes = await axios.get(
            `${this.baseURL}/listings/v3/${batch.map(encodeURIComponent).join(',')}`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          const available = detailRes.data?.available || {};
          for (const [sku, detail] of Object.entries(available)) {
            const matchedRaw = rawListings.find(l => l.sku_id === sku) || {};
            let totalStock = 0;
            if (Array.isArray(detail.locations)) {
              totalStock = detail.locations
                .filter(loc => loc.status === 'ENABLED')
                .reduce((sum, loc) => sum + (loc.inventory || 0), 0);
            }

            enrichedProducts.push({
              fsin:       detail.product_id || matchedRaw.product_id || '',
              listingId:  detail.listing_id || matchedRaw.listing_id || '',
              masterName: detail.product_title || `Flipkart Product (${sku})`,
              sku:        sku,
              brand:      detail.address_label?.manufacturer_details?.[0] || 'Generic',
              category:   'Pet Supplies',
              mrp:        detail.price?.mrp || 0,
              price:      detail.price?.selling_price || 0,
              stock:      totalStock,
              url:        detail.product_url || (matchedRaw.product_id ? `https://www.flipkart.com/item/p/itm?pid=${matchedRaw.product_id}` : ''),
            });
          }
        } catch (batchErr) {
          logger.warn(`[${this.name}] Batch enrichment failed for chunk ${i}: ${batchErr.message}`);
        }
      }

      // If any listings were not enriched in batches, include baseline records
      const enrichedSkuSet = new Set(enrichedProducts.map(p => p.sku));
      for (const item of rawListings) {
        if (!enrichedSkuSet.has(item.sku_id)) {
          enrichedProducts.push({
            fsin:       item.product_id || '',
            listingId:  item.listing_id || '',
            masterName: `Flipkart Product (${item.sku_id})`,
            sku:        item.sku_id,
            brand:      'Generic',
            category:   'Pet Supplies',
            mrp:        0,
            price:      0,
            stock:      0,
            url:        item.product_id ? `https://www.flipkart.com/item/p/itm?pid=${item.product_id}` : '',
          });
        }
      }

      logger.info(`[${this.name}] Successfully mapped ${enrichedProducts.length} Flipkart products.`);
      return enrichedProducts;
    } catch (err) {
      logger.warn(`[${this.name}] pullProducts skipped: ${err.message}`);
      return [];
    }
  }

  async pullOrders() {
    try {
      const token = await this.getAccessToken();
      logger.info(`[${this.name}] Fetching shipments & orders via Flipkart Seller API v3...`);

      const allShipments = [];
      const stages = [
        { type: 'preDispatch', states: ['APPROVED', 'PACKING_IN_PROGRESS', 'PACKED', 'READY_TO_DISPATCH'] },
        { type: 'postDispatch', states: ['SHIPPED', 'DELIVERED', 'PICKUP_COMPLETE'] }
      ];

      for (const stage of stages) {
        try {
          const res = await axios.post(
            `${this.baseURL}/v3/shipments/filter/`,
            {
              filter: { type: stage.type, states: stage.states },
              pagination: { pageSize: 20 }
            },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          if (res.data?.shipments?.length) {
            allShipments.push(...res.data.shipments);
          }
        } catch (stageErr) {
          logger.warn(`[${this.name}] Shipments filter for ${stage.type} error: ${stageErr.message}`);
        }
      }

      logger.info(`[${this.name}] Found ${allShipments.length} shipments from Flipkart API.`);

      const mappedOrders = [];
      for (const s of allShipments) {
        for (const item of (s.orderItems || [])) {
          const rawStatus = (item.status || '').toUpperCase();
          let normalizedStatus = 'processing';
          if (['DELIVERED'].includes(rawStatus)) normalizedStatus = 'delivered';
          else if (['SHIPPED', 'PICKUP_COMPLETE'].includes(rawStatus)) normalizedStatus = 'shipped';
          else if (['CANCELLED'].includes(rawStatus)) normalizedStatus = 'cancelled';
          else if (['APPROVED', 'PACKING_IN_PROGRESS', 'PACKED', 'READY_TO_DISPATCH'].includes(rawStatus)) normalizedStatus = 'processing';

          mappedOrders.push({
            platformOrderId: item.orderId || s.shipmentId,
            orderItemId:     item.orderItemId || '',
            platformStatus:  normalizedStatus,
            status:          normalizedStatus,
            customer: {
              name:  'Flipkart Customer',
              email: 'flipkart-customer@flipkart.com',
              phone: '',
            },
            shippingAddress: {
              line1:   'Flipkart Fulfillment',
              city:    'Flipkart Hub',
              state:   'India',
              pincode: '000000',
              country: 'India',
            },
            items: [{
              sku:       item.sku || '',
              fsin:      item.fsn || '',
              name:      item.title || 'Flipkart Item',
              quantity:  item.quantity || 1,
              unitPrice: item.priceComponents?.sellingPrice || 0,
            }],
            subtotal:       item.priceComponents?.totalPrice || 0,
            shippingCharge: item.priceComponents?.shippingCharge || 0,
            totalAmount:    item.priceComponents?.totalPrice || item.priceComponents?.customerPrice || 0,
            paymentMethod:  item.paymentType || 'Flipkart',
            paymentStatus:  item.paymentType === 'PREPAID' ? 'paid' : (normalizedStatus === 'delivered' ? 'paid' : 'pending'),
            orderDate:      item.orderDate || s.dispatchAfterDate || new Date(),
            createdAt:      item.orderDate || s.dispatchAfterDate || new Date(),
          });
        }
      }

      logger.info(`[${this.name}] Mapped ${mappedOrders.length} order items from Flipkart.`);
      return mappedOrders;
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
