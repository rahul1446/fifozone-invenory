const axios = require('axios');
const logger = require('../utils/logger');

const decodeHtml = (str) => {
  if (!str) return '';
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

  decoded = decoded.replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');
  return decoded.replace(/<[^>]*>?/gm, '').replace(/\n\s*\n/g, '\n\n').trim();
};

class FifozoneOmsService {
  constructor() {
    this.name = 'Fifozone OMS';
    this.baseURL = process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1';
    this.apiKey = process.env.FIFOZONE_OMS_API_KEY || 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
  }

  getClient() {
    const baseURL = (process.env.FIFOZONE_OMS_BASE_URL || this.baseURL).replace(/\/+$/, '');
    const apiKey = process.env.FIFOZONE_OMS_API_KEY || this.apiKey;

    return axios.create({
      baseURL,
      headers: {
        'X-OMS-Key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  // ─── Format categories into string array for OMS API ────────────────────────
  formatCategories(categories, subCategory) {
    const list = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    const cleanCats = [];

    list.forEach(c => {
      if (!c) return;
      if (typeof c === 'string' && c.includes('|')) {
        const name = c.split('|')[1].trim();
        if (name && !cleanCats.includes(name)) cleanCats.push(name);
      } else {
        const name = String(c).trim();
        if (name && !cleanCats.includes(name)) cleanCats.push(name);
      }
    });

    if (subCategory && typeof subCategory === 'string' && subCategory.trim()) {
      const sub = subCategory.trim();
      if (!cleanCats.includes(sub)) cleanCats.push(sub);
    }

    return cleanCats;
  }

  // ─── Format image URLs into array ───────────────────────────────────────────
  formatImages(images) {
    if (!images || !Array.isArray(images)) return [];
    return images
      .map(img => (typeof img === 'string' ? img : img.url))
      .filter(url => {
        if (!url || typeof url !== 'string') return false;
        const u = url.toLowerCase();
        if (u.includes('example.com') || u.includes('localhost') || u.includes('127.0.0.1') || u.includes('placeholder')) {
          return false;
        }
        return u.startsWith('http://') || u.startsWith('https://');
      });
  }

  // ─── Build OMS API payload from internal Product model ──────────────────────
  buildOmsPayload(product) {
    const stockQty = (product.stockByPlatform?.fifozone > 0)
      ? product.stockByPlatform.fifozone
      : (product.totalStock ?? 0);

    const price = (product.sellingPrice?.fifozone > 0)
      ? product.sellingPrice.fifozone
      : (product.mrp > 0 ? product.mrp : 0);

    const categories = this.formatCategories(product.category, product.subCategory);
    const images = this.formatImages(product.images);

    const payload = {
      name: product.masterName || 'Unnamed Product',
      sku: product.sku || '',
      regular_price: price > 0 ? String(price) : '0',
      stock_quantity: stockQty,
      stock_status: stockQty > 0 ? 'instock' : 'outofstock',
      status: product.isActive ? 'publish' : 'draft',
      tax_status: 'taxable',
      tax_class: '',
      brand: product.brand || 'Generic',
      categories,
      tags: Array.isArray(product.tags) ? product.tags : [],
      description: product.description || '',
      short_description: product.shortDescription || '',
    };

    if (product.hsnCode || product.hsn_code) {
      payload.hsn_code = String(product.hsnCode || product.hsn_code);
    }

    if (product.gstPercent !== undefined && product.gstPercent !== null) {
      payload.gst_rate = String(product.gstPercent);
    } else if (product.gst_rate) {
      payload.gst_rate = String(product.gst_rate);
    }

    if (images.length > 0) {
      payload.images = images;
    }

    if (product.weight) {
      const weightVal = typeof product.weight === 'object' ? product.weight.value : product.weight;
      if (weightVal !== undefined && weightVal !== null && weightVal !== '') {
        payload.weight = String(weightVal);
      }
    }

    if (product.barcode) {
      payload.meta_data = {
        barcode_ean: String(product.barcode)
      };
    }

    return payload;
  }

  // ─── 1. LOAD / PULL PRODUCTS (High-speed bulk catalog pull) ─────────────────
  async pullProducts(options = {}) {
    logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
    const client = this.getClient();
    const allProducts = [];
    let page = 1;
    const limit = options.limit || 500; // 500 items per batch (high speed, safe payload)

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS products page ${page} (limit=${limit})...`);
        const params = {
          page,
          limit,
          status: 'publish',
          ...options
        };

        const res = await client.get('/products', { params });
        const resData = res.data;
        const batch = resData?.data || [];

        if (!batch || batch.length === 0) {
          logger.info(`[${this.name}] Page ${page} returned 0 products — stopping pagination.`);
          break;
        }

        const mapped = batch.map(prod => {
          // Normalize images
          const imageList = [];
          if (prod.image) imageList.push(prod.image);
          if (Array.isArray(prod.gallery_images)) {
            prod.gallery_images.forEach(img => {
              if (img && !imageList.includes(img)) imageList.push(img);
            });
          }
          if (Array.isArray(prod.images)) {
            prod.images.forEach(img => {
              const url = typeof img === 'string' ? img : img?.url || img?.src;
              if (url && !imageList.includes(url)) imageList.push(url);
            });
          }

          // Normalize brand & category
          const brand = Array.isArray(prod.brands) && prod.brands.length > 0
            ? (typeof prod.brands[0] === 'string' ? prod.brands[0] : prod.brands[0]?.name)
            : (prod.brand || 'Generic');

          const category = Array.isArray(prod.categories) && prod.categories.length > 0
            ? (typeof prod.categories[0] === 'string' ? prod.categories[0] : prod.categories[0]?.name)
            : (prod.category || 'Uncategorized');

          return {
            platformProductId: String(prod.id),
            masterName: decodeHtml(prod.name),
            sku: prod.sku || `WC-${prod.id}`,
            barcode: prod.meta_data?.barcode_ean || '',
            brand: brand || 'Generic',
            category: category || 'Uncategorized',
            price: parseFloat(prod.price || prod.regular_price || 0),
            mrp: parseFloat(prod.regular_price || prod.price || 0),
            stock: prod.stock_quantity ?? 0,
            slug: prod.slug || '',
            url: prod.url || '',
            images: imageList,
            shortDescription: decodeHtml(prod.short_description || ''),
            description: decodeHtml(prod.description || ''),
            weight: prod.weight ? parseFloat(prod.weight) : undefined,
            hsn_code: prod.hsn_code || '',
            gst_rate: prod.gst_rate || ''
          };
        });

        allProducts.push(...mapped);
        logger.info(`[${this.name}] Page ${page}: received ${batch.length} products (total so far: ${allProducts.length}/${resData.total || '?'})`);

        const totalPages = resData.total_pages ? parseInt(resData.total_pages, 10) : 1;
        if (options.maxPages && page >= options.maxPages) {
          logger.info(`[${this.name}] Reached maxPages limit (${options.maxPages}) — stopping.`);
          break;
        }
        if (page >= totalPages || batch.length < limit) {
          break;
        }

        page++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allProducts.length} total products via OMS API.`);
      return allProducts;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] pullProducts error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullProducts failed: ${errMsg}`);
    }
  }

  // ─── 2. CREATE PRODUCT (Single or Bulk) ────────────────────────────────────
  async createProduct(product) {
    logger.info(`[${this.name}] Creating product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = this.buildOmsPayload(product);
      const res = await client.post('/products/create', payload);
      const data = res.data;

      const firstResult = data.results?.[0];
      const wooProductId = firstResult?.id || data.id;

      if (!wooProductId) {
        if (firstResult?.status === 'error') {
          // If SKU already exists, attempt update fallback
          logger.warn(`[${this.name}] Create returned error: ${firstResult.message || firstResult.error}. Attempting update...`);
          return await this.updateProduct(product);
        }
      }

      logger.info(`[${this.name}] Created product successfully. ID: ${wooProductId}`);
      return { success: true, wooProductId, action: 'created' };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] createProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS createProduct failed: ${errMsg}`);
    }
  }

  async createProductsBatch(productsList) {
    logger.info(`[${this.name}] Batch creating ${productsList.length} products via OMS API...`);
    const client = this.getClient();

    try {
      const payloads = productsList.map(p => this.buildOmsPayload(p));
      const res = await client.post('/products/create', payloads);
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] createProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS createProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 3. UPDATE PRODUCT (Single or Bulk) ────────────────────────────────────
  async updateProduct(product, wooProductId) {
    logger.info(`[${this.name}] Updating product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = this.buildOmsPayload(product);

      // Add identifier
      const targetId = wooProductId || product.platformIds?.fifozone?.productId;
      if (targetId && !isNaN(Number(targetId)) && Number(targetId) > 0) {
        payload.id = Number(targetId);
      } else if (product.sku) {
        payload.sku = product.sku;
      }

      const res = await client.post('/products/update', payload);
      const data = res.data;
      const firstResult = data.results?.[0];
      const resolvedId = firstResult?.id || payload.id;

      logger.info(`[${this.name}] Updated product successfully (ID: ${resolvedId})`);
      return { success: true, wooProductId: resolvedId, action: 'updated' };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] updateProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS updateProduct failed: ${errMsg}`);
    }
  }

  async updateProductsBatch(updatesList) {
    logger.info(`[${this.name}] Batch updating ${updatesList.length} items via OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.post('/products/update', updatesList);
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] updateProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS updateProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 4. PUSH STOCK (Ultra-fast partial update) ──────────────────────────────
  async pushStock(sku, quantity) {
    logger.info(`[${this.name}] Pushing stock for SKU: ${sku} -> Qty: ${quantity}`);
    const client = this.getClient();

    try {
      const payload = {
        sku,
        stock_quantity: parseInt(quantity, 10) || 0,
        stock_status: (parseInt(quantity, 10) || 0) > 0 ? 'instock' : 'outofstock'
      };

      const res = await client.post('/products/update', payload);
      return { success: true, sku, quantity, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] pushStock error for SKU ${sku}: ${errMsg}`);
      throw new Error(`Fifozone OMS pushStock failed: ${errMsg}`);
    }
  }

  // ─── 5. PUSH PRICE (Ultra-fast partial update) ──────────────────────────────
  async pushPrice(sku, price) {
    logger.info(`[${this.name}] Pushing price for SKU: ${sku} -> INR ${price}`);
    const client = this.getClient();

    try {
      const payload = {
        sku,
        regular_price: String(price)
      };

      const res = await client.post('/products/update', payload);
      return { success: true, sku, price, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] pushPrice error for SKU ${sku}: ${errMsg}`);
      throw new Error(`Fifozone OMS pushPrice failed: ${errMsg}`);
    }
  }

  // ─── 6. DELETE PRODUCT (Single or Mass) ────────────────────────────────────
  async deleteProduct(product, force = true) {
    logger.info(`[${this.name}] Deleting product via OMS API: "${product.masterName}"`);
    const client = this.getClient();

    try {
      const payload = { force: force !== false };
      const wooId = product.platformIds?.fifozone?.productId;
      if (wooId && !isNaN(Number(wooId)) && Number(wooId) > 0) {
        payload.id = Number(wooId);
      }
      if (product.sku) {
        payload.sku = product.sku;
      }

      const res = await client.post('/products/delete', payload);
      const data = res.data;
      const firstResult = data.results?.[0];

      logger.info(`[${this.name}] Product deleted successfully: ${firstResult?.name || product.masterName}`);
      return { success: true, wooProductId: firstResult?.id || wooId, action: 'deleted' };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] deleteProduct error for "${product.masterName}": ${errMsg}`);
      throw new Error(`Fifozone OMS deleteProduct failed: ${errMsg}`);
    }
  }

  async deleteProductsBatch(items, force = true) {
    logger.info(`[${this.name}] Batch deleting ${items.length} items via OMS API...`);
    const client = this.getClient();

    try {
      const payload = items.map(item => ({
        ...(item.id ? { id: item.id } : {}),
        ...(item.sku ? { sku: item.sku } : {}),
        force: force !== false
      }));

      const res = await client.post('/products/delete', payload);
      return res.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      logger.error(`[${this.name}] deleteProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS deleteProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 7. TEST CONNECTION ─────────────────────────────────────────────────────
  async testConnection() {
    const client = this.getClient();
    const res = await client.get('/products', { params: { limit: 1 } });
    return {
      success: true,
      productCount: res.data?.total || res.data?.count || 0
    };
  }
}

module.exports = new FifozoneOmsService();
