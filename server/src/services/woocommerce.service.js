const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

class WooCommerceService {
  constructor() {
    this.name = 'WooCommerce';
  }

  async getClient() {
    // 1. Try to get credentials from DB
    let creds = await PlatformCredential.findOne({ platform: 'fifozone', isActive: true });
    
    let url = process.env.WOOCOMMERCE_URL;
    let consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    let consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (creds && creds.credentials) {
      url = creds.credentials.storeUrl || url;
      consumerKey = creds.credentials.consumerKey || consumerKey;
      consumerSecret = creds.credentials.consumerSecret || consumerSecret;
    }

    if (!url || !consumerKey || !consumerSecret || consumerKey.includes('dummy')) {
      throw new Error(`WooCommerce credentials are missing or invalid. Please configure them in settings.`);
    }

    // Ensure we append /index.php to the URL if the site doesn't have pretty permalinks enabled
    // WordPress REST API always works via index.php fallback.
    const baseUrl = url.replace(/\/$/, '');
    const finalUrl = baseUrl.endsWith('index.php') ? baseUrl : `${baseUrl}/index.php`;

    return new WooCommerceRestApi({
      url: finalUrl,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret,
      version: 'wc/v3',
      queryStringAuth: true
    });
  }

  async pullProducts() {
    logger.info(`[${this.name}] Pulling products from REST API...`);
    
    try {
      const client = await this.getClient();
      const allProducts = [];
      let page = 1;
      const perPage = 100;

      // Paginate through all pages
      while (true) {
        const response = await client.get('products', { per_page: perPage, page, status: 'publish' });
        const batch = response.data;
        if (!batch || batch.length === 0) break;

        const mapped = batch.map(prod => ({
          platformProductId: String(prod.id),
          masterName: prod.name,
          sku: prod.sku || `WC-${prod.id}`,
          barcode: '',
          brand: prod.brands?.[0]?.name || 'Generic',
          category: prod.categories && prod.categories.length > 0 ? prod.categories[0].name : 'Uncategorized',
          price: parseFloat(prod.price || prod.regular_price || 0),
          mrp: parseFloat(prod.regular_price || prod.price || 0),
          stock: prod.stock_quantity ?? 0,
          slug: prod.slug,
          url: prod.permalink,
          images: prod.images ? prod.images.map(img => img.src) : [],
          description: prod.short_description || prod.description || '',
          weight: prod.weight ? parseFloat(prod.weight) : undefined,
        }));

        allProducts.push(...mapped);

        // Check if this is the last page
        const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '1');
        if (page >= totalPages) break;
        page++;
      }

      logger.info(`[${this.name}] Successfully pulled ${allProducts.length} products.`);
      return allProducts;
    } catch (error) {
      logger.error(`[${this.name}] pullProducts error: ${error.message}`);
      throw error;
    }
  }

  // ─── Find WooCommerce product ID by SKU ─────────────────────────────────────
  // Find WooCommerce product ID by SKU
  async findWooProductId(client, sku) {
    if (!sku) return null;
    try {
      const res = await client.get('products', { sku, per_page: 1, status: 'any' });
      if (res.data && res.data.length > 0) return res.data[0].id;
    } catch (_) {}
    return null;
  }

  // Find WooCommerce product ID by exact name match
  async findWooProductIdByName(client, name) {
    if (!name) return null;
    try {
      const res = await client.get('products', { search: name, per_page: 20, status: 'any' });
      if (res.data && res.data.length > 0) {
        // Find exact name match (case-insensitive)
        const match = res.data.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (match) return match.id;
        // Partial match fallback
        return res.data[0].id;
      }
    } catch (_) {}
    return null;
  }

  // Resolve a valid numeric WooCommerce ID for a product using all available lookup methods
  async resolveWooId(client, product) {
    // 1. Stored ID — must be a real positive integer
    let wooId = product.platformIds?.fifozone?.productId;
    if (wooId && !isNaN(Number(wooId)) && Number(wooId) > 0) {
      // Verify it actually exists on WooCommerce
      try {
        const check = await client.get(`products/${wooId}`);
        if (check.data?.id) return String(check.data.id);
      } catch (_) {
        // ID is stale/invalid — fall through to other methods
        wooId = null;
      }
    }
    // 2. SKU lookup (strip -DELETED- suffix)
    if (product.sku) {
      const lookupSku = product.sku.replace(/-DELETED-\d+$/, '');
      const bySkuId = await this.findWooProductId(client, lookupSku);
      if (bySkuId) return String(bySkuId);
    }
    // 3. Name lookup
    const byNameId = await this.findWooProductIdByName(client, product.masterName);
    if (byNameId) return String(byNameId);

    return null;
  }

  // ─── Build WooCommerce parent product payload ─────────────────────────────────
  buildWooPayload(product) {
    const hasVariants = product.variants && product.variants.length > 0;

    // Stock: use fifozone platform stock, fall back to totalStock
    const stockQty = (product.stockByPlatform?.fifozone > 0)
      ? product.stockByPlatform.fifozone
      : (product.totalStock ?? 0);

    // Price: use fifozone selling price, fall back to MRP, never send 0
    const price = (product.sellingPrice?.fifozone > 0)
      ? product.sellingPrice.fifozone
      : (product.mrp > 0 ? product.mrp : 0);

    const payload = {
      name: product.masterName,
      sku: product.sku || '',
      status: product.isActive ? 'publish' : 'draft',
      short_description: product.shortDescription || '',
      description: product.description || '',
    };

    if (hasVariants) {
      // ── VARIABLE product: WooCommerce needs type='variable' + attributes ────
      payload.type = 'variable';
      // Don't set price/stock on parent for variable products
      // Build unique attribute names and their possible values
      const attrMap = {};
      product.variants.forEach(v => {
        const attrName = v.name || 'Option';
        if (!attrMap[attrName]) attrMap[attrName] = new Set();
        attrMap[attrName].add(v.value);
      });
      payload.attributes = Object.entries(attrMap).map(([name, values]) => ({
        name,
        visible: true,
        variation: true,
        options: Array.from(values),
      }));
    } else {
      // ── SIMPLE product ─────────────────────────────────────────────────────
      payload.type = 'simple';
      payload.regular_price = String(price);
      payload.manage_stock = true;
      payload.stock_quantity = stockQty;
    }

    // Categories
    if (product.category) {
      payload.categories = [{ name: product.category }];
    }

    // Images — only send real hosted URLs (no placeholders)
    if (product.images && product.images.length > 0) {
      const validImages = product.images.filter(img => {
        if (!img.url) return false;
        const url = img.url.toLowerCase();
        if (url.includes('example.com')) return false;
        if (url.includes('localhost')) return false;
        if (url.includes('127.0.0.1')) return false;
        if (url.includes('placeholder')) return false;
        if (!url.startsWith('http')) return false;
        return true;
      });
      if (validImages.length > 0) {
        payload.images = validImages.map(img => ({ src: img.url }));
      }
    }

    return payload;
  }

  // ─── Push individual variations to a variable WooCommerce product ─────────────
  async syncVariations(client, wooProductId, variants) {
    if (!variants || variants.length === 0) return;

    // Fetch existing variations on WooCommerce
    let existing = [];
    try {
      const res = await client.get(`products/${wooProductId}/variations`, { per_page: 100 });
      existing = res.data || [];
    } catch (_) {}

    const existingBySku = {};
    existing.forEach(v => { if (v.sku) existingBySku[v.sku] = v.id; });

    for (const variant of variants) {
      const attrName = variant.name || 'Option';
      const attrValue = variant.value || '';
      const variantSku = variant.sku || '';
      const varPrice = (variant.price?.fifozone > 0) ? variant.price.fifozone : 0;
      const varStock = variant.stock ?? 0;

      const variationPayload = {
        sku: variantSku,
        regular_price: String(varPrice),
        manage_stock: true,
        stock_quantity: varStock,
        status: variant.isActive !== false ? 'publish' : 'private',
        attributes: [{ name: attrName, option: attrValue }],
      };

      if (existingBySku[variantSku]) {
        // Update existing variation
        await client.put(`products/${wooProductId}/variations/${existingBySku[variantSku]}`, variationPayload);
      } else {
        // Create new variation
        await client.post(`products/${wooProductId}/variations`, variationPayload);
      }
    }
    logger.info(`[${this.name}] Synced ${variants.length} variations for product ID ${wooProductId}`);
  }

  // ─── CREATE a new product on WooCommerce ─────────────────────────────────────
  async createProduct(product) {
    logger.info(`[${this.name}] Creating product: ${product.masterName}`);
    try {
      const client = await this.getClient();

      // Don't create if already exists (check by SKU)
      const existingId = await this.findWooProductId(client, product.sku);
      if (existingId) {
        logger.info(`[${this.name}] SKU ${product.sku} already exists on WooCommerce (ID: ${existingId}), updating instead.`);
        const payload = this.buildWooPayload(product);
        await client.put(`products/${existingId}`, payload);
        // Sync variations if variable product
        if (product.variants?.length > 0) {
          await this.syncVariations(client, existingId, product.variants);
        }
        return { success: true, wooProductId: existingId, action: 'updated' };
      }

      const payload = this.buildWooPayload(product);
      const res = await client.post('products', payload);
      const wooId = res.data?.id;

      // Sync variations for variable products
      if (wooId && product.variants?.length > 0) {
        await this.syncVariations(client, wooId, product.variants);
      }

      logger.info(`[${this.name}] Created product on WooCommerce with ID: ${wooId}`);
      return { success: true, wooProductId: wooId, action: 'created' };
    } catch (error) {
      logger.error(`[${this.name}] createProduct error for "${product.masterName}": ${error.message}`);
      throw error;
    }
  }

  // ─── UPDATE an existing product on WooCommerce ───────────────────────────────
  async updateProduct(product, wooProductId) {
    logger.info(`[${this.name}] Updating product: ${product.masterName}`);
    try {
      const client = await this.getClient();
      const overrideId = wooProductId && !isNaN(Number(wooProductId)) ? wooProductId : null;
      const prodWithOverride = overrideId
        ? { ...product, platformIds: { ...product.platformIds, fifozone: { productId: overrideId } } }
        : product;

      const wooId = await this.resolveWooId(client, prodWithOverride);

      if (!wooId) {
        logger.info(`[${this.name}] Product not found on WooCommerce, creating new.`);
        return this.createProduct(product);
      }

      const payload = this.buildWooPayload(product);
      await client.put(`products/${wooId}`, payload);

      // Sync variations if this is a variable product
      if (product.variants?.length > 0) {
        await this.syncVariations(client, wooId, product.variants);
      }

      logger.info(`[${this.name}] Updated WooCommerce product ID: ${wooId}`);
      return { success: true, wooProductId: wooId, action: 'updated' };
    } catch (error) {
      logger.error(`[${this.name}] updateProduct error for "${product.masterName}": ${error.message}`);
      throw error;
    }
  }

  // ─── DELETE a product from WooCommerce ───────────────────────────────────────
  async deleteProduct(product) {
    logger.info(`[${this.name}] Deleting product: ${product.masterName}`);
    try {
      const client = await this.getClient();

      // Resolve the WooCommerce ID using all available lookup methods
      const wooId = await this.resolveWooId(client, product);

      if (!wooId) {
        logger.warn(`[${this.name}] Could not find "${product.masterName}" on WooCommerce — skipping delete.`);
        return { success: false, reason: 'Not found on WooCommerce' };
      }

      // Permanently delete from WooCommerce
      await client.delete(`products/${wooId}`, { force: true });

      logger.info(`[${this.name}] Permanently deleted WooCommerce product ID: ${wooId}`);
      return { success: true, wooProductId: wooId };
    } catch (error) {
      logger.error(`[${this.name}] deleteProduct error for "${product.masterName}": ${error.message}`);
      throw error;
    }
  }

  async pushStock(sku, quantity) {
    logger.info(`[${this.name}] Pushing stock for SKU: ${sku} -> Quantity: ${quantity}`);
    try {
      const client = await this.getClient();
      const wooId = await this.findWooProductId(client, sku);
      if (!wooId) throw new Error(`Product with SKU ${sku} not found on WooCommerce`);
      await client.put(`products/${wooId}`, { manage_stock: true, stock_quantity: quantity });
      return { success: true, sku, quantity, platform: 'fifozone' };
    } catch (error) {
      logger.error(`[${this.name}] pushStock error for SKU ${sku}: ${error.message}`);
      throw error;
    }
  }

  async pushPrice(sku, price) {
    logger.info(`[${this.name}] Pushing price for SKU: ${sku} -> Price: INR ${price}`);
    try {
      const client = await this.getClient();
      const wooId = await this.findWooProductId(client, sku);
      if (!wooId) throw new Error(`Product with SKU ${sku} not found on WooCommerce`);
      await client.put(`products/${wooId}`, { regular_price: String(price) });
      return { success: true, sku, price, platform: 'fifozone' };
    } catch (error) {
      logger.error(`[${this.name}] pushPrice error for SKU ${sku}: ${error.message}`);
      throw error;
    }
  }

  async pullOrders() {
    logger.info(`[${this.name}] Pulling orders from REST API...`);
    try {
      const client = await this.getClient();
      // Fetch processing orders
      const response = await client.get('orders', { status: 'processing', per_page: 20 });
      
      const orders = response.data.map(order => ({
        platformOrderId: String(order.id),
        customer: {
          name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
          email: order.billing.email,
          phone: order.billing.phone
        },
        shippingAddress: {
          line1: order.shipping.address_1,
          line2: order.shipping.address_2,
          city: order.shipping.city,
          state: order.shipping.state,
          pincode: order.shipping.postcode
        },
        items: order.line_items.map(item => ({
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })),
        subtotal: parseFloat(order.total) - parseFloat(order.shipping_total),
        shippingCharge: parseFloat(order.shipping_total),
        totalAmount: parseFloat(order.total),
        paymentMethod: order.payment_method_title,
        paymentStatus: 'paid'
      }));
      
      logger.info(`[${this.name}] Successfully pulled ${orders.length} orders.`);
      return orders;
    } catch (error) {
      logger.error(`[${this.name}] pullOrders error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new WooCommerceService();
