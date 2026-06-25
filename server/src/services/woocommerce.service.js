const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;
const PlatformCredential = require('../models/PlatformCredential.model');
const logger = require('../utils/logger');

const decodeHtml = (str) => {
  if (!str) return '';
  // First replace common entities
  let decoded = str
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // replace block elements with newlines before stripping tags
  decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
  
  // Then strip all HTML tags
  return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
};

class WooCommerceService {
  constructor() {
    this.name = 'WooCommerce';
    // Per-sync-run cache: categoryName (lowercase) → WooCommerce category ID
    // Cleared at the start of each sync so stale IDs never persist.
    this._categoryCache = new Map();
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

  // Helper to parse response data since some WP setups return a BOM or string
  parseResponseData(data) {
    if (typeof data === 'string') {
      try {
        // Strip BOM if present
        const clean = data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data;
        return JSON.parse(clean);
      } catch (e) {
        return [];
      }
    }
    return data || [];
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
        const batch = this.parseResponseData(response.data);
        if (!batch || batch.length === 0) break;

        const mapped = batch.map(prod => ({
          platformProductId: String(prod.id),
          masterName: decodeHtml(prod.name),
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
          shortDescription: decodeHtml(prod.short_description || ''),
          description: decodeHtml(prod.description || ''),
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

  // ─── Category name → WooCommerce category ID (with auto-create) ─────────────
  /**
   * Given a plain-text category name (e.g. "Dog Medicine"), returns the
   * corresponding WooCommerce numeric category ID.
   *
   * Strategy:
   *  1. Return from in-memory cache if already resolved this session.
   *  2. Fetch the full category list from WooCommerce and cache every entry.
   *  3. If the category still isn't found, CREATE it in WooCommerce and cache
   *     the new ID so subsequent products reuse it without extra API calls.
   *
   * @param {object} client  WooCommerce REST client
   * @param {string} name    Raw category name from our product record
   * @returns {Promise<number|null>} WooCommerce category ID, or null on failure
   */
  async resolveCategoryId(client, name) {
    if (!name || !name.trim()) return null;

    const key = name.trim().toLowerCase();

    // 1. In-memory cache hit
    if (this._categoryCache.has(key)) {
      return this._categoryCache.get(key);
    }

    // 2. Fetch all categories from WooCommerce and warm the cache
    try {
      let page = 1;
      while (true) {
        const res = await client.get('products/categories', { per_page: 100, page });
        const batch = this.parseResponseData(res.data);
        if (batch.length === 0) break;
        batch.forEach(cat => {
          this._categoryCache.set(cat.name.trim().toLowerCase(), cat.id);
        });
        // Check if this is the last page
        const totalPages = parseInt(res.headers?.['x-wp-totalpages'] || '1');
        if (page >= totalPages) break;
        page++;
      }
    } catch (err) {
      logger.warn(`[${this.name}] resolveCategoryId: failed to fetch categories — ${err.message}`);
      return null;
    }

    // 3. Cache hit after warming
    if (this._categoryCache.has(key)) {
      return this._categoryCache.get(key);
    }

    // 4. Category not found — auto-create it in WooCommerce
    try {
      logger.info(`[${this.name}] Category "${name}" not found in WooCommerce — creating it.`);
      const res = await client.post('products/categories', { name: name.trim() });
      const newId = res.data?.id;
      if (newId) {
        this._categoryCache.set(key, newId);
        logger.info(`[${this.name}] Created WooCommerce category "${name}" with ID: ${newId}`);
        return newId;
      }
    } catch (err) {
      logger.warn(`[${this.name}] resolveCategoryId: Failed to create category "${name}" — ${err.message}`);
      return null;
    }

    return null;
  }

  // ─── Fetch WooCommerce Category Tree ─────────────────────────────────────────
  /**
   * Fetches all categories from WooCommerce and structures them into a parent-child tree
   * for the frontend TreeSelect component.
   */
  async getCategoryTree() {
    const client = await this.getClient();
    let allCategories = [];
    let page = 1;

    try {
      while (true) {
        const res = await client.get('products/categories', { per_page: 100, page });
        const batch = this.parseResponseData(res.data);
        if (batch.length === 0) break;
        allCategories.push(...batch);
        
        const totalPages = parseInt(res.headers?.['x-wp-totalpages'] || '1');
        if (page >= totalPages) break;
        page++;
      }

      const catMap = {};
      allCategories.forEach(cat => {
        catMap[cat.id] = {
          title: cat.name,
          value: `${cat.id}|${cat.name}`, // Composite value for uniqueness + name access
          key: cat.id,
          parent: cat.parent,
          children: []
        };
      });

      const tree = [];
      Object.values(catMap).forEach(catNode => {
        if (catNode.parent === 0) {
          tree.push(catNode);
        } else if (catMap[catNode.parent]) {
          catMap[catNode.parent].children.push(catNode);
        }
      });

      // Cleanup empty children arrays for a cleaner response
      const cleanTree = (nodes) => {
        nodes.forEach(node => {
          if (node.children.length === 0) delete node.children;
          else cleanTree(node.children);
          delete node.parent;
          delete node.key;
        });
        return nodes;
      };

      return cleanTree(tree);
    } catch (error) {
      logger.error(`[${this.name}] getCategoryTree failed: ${error.message}`);
      throw error;
    }
  }

  // Clear category cache — call this at the start of each sync run
  clearCategoryCache() {
    this._categoryCache.clear();
  }

  // ─── Find WooCommerce product ID by SKU ─────────────────────────────────────
  // Find WooCommerce product ID by SKU
  async findWooProductId(client, sku) {
    if (!sku) return null;
    try {
      const res = await client.get('products', { sku, per_page: 1, status: 'any' });
      const data = this.parseResponseData(res.data);
      if (data && data.length > 0) return data[0].id;
    } catch (_) {}
    return null;
  }

  // Find WooCommerce product ID by exact name match
  async findWooProductIdByName(client, name) {
    if (!name) return null;
    try {
      const res = await client.get('products', { search: name, per_page: 20, status: 'any' });
      const data = this.parseResponseData(res.data);
      if (data && data.length > 0) {
        // Find exact match (case-insensitive)
        const match = data.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
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
  /**
   * @param {object} product      Our internal product document
   * @param {number|null} categoryId  Pre-resolved WooCommerce category ID (from resolveCategoryId)
   */
  buildWooPayload(product, categoryIds = []) {
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

    // Categories — always use numeric ID (required by WooCommerce REST API)
    if (categoryIds && categoryIds.length > 0) {
      payload.categories = categoryIds.map(id => ({ id }));
    } else if (product.category && product.category.length > 0) {
      // Fallback: send name only (WooCommerce may accept this for existing categories
      // but it is unreliable — this branch only runs if resolveCategoryId failed)
      // but it is unreliable — this branch only runs if resolveCategoryId failed)
      logger.warn(`[WooCommerce] Could not resolve IDs for categories — sending name as fallback.`);
      const cats = Array.isArray(product.category) ? product.category : [product.category];
      payload.categories = cats.map(name => ({ name }));
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
      existing = this.parseResponseData(res.data);
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

      // Resolve category names → WooCommerce category IDs before building payload
      let categoryIds = [];
      const cats = Array.isArray(product.category) ? product.category : (product.category ? [product.category] : []);
      for (const catVal of cats) {
        if (typeof catVal === 'string' && catVal.includes('|')) {
          categoryIds.push(Number(catVal.split('|')[0]));
        } else if (!isNaN(catVal) && Number.isInteger(Number(catVal))) {
          categoryIds.push(Number(catVal));
        } else {
          const id = await this.resolveCategoryId(client, catVal);
          if (id) categoryIds.push(id);
        }
      }

      // Don't create if already exists (check by SKU)
      const existingId = await this.findWooProductId(client, product.sku);
      if (existingId) {
        logger.info(`[${this.name}] SKU ${product.sku} already exists on WooCommerce (ID: ${existingId}), updating instead.`);
        const payload = this.buildWooPayload(product, categoryIds);
        await client.put(`products/${existingId}`, payload);
        // Sync variations if variable product
        if (product.variants?.length > 0) {
          await this.syncVariations(client, existingId, product.variants);
        }
        return { success: true, wooProductId: existingId, action: 'updated' };
      }

      const payload = this.buildWooPayload(product, categoryIds);
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

      // Resolve category names → WooCommerce category IDs before building payload
      let categoryIds = [];
      const cats = Array.isArray(product.category) ? product.category : (product.category ? [product.category] : []);
      for (const catVal of cats) {
        if (typeof catVal === 'string' && catVal.includes('|')) {
          categoryIds.push(Number(catVal.split('|')[0]));
        } else if (!isNaN(catVal) && Number.isInteger(Number(catVal))) {
          categoryIds.push(Number(catVal));
        } else {
          const id = await this.resolveCategoryId(client, catVal);
          if (id) categoryIds.push(id);
        }
      }

      const overrideId = wooProductId && !isNaN(Number(wooProductId)) ? wooProductId : null;
      const prodWithOverride = overrideId
        ? { ...product, platformIds: { ...product.platformIds, fifozone: { productId: overrideId } } }
        : product;

      const wooId = await this.resolveWooId(client, prodWithOverride);

      if (!wooId) {
        logger.info(`[${this.name}] Product not found on WooCommerce, creating new.`);
        return this.createProduct(product);
      }

      const payload = this.buildWooPayload(product, categoryIds);
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
      // Fetch actual placed orders and drafts
      const response = await client.get('orders', { 
        status: ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'checkout-draft'], 
        per_page: 100 
      });
      
      const parsedOrders = this.parseResponseData(response.data);
      
      const orders = parsedOrders.map(order => ({
        platformOrderId: String(order.id),
        number: order.number,
        platformStatus: order.status,
        orderDate: order.date_created,
        customer: {
          name: `${order.billing.first_name || ''} ${order.billing.last_name || ''}`.trim() || 'Unknown Customer',
          email: order.billing.email || '',
          phone: order.billing.phone || ''
        },
        shippingAddress: {
          line1: order.shipping.address_1 || order.billing.address_1 || 'N/A',
          line2: order.shipping.address_2 || order.billing.address_2 || '',
          city: order.shipping.city || order.billing.city || 'Unknown',
          state: order.shipping.state || order.billing.state || 'XX',
          pincode: order.shipping.postcode || order.billing.postcode || '000000'
        },
        items: order.line_items.map(item => ({
          sku: item.sku || '',
          name: decodeHtml(item.name) || 'Unknown Product',
          platformProductId: String(item.product_id || ''),
          quantity: item.quantity,
          unitPrice: parseFloat(item.price)
        })),
        subtotal: parseFloat(order.total) - parseFloat(order.shipping_total),
        shippingCharge: parseFloat(order.shipping_total),
        totalAmount: parseFloat(order.total),
        paymentMethod: order.payment_method === 'cod' ? 'cod' : (order.payment_method_title || order.payment_method || 'Prepaid'),
        paymentStatus: (order.payment_method === 'cod' && !['completed', 'delivered'].includes(order.status)) ? 'pending' : 'paid'
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
