const axios = require('axios');
const logger = require('../utils/logger');

// ─── Custom Normalized Error Class ───────────────────────────────────────────
class FifozoneOmsError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'FifozoneOmsError';
    this.statusCode = options.statusCode || null;
    this.code = options.code || 'OMS_ERROR';
    this.details = options.details || null;
    this.requestId = options.requestId || null;
  }
}

// ─── HTML Decoder Utility ─────────────────────────────────────────────────────
const decodeHtml = (str) => {
  if (!str) return '';

  // 1. Convert block and break elements to newlines for human readability
  let clean = String(str).replace(/<\/?(p|div|br|h1|h2|h3|h4|h5|h6|li|ul|ol)[^>]*>/gi, '\n');

  // 2. Strip remaining genuine HTML markup tags BEFORE entity decoding.
  // This guarantees bracketed text encoded as &lt;...&gt; (&lt;Special Edition&gt;, &lt;10kg&gt;)
  // is NOT destroyed by the tag stripper.
  clean = clean.replace(/<[^>]*>?/gm, '');

  // 3. Decode HTML entities into literal characters
  clean = clean
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '--')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8230;/g, '...')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&');

  // 4. Collapse consecutive whitespace newlines and trim
  return clean.replace(/\n\s*\n/g, '\n\n').trim();
};

class FifozoneOmsService {
  constructor() {
    this.name = 'Fifozone OMS';
    this.baseURL = process.env.FIFOZONE_OMS_BASE_URL || 'https://fifozone.com/wp-json/oms/v1';
    this.apiKey = process.env.FIFOZONE_OMS_API_KEY || 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
    this.timeout = 60000;
    this.maxRetries = 3;
    this.initialRetryDelay = 500;
    this.maxRetryDelay = 4000;

    // In-memory category resolution cache
    this._categoryCache = new Map();
    this._categoryCacheTimestamp = 0;
    this._categoryCacheTTL = 60 * 60 * 1000; // 1 hour TTL
    this._categoryTreeCache = null;          // Memoized Ant Design Tree

    // In-memory brands cache
    this._brandsCache = null;
    this._brandsCacheExpiry = 0;
    this._brandsCacheTTL = 10 * 60 * 1000;   // 10 minutes TTL

    // Cached primary Axios client instance
    this._client = null;
    this._clientConfigHash = '';
  }

  // ─── Unified Error Message Extractor ─────────────────────────────────────────
  _extractErrorMessage(error) {
    if (!error) return 'Unknown Fifozone OMS API Error';
    if (typeof error === 'string') return error;

    const candidate = error.response?.data?.message ||
      error.response?.data?.results?.[0]?.message ||
      error.response?.data?.error ||
      error.data?.message ||
      error.message;

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === 'object') {
      try {
        return JSON.stringify(candidate);
      } catch (_) {}
    }

    return 'Unknown Fifozone OMS API Error';
  }

  // ─── Factory: Build Axios Client with Resilient Interceptors ─────────────────
  createClientInstance(config = {}) {
    const baseURL = (config.baseURL || process.env.FIFOZONE_OMS_BASE_URL || this.baseURL).replace(/\/+$/, '');
    const apiKey = config.apiKey || process.env.FIFOZONE_OMS_API_KEY || this.apiKey;
    const timeout = config.timeout || this.timeout;
    const maxRetries = config.maxRetries !== undefined ? config.maxRetries : this.maxRetries;
    const initialDelay = config.initialRetryDelay || this.initialRetryDelay;
    const maxDelay = config.maxRetryDelay || this.maxRetryDelay;

    const instance = axios.create({
      baseURL,
      headers: {
        'X-OMS-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout
    });

    // Request Interceptor: Tracing, Latency Timer, and Auth Header Guarantee
    instance.interceptors.request.use(
      (reqConfig) => {
        reqConfig.metadata = {
          startTime: Date.now(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        };

        if (!reqConfig.headers['X-OMS-Key'] && apiKey) {
          reqConfig.headers['X-OMS-Key'] = apiKey;
        }

        // Safety Barrier (Requirement R3): Guard against mutating operations hitting live production store during testing
        if (process.env.NODE_ENV === 'test' && !process.env.ALLOW_LIVE_OMS_WRITES) {
          const method = (reqConfig.method || 'get').toLowerCase();
          if (['post', 'put', 'patch', 'delete'].includes(method)) {
            const err = new Error(
              `[SAFETY GUARD] Blocked live ${method.toUpperCase()} request to ${reqConfig.url} in test environment. Write operations must be mocked.`
            );
            logger.error(`[${this.name}] ${err.message}`);
            return Promise.reject(err);
          }
        }

        logger.debug(`[${this.name}] [${reqConfig.metadata.requestId}] --> ${reqConfig.method.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Latency Logging and Resilient Error Handling
    instance.interceptors.response.use(
      (response) => {
        const duration = response.config.metadata ? Date.now() - response.config.metadata.startTime : 0;
        logger.debug(`[${this.name}] [${response.config.metadata?.requestId}] <-- ${response.status} ${response.statusText} (${duration}ms)`);
        return response;
      },
      async (error) => {
        const reqConfig = error.config;
        if (!reqConfig) return Promise.reject(error);

        const status = error.response?.status;
        const requestId = reqConfig.metadata?.requestId || 'unknown';

        // 1. Credential Fallback on 401 Unauthorized (?oms_key= query param)
        if (status === 401 && !reqConfig._authFallbackTried && apiKey) {
          reqConfig._authFallbackTried = true;
          logger.warn(`[${this.name}] [${requestId}] 401 Unauthorized on header auth. Retrying with query param ?oms_key=...`);
          reqConfig.params = { ...(reqConfig.params || {}), oms_key: apiKey };
          return instance(reqConfig);
        }

        // 2. Rate Limit (429) & Transient Server Error (5xx / Network) Retry
        const isNetworkError = !error.response && (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND' ||
          Boolean(error.message && error.message.toLowerCase().includes('timeout'))
        );
        const isServerError = status >= 500 && status <= 599;
        const isRateLimited = status === 429;

        if ((isNetworkError || isServerError || isRateLimited) && (reqConfig._retryCount || 0) < maxRetries) {
          reqConfig._retryCount = (reqConfig._retryCount || 0) + 1;

          let delay = Math.min(initialDelay * Math.pow(2, reqConfig._retryCount - 1), maxDelay);
          // Add up to 20% randomized jitter
          delay += Math.floor(Math.random() * (delay * 0.2));

          if (isRateLimited) {
            const retryAfter = error.response?.headers?.['retry-after'];
            if (retryAfter) {
              const seconds = parseInt(retryAfter, 10);
              if (!isNaN(seconds) && seconds > 0) delay = seconds * 1000;
            }
          }

          logger.warn(`[${this.name}] [${requestId}] Transient error (${status || error.code || 'NETWORK_ERR'}). Retrying in ${Math.round(delay)}ms (attempt ${reqConfig._retryCount}/${maxRetries})...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return instance(reqConfig);
        }

        // 3. Normalize Final Error to FifozoneOmsError
        const errMsg = this._extractErrorMessage(error);

        const normalizedError = new FifozoneOmsError(errMsg, {
          statusCode: status,
          code: error.response?.data?.code || error.code || 'OMS_ERROR',
          details: error.response?.data || null,
          requestId
        });

        logger.error(`[${this.name}] [${requestId}] Request failed: ${normalizedError.message} (status: ${status || 'NONE'})`);
        return Promise.reject(normalizedError);
      }
    );

    return instance;
  }

  // ─── Get Configured Client (Cached Singleton or Custom Credentials) ──────────
  getClient(options = {}) {
    const baseURL = (options.baseURL || process.env.FIFOZONE_OMS_BASE_URL || this.baseURL).replace(/\/+$/, '');
    const apiKey = options.apiKey || process.env.FIFOZONE_OMS_API_KEY || this.apiKey;
    const timeout = options.timeout || this.timeout;

    const isDefault = (!options.baseURL || options.baseURL === this.baseURL) &&
                      (!options.apiKey || options.apiKey === this.apiKey) &&
                      (!options.timeout || options.timeout === this.timeout);

    const configHash = `${baseURL}|${apiKey}|${timeout}`;
    if (isDefault && this._client && this._clientConfigHash === configHash) {
      return this._client;
    }

    const client = this.createClientInstance({ baseURL, apiKey, timeout });
    if (isDefault) {
      this._client = client;
      this._clientConfigHash = configHash;
    }

    return client;
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
      .map(img => (typeof img === 'string' ? img : img?.url || img?.src))
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
    const opts = { ...options };
    const singlePageMode = opts.page !== undefined;
    logger.info(`[${this.name}] Pulling products from custom high-speed OMS API...`);
    const client = this.getClient();
    const allProducts = [];
    let currentPage = singlePageMode ? parseInt(opts.page, 10) : 1;
    const limit = opts.limit || 500; // 500 items per batch (high speed, safe payload)

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS products page ${currentPage} (limit=${limit})...`);
        const params = {
          status: 'publish',
          ...opts,
          page: currentPage,
          limit
        };

        const res = await client.get('/products', { params });
        const resData = res.data;
        const batch = resData?.data || [];

        if (!batch || batch.length === 0) {
          logger.info(`[${this.name}] Page ${currentPage} returned 0 products — stopping pagination.`);
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

          const manageStock = Boolean(prod.manage_stock);
          const stockStatus = prod.stock_status || (prod.stock_quantity > 0 ? 'instock' : 'outofstock');
          let stockQty = (prod.stock_quantity !== null && prod.stock_quantity !== undefined && prod.stock_quantity > 0)
            ? prod.stock_quantity
            : (stockStatus === 'instock' ? 50 : 0);

          // Normalize variants from OMS variations array
          const rawVariations = Array.isArray(prod.variations) ? prod.variations : [];
          const variants = rawVariations.map((v, vIdx) => {
            let attrName = 'Option';
            let attrValue = v.title || `Variant ${vIdx + 1}`;
            if (v.attributes && typeof v.attributes === 'object') {
              const entries = Object.entries(v.attributes);
              if (entries.length > 0) {
                attrName = entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1);
                attrValue = entries[0][1];
              }
            } else if (Array.isArray(prod.attributes) && prod.attributes.length > 0) {
              const mainAttr = prod.attributes[0];
              attrName = mainAttr.name || 'Option';
            }

            const varPrice = parseFloat(v.price || v.regular_price || prod.price || 0);
            const varStock = (v.stock_quantity !== null && v.stock_quantity !== undefined && v.stock_quantity > 0)
              ? v.stock_quantity
              : (v.stock_status === 'instock' ? (stockQty || 50) : 0);

            return {
              name: attrName,
              value: String(attrValue || '').trim(),
              sku: v.sku || `${prod.sku || `WC-${prod.id}`}-V${vIdx + 1}`,
              price: {
                fifozone: varPrice,
                amazon: varPrice,
                flipkart: varPrice,
                meesho: varPrice
              },
              stock: varStock,
              isActive: v.stock_status !== 'outofstock',
              platformVariationId: String(v.id || '')
            };
          });

          // Infer animalType
          const textToScan = `${prod.name || ''} ${category || ''} ${brand || ''}`.toLowerCase();
          const animalType = [];
          if (textToScan.includes('cat') || textToScan.includes('kitten')) animalType.push('cat');
          if (textToScan.includes('dog') || textToScan.includes('puppy')) animalType.push('dog');
          if (textToScan.includes('bird')) animalType.push('bird');
          if (textToScan.includes('fish') || textToScan.includes('aquarium')) animalType.push('fish');
          if (textToScan.includes('rabbit')) animalType.push('rabbit');
          if (animalType.length === 0) animalType.push('other');

          // Fallback short description if blank
          let shortDesc = decodeHtml(prod.short_description || '');
          const fullDesc = decodeHtml(prod.description || '');
          if (!shortDesc && fullDesc) {
            const firstPara = fullDesc.split('\n')[0].trim();
            shortDesc = firstPara.length > 200 ? firstPara.slice(0, 197) + '...' : firstPara;
          }

          return {
            platformProductId: String(prod.id),
            masterName: decodeHtml(prod.name),
            sku: prod.sku || `WC-${prod.id}`,
            barcode: prod.meta_data?.barcode_ean || '',
            brand: brand || 'Generic',
            category: category || 'Uncategorized',
            animalType,
            price: parseFloat(prod.price || prod.regular_price || 0),
            mrp: parseFloat(prod.regular_price || prod.price || 0),
            stock: stockQty,
            stockStatus,
            manageStock,
            slug: prod.slug || '',
            url: prod.url || '',
            images: imageList,
            shortDescription: shortDesc,
            description: fullDesc,
            variants,
            hasVariants: variants.length > 0,
            type: prod.type || (variants.length > 0 ? 'variable' : 'simple'),
            attributes: Array.isArray(prod.attributes) ? prod.attributes : [],
            weight: prod.weight ? parseFloat(prod.weight) : undefined,
            hsn_code: prod.hsn_code || '',
            gst_rate: prod.gst_rate || ''
          };
        });

        allProducts.push(...mapped);
        logger.info(`[${this.name}] Page ${currentPage}: received ${batch.length} products (total so far: ${allProducts.length}/${resData.total || '?'})`);

        if (singlePageMode) {
          break;
        }

        const totalPages = resData.total_pages ? parseInt(resData.total_pages, 10) : 1;
        if (opts.maxPages && currentPage >= opts.maxPages) {
          logger.info(`[${this.name}] Reached maxPages limit (${opts.maxPages}) — stopping.`);
          break;
        }
        if (currentPage >= totalPages || batch.length < limit) {
          break;
        }

        currentPage++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allProducts.length} total products via OMS API.`);
      return allProducts;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] pullProducts error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullProducts failed: ${errMsg}`);
    }
  }

  // ─── Single Product Lookup by ID ────────────────────────────────────────────
  async getProductById(productId) {
    if (!productId) throw new Error('Fifozone OMS getProductById: productId is required.');
    const client = this.getClient();
    try {
      const res = await client.get('/products', { params: { search: String(productId), limit: 10 } });
      const batch = res.data?.data || [];
      const match = batch.find(p => String(p.id) === String(productId));
      return match || null;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getProductById error for #${productId}: ${errMsg}`);
      throw new Error(`Fifozone OMS getProductById failed: ${errMsg}`);
    }
  }

  // ─── Single Product Lookup by SKU ───────────────────────────────────────────
  async getProductBySku(sku) {
    if (!sku) throw new Error('Fifozone OMS getProductBySku: sku is required.');
    const client = this.getClient();
    try {
      const res = await client.get('/products', { params: { search: String(sku), limit: 10 } });
      const batch = res.data?.data || [];
      const match = batch.find(p => String(p.sku).toLowerCase() === String(sku).toLowerCase());
      return match || null;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getProductBySku error for SKU ${sku}: ${errMsg}`);
      throw new Error(`Fifozone OMS getProductBySku failed: ${errMsg}`);
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
      const errMsg = this._extractErrorMessage(error);
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
      const errMsg = this._extractErrorMessage(error);
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
      const firstResult = data?.results?.[0];

      // Validate OMS response for errors
      if (!data || data.status === 'error' || data.total_failed > 0 || firstResult?.status === 'error') {
        const failureReason = firstResult?.message || firstResult?.error || data?.message || 'Update rejected by OMS';
        logger.error(`[${this.name}] updateProduct rejected for "${product.masterName}": ${failureReason}`);
        throw new Error(failureReason);
      }

      const resolvedId = firstResult?.id || payload.id;
      if (!resolvedId) {
        throw new Error('Update completed but no product ID returned by OMS');
      }

      logger.info(`[${this.name}] Updated product successfully (ID: ${resolvedId})`);
      return { success: true, wooProductId: resolvedId, action: 'updated' };
    } catch (error) {
      const rawMsg = this._extractErrorMessage(error);
      const prefix = 'Fifozone OMS updateProduct failed: ';
      const errMsg = rawMsg.startsWith(prefix) ? rawMsg.slice(prefix.length) : rawMsg;
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
      const errMsg = this._extractErrorMessage(error);
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
      if (!res.data || res.data.status === 'error' || res.data.total_failed > 0 || res.data.results?.[0]?.status === 'error') {
        const failureReason = res.data?.results?.[0]?.message || res.data?.message || 'Stock push rejected by OMS';
        throw new Error(failureReason);
      }
      return { success: true, sku, quantity, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
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
      if (!res.data || res.data.status === 'error' || res.data.total_failed > 0 || res.data.results?.[0]?.status === 'error') {
        const failureReason = res.data?.results?.[0]?.message || res.data?.message || 'Price push rejected by OMS';
        throw new Error(failureReason);
      }
      return { success: true, sku, price, platform: 'fifozone', data: res.data };
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
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
      const firstResult = data?.results?.[0];

      // Validate OMS response for errors
      if (!data || data.status === 'error' || data.total_failed > 0 || firstResult?.status === 'error') {
        const failureReason = firstResult?.message || firstResult?.error || data?.message || 'Delete rejected by OMS';
        logger.error(`[${this.name}] deleteProduct rejected for "${product.masterName}": ${failureReason}`);
        throw new Error(failureReason);
      }

      const resolvedId = firstResult?.id || wooId;
      logger.info(`[${this.name}] Product deleted successfully: ${firstResult?.name || product.masterName} (ID: ${resolvedId})`);
      return { success: true, wooProductId: resolvedId, action: 'deleted' };
    } catch (error) {
      const rawMsg = this._extractErrorMessage(error);
      const prefix = 'Fifozone OMS deleteProduct failed: ';
      const errMsg = rawMsg.startsWith(prefix) ? rawMsg.slice(prefix.length) : rawMsg;
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
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] deleteProductsBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS deleteProductsBatch failed: ${errMsg}`);
    }
  }

  // ─── 7. NORMALIZE OMS ORDER (Transform HPOS to Dashboard Order Schema) ──────
  normalizeOmsOrder(order) {
    if (!order || typeof order !== 'object') return null;

    const billing = order.billing || {};
    const shipping = order.shipping || {};

    // Customer Name resolution with robust multi-field fallbacks & HTML decoding
    const rawCustomerName = billing.full_name ||
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      shipping.full_name ||
      `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim() ||
      'Unknown Customer';
    const customerName = decodeHtml(rawCustomerName);

    // Address resolution satisfying Order model required fields
    const shippingAddress = {
      line1: shipping.address_1 || billing.address_1 || 'N/A',
      line2: shipping.address_2 || billing.address_2 || '',
      city: shipping.city || billing.city || 'Unknown',
      state: shipping.state || billing.state || 'XX',
      pincode: shipping.postcode || billing.postcode || '000000',
      country: shipping.country || billing.country || 'India'
    };

    const billingAddress = {
      line1: billing.address_1 || '',
      line2: billing.address_2 || '',
      city: billing.city || '',
      state: billing.state || '',
      pincode: billing.postcode || '',
      country: billing.country || 'India'
    };

    // Items mapping: filter out null/non-object elements and preserve quantity: 0
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const items = rawItems
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const parsedQty = parseInt(item.quantity, 10);
        const qty = isNaN(parsedQty) ? 1 : Math.max(0, parsedQty);
        const total = parseFloat(item.total || 0);
        const subtotal = parseFloat(item.subtotal || total);
        const unitPrice = qty > 0 ? parseFloat((total / qty).toFixed(2)) : total;
        const platformProductId = String(
          (item.variation_id && Number(item.variation_id) > 0)
            ? item.variation_id
            : (item.product_id || '')
        );

        return {
          sku: item.sku || '',
          name: decodeHtml(item.name || 'Unknown Product'),
          platformProductId,
          productId: String(item.product_id || ''),
          variationId: String(item.variation_id || ''),
          itemId: String(item.item_id || ''),
          quantity: qty,
          unitPrice,
          total,
          subtotal
        };
      });

    // Financials
    const totalAmount = parseFloat(order.total || 0);
    const shippingCharge = parseFloat(order.shipping_lines?.cost || order.shipping_total || 0);
    const subtotal = Math.max(0, parseFloat((totalAmount - shippingCharge).toFixed(2)));
    const gstAmount = parseFloat(order.tax || 0);

    // Payment details
    const paymentMethod = order.payment_method === 'cod'
      ? 'cod'
      : (order.payment_method_title || order.payment_method || 'Prepaid');

    const paymentStatus = (order.payment_method === 'cod' && !['completed', 'delivered'].includes(order.status))
      ? 'pending'
      : 'paid';

    return {
      platformOrderId: String(order.id),
      number: String(order.number || order.id),
      platformStatus: String(order.status || 'pending').toLowerCase(),
      orderDate: order.date_created ? new Date(order.date_created) : new Date(),
      dateModified: order.date_modified ? new Date(order.date_modified) : undefined,
      customer: {
        name: customerName,
        email: order.customer_email || billing.email || '',
        phone: billing.phone || shipping.phone || '',
        alternatePhone: (shipping.phone && shipping.phone !== billing.phone) ? shipping.phone : ''
      },
      shippingAddress,
      billingAddress,
      items,
      subtotal,
      shippingCharge,
      totalAmount,
      gstAmount,
      currency: order.currency || 'INR',
      paymentMethod,
      paymentStatus,
      shippingTracking: {
        trackingNumber: order.shipping_tracking?.tracking_number || '',
        courierPartner: order.shipping_tracking?.carrier || '',
        trackingUrl: order.shipping_tracking?.tracking_url || ''
      },
      raw: order
    };
  }

  // ─── 8. PULL ORDERS (High-speed order ingestion with dual-mode pagination) ───
  async pullOrders(options = {}) {
    const opts = options || {};
    logger.info(`[${this.name}] Pulling orders from Fifozone OMS API...`);
    const client = this.getClient();
    const allOrders = [];

    const isSinglePage = opts.page !== undefined && opts.page !== null && !opts.fetchAll;
    let currentPage = isSinglePage ? parseInt(opts.page, 10) : 1;
    const limit = Math.min(parseInt(opts.limit, 10) || 100, 500);

    try {
      while (true) {
        logger.info(`[${this.name}] Fetching OMS orders page ${currentPage} (limit=${limit})...`);
        const params = {
          page: currentPage,
          limit,
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.search ? { search: opts.search } : {}),
          ...(opts.modified_after ? { modified_after: opts.modified_after } : {})
        };

        const res = await client.get('/orders', { params });
        const resData = res.data;
        const batch = Array.isArray(resData?.data) ? resData.data : [];

        if (batch.length === 0) {
          logger.info(`[${this.name}] Page ${currentPage} returned 0 orders — pagination complete.`);
          break;
        }

        const normalizedBatch = batch
          .map(order => this.normalizeOmsOrder(order))
          .filter(Boolean);

        allOrders.push(...normalizedBatch);
        logger.info(`[${this.name}] Page ${currentPage}: ingested ${batch.length} orders (total: ${allOrders.length}/${resData.total || '?'})`);

        if (isSinglePage) break;

        const totalPages = resData.total_pages ? parseInt(resData.total_pages, 10) : 1;
        if (opts.maxPages && currentPage >= opts.maxPages) {
          logger.info(`[${this.name}] Reached maxPages limit (${opts.maxPages}) — stopping pagination.`);
          break;
        }
        if (currentPage >= totalPages || batch.length < limit) {
          break;
        }

        currentPage++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allOrders.length} total orders via OMS API.`);
      return allOrders;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] pullOrders error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullOrders failed: ${errMsg}`);
    }
  }

  // ─── 9. GET SINGLE ORDER ───────────────────────────────────────────────────
  async getOrder(orderId) {
    if (!orderId) throw new Error('Fifozone OMS getOrder: orderId is required.');
    const client = this.getClient();

    try {
      const res = await client.get('/orders', {
        params: { search: String(orderId), limit: 1 }
      });
      const batch = res.data?.data || [];
      const match = batch.find(o => String(o.id) === String(orderId));
      if (!match) return null;
      return this.normalizeOmsOrder(match);
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getOrder error for #${orderId}: ${errMsg}`);
      throw new Error(`Fifozone OMS getOrder failed: ${errMsg}`);
    }
  }

  // ─── 10. UPDATE ORDER FULFILLMENT & STATUS ──────────────────────────────────
  async updateOrder(orderId, updateData = {}) {
    // Support object-first signature: updateOrder({ id: 189248, status: 'completed' })
    if (typeof orderId === 'object' && orderId !== null) {
      updateData = orderId;
      orderId = updateData.id || updateData.order_id;
    }

    const targetId = Number(orderId || updateData.id || updateData.order_id);
    if (!targetId || isNaN(targetId) || targetId <= 0) {
      throw new Error('Fifozone OMS updateOrder failed: A valid numeric orderId is required.');
    }

    const status = updateData.status;
    const trackingNumber = updateData.tracking_number || updateData.trackingNumber;
    const carrier = updateData.carrier || updateData.courierPartner;
    const trackingUrl = updateData.tracking_url || updateData.trackingUrl;

    if (!status && !trackingNumber && !carrier && !trackingUrl) {
      throw new Error('Fifozone OMS updateOrder failed: At least one update field (status, tracking_number, carrier, or tracking_url) is required.');
    }

    const payload = {
      id: targetId,
      ...(status ? { status } : {}),
      ...(trackingNumber ? { tracking_number: String(trackingNumber) } : {}),
      ...(carrier ? { carrier: String(carrier) } : {}),
      ...(trackingUrl ? { tracking_url: String(trackingUrl) } : {})
    };

    logger.info(`[${this.name}] Updating order #${targetId} (status: ${status || 'unchanged'}, carrier: ${carrier || 'none'})...`);
    const client = this.getClient();

    try {
      const res = await client.post('/orders/update', payload);
      const data = res.data;

      // Check OMS partial_success or per-item error reports
      const firstResult = data?.results?.[0];
      if (!data || data.status === 'error' || data.total_failed > 0 || firstResult?.status === 'error' || data.status === 'partial_success') {
        const errMsg = firstResult?.message || firstResult?.error || data?.message || `Failed to update order #${targetId}`;
        logger.error(`[${this.name}] updateOrder rejected for #${targetId}: ${errMsg}`);
        throw new Error(errMsg);
      }

      logger.info(`[${this.name}] ✅ Order #${targetId} updated successfully.`);
      return {
        success: true,
        orderId: firstResult?.order_id || targetId,
        status: payload.status,
        trackingNumber: payload.tracking_number || null,
        carrier: payload.carrier || null,
        trackingUrl: payload.tracking_url || null,
        raw: data
      };
    } catch (error) {
      const rawMsg = this._extractErrorMessage(error);
      const prefix = 'Fifozone OMS updateOrder failed: ';
      const errMsg = rawMsg.startsWith(prefix) ? rawMsg.slice(prefix.length) : rawMsg;
      logger.error(`[${this.name}] updateOrder error for #${targetId}: ${errMsg}`);
      throw new Error(`Fifozone OMS updateOrder failed: ${errMsg}`);
    }
  }

  // ─── 11. BATCH ORDER UPDATES ───────────────────────────────────────────────
  async updateOrdersBatch(updatesList) {
    if (!Array.isArray(updatesList) || updatesList.length === 0) {
      throw new Error('Fifozone OMS updateOrdersBatch failed: updatesList array is required.');
    }

    const payloads = updatesList.map(item => {
      const targetId = Number(item.id || item.order_id);
      if (!targetId || isNaN(targetId)) {
        throw new Error(`Fifozone OMS updateOrdersBatch: Invalid order ID on item ${JSON.stringify(item)}`);
      }
      return {
        id: targetId,
        ...(item.status ? { status: item.status } : {}),
        ...(item.tracking_number || item.trackingNumber ? { tracking_number: String(item.tracking_number || item.trackingNumber) } : {}),
        ...(item.carrier || item.courierPartner ? { carrier: String(item.carrier || item.courierPartner) } : {}),
        ...(item.tracking_url || item.trackingUrl ? { tracking_url: String(item.tracking_url || item.trackingUrl) } : {})
      };
    });

    logger.info(`[${this.name}] Batch updating ${payloads.length} orders via OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.post('/orders/update', payloads);
      return res.data;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] updateOrdersBatch error: ${errMsg}`);
      throw new Error(`Fifozone OMS updateOrdersBatch failed: ${errMsg}`);
    }
  }

  // ─── Category Cache Warming Helper ──────────────────────────────────────────
  _warmCategoryCache(categoriesFlat = [], categoriesTree = []) {
    if (Array.isArray(categoriesFlat)) {
      categoriesFlat.forEach(cat => {
        if (!cat || !cat.name || !cat.id) return;
        const id = Number(cat.id);
        const nameKey = cat.name.trim().toLowerCase();
        const pId = Number(cat.parent_id || 0);

        this._categoryCache.set(nameKey, id);
        this._categoryCache.set(`${pId}::${nameKey}`, id);

        if (cat.slug) {
          const slugKey = cat.slug.trim().toLowerCase();
          this._categoryCache.set(slugKey, id);
          this._categoryCache.set(`${pId}::${slugKey}`, id);
        }
      });
    }

    if (Array.isArray(categoriesTree) && categoriesTree.length > 0) {
      const walkTree = (nodes, parentId = 0) => {
        nodes.forEach(node => {
          if (!node || !node.name || !node.id) return;
          const id = Number(node.id);
          const nameKey = node.name.trim().toLowerCase();
          const pId = Number(node.parent_id !== undefined ? node.parent_id : parentId);

          this._categoryCache.set(nameKey, id);
          this._categoryCache.set(`${pId}::${nameKey}`, id);

          if (node.slug) {
            const slugKey = node.slug.trim().toLowerCase();
            this._categoryCache.set(slugKey, id);
            this._categoryCache.set(`${pId}::${slugKey}`, id);
          }

          if (Array.isArray(node.subcategories) && node.subcategories.length > 0) {
            walkTree(node.subcategories, id);
          }
        });
      };
      walkTree(categoriesTree);
    }

    this._categoryCacheTimestamp = Date.now();
    logger.debug(`[${this.name}] Category cache warmed with ${this._categoryCache.size} lookup keys.`);
  }

  // ─── Invalidate Category In-Memory Cache ────────────────────────────────────
  clearCategoryCache() {
    this._categoryCache.clear();
    this._categoryTreeCache = null;
    this._categoryCacheTimestamp = 0;
    logger.info(`[${this.name}] Category in-memory cache cleared.`);
  }

  // ─── Fetch Category Tree Formatted for Ant Design TreeSelect ────────────────
  async getCategoryTree(forceRefresh = false) {
    const isCacheFresh = (Date.now() - this._categoryCacheTimestamp) < this._categoryCacheTTL;
    if (!forceRefresh && isCacheFresh && this._categoryTreeCache) {
      return this._categoryTreeCache;
    }

    logger.info(`[${this.name}] Fetching category tree from OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.get('/categories', { params: { format: 'tree' } });
      const rawTree = res.data?.categories_tree || [];

      const transformTreeNode = (node) => {
        const rawId = node.id;
        const rawName = node.name || '';
        const cleanTitle = decodeHtml(rawName);
        const value = `${rawId}|${rawName}`;
        const key = String(rawId);

        const treeNode = {
          title: cleanTitle,
          value,
          key
        };

        if (Array.isArray(node.subcategories) && node.subcategories.length > 0) {
          treeNode.children = node.subcategories.map(transformTreeNode);
        }

        return treeNode;
      };

      const tree = rawTree.map(transformTreeNode);

      // Warm category resolution cache with full tree
      this._warmCategoryCache([], rawTree);
      this._categoryTreeCache = tree;

      logger.info(`[${this.name}] ✅ Retrieved category tree (${tree.length} top-level nodes).`);
      return tree;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getCategoryTree failed: ${errMsg}`);
      throw new Error(`Fifozone OMS getCategoryTree failed: ${errMsg}`);
    }
  }

  // ─── Fetch Categories under Specific Parent ID ──────────────────────────────
  async getCategories(parentId = 0) {
    const pId = parentId !== undefined && parentId !== null ? Number(parentId) : 0;
    logger.info(`[${this.name}] Fetching categories under parent ID: ${pId}...`);
    const client = this.getClient();

    try {
      const res = await client.get('/categories', { params: { parent: pId } });
      const categories = res.data?.categories || [];

      // Warm cache for returned items
      categories.forEach(cat => {
        if (!cat || !cat.name || !cat.id) return;
        const id = Number(cat.id);
        const nameKey = cat.name.trim().toLowerCase();
        this._categoryCache.set(nameKey, id);
        this._categoryCache.set(`${pId}::${nameKey}`, id);
        if (cat.slug) {
          const slugKey = cat.slug.trim().toLowerCase();
          this._categoryCache.set(slugKey, id);
          this._categoryCache.set(`${pId}::${slugKey}`, id);
        }
      });

      return categories;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getCategories failed: ${errMsg}`);
      throw new Error(`Fifozone OMS getCategories failed: ${errMsg}`);
    }
  }

  // ─── Resolve Category Name to Numeric ID with In-Memory Cache ───────────────
  async resolveCategoryId(name, parentId = 0) {
    // Backward compatibility: handle legacy signature (client, name, parentId)
    if (typeof name !== 'string' && typeof parentId === 'string') {
      const actualName = parentId;
      const actualParentId = arguments[2] || 0;
      return await this.resolveCategoryId(actualName, actualParentId);
    }

    if (!name || typeof name !== 'string' || !name.trim()) return null;
    const cleanName = name.trim();

    // Fast check: if name is already formatted as "ID|Name"
    if (cleanName.includes('|')) {
      const parsed = parseInt(cleanName.split('|')[0], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    const pId = Number(parentId || 0);
    const nameKey = cleanName.toLowerCase();
    const qualifiedKey = `${pId}::${nameKey}`;

    // 1. Check in-memory cache if fresh
    const isCacheFresh = (Date.now() - this._categoryCacheTimestamp) < this._categoryCacheTTL;
    if (isCacheFresh) {
      if (this._categoryCache.has(qualifiedKey)) {
        return this._categoryCache.get(qualifiedKey);
      }
      if (pId === 0 && this._categoryCache.has(nameKey)) {
        return this._categoryCache.get(nameKey);
      }
    }

    // 2. Cache miss or expired — fetch full categories to warm cache
    try {
      const client = this.getClient();
      const res = await client.get('/categories');
      this._warmCategoryCache(res.data?.categories_flat, res.data?.categories_tree);

      if (this._categoryCache.has(qualifiedKey)) {
        return this._categoryCache.get(qualifiedKey);
      }
      if (this._categoryCache.has(nameKey)) {
        return this._categoryCache.get(nameKey);
      }

      // 3. Fallback search query for edge case naming
      const searchRes = await client.get('/categories', { params: { search: cleanName } });
      const searchFlat = searchRes.data?.categories_flat || [];
      if (searchFlat.length > 0) {
        const exact = searchFlat.find(c => c.name.trim().toLowerCase() === nameKey && (pId === 0 || Number(c.parent_id) === pId));
        if (exact) {
          this._categoryCache.set(qualifiedKey, exact.id);
          return exact.id;
        }
        const fallback = searchFlat.find(c => c.name.trim().toLowerCase() === nameKey);
        if (fallback) {
          this._categoryCache.set(nameKey, fallback.id);
          return fallback.id;
        }
      }
    } catch (err) {
      logger.warn(`[${this.name}] resolveCategoryId: error querying categories for "${cleanName}": ${this._extractErrorMessage(err)}`);
    }

    return null;
  }

  // ─── Resolve Subcategory under Parent Category ──────────────────────────────
  async resolveSubCategoryId(categoryName, subCategoryName) {
    // Backward compatibility: handle legacy signature (client, categoryName, subCategoryName)
    if (typeof categoryName !== 'string' && typeof subCategoryName === 'string') {
      const actualCatName = subCategoryName;
      const actualSubCatName = arguments[2];
      return await this.resolveSubCategoryId(actualCatName, actualSubCatName);
    }

    // 1. Resolve parent category first
    const categoryId = await this.resolveCategoryId(categoryName, 0);

    // 2. Resolve subcategory under the resolved parent
    let subCategoryId = null;
    if (categoryId && subCategoryName && String(subCategoryName).trim()) {
      subCategoryId = await this.resolveCategoryId(String(subCategoryName).trim(), categoryId);
    }

    // 3. Fallback: if not found under parent, attempt global category lookup
    if (!subCategoryId && subCategoryName && String(subCategoryName).trim()) {
      subCategoryId = await this.resolveCategoryId(String(subCategoryName).trim(), 0);
    }

    return { categoryId, subCategoryId };
  }

  // ─── Fetch Full Taxonomies (Categories Tree, Flat, and Brands) ──────────────
  async getTaxonomies() {
    logger.info(`[${this.name}] Fetching full taxonomies from OMS API...`);
    const client = this.getClient();

    try {
      const res = await client.get('/taxonomies');
      const taxonomies = res.data?.taxonomies || {};

      // Warm category resolution cache with full taxonomy dump
      this._warmCategoryCache(taxonomies.categories_flat, taxonomies.categories_tree);

      logger.info(`[${this.name}] ✅ Retrieved taxonomies (${taxonomies.categories_count || 0} categories, ${taxonomies.brands_count || 0} brands).`);
      return taxonomies;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getTaxonomies failed: ${errMsg}`);
      throw new Error(`Fifozone OMS getTaxonomies failed: ${errMsg}`);
    }
  }

  // ─── Fetch Brands List with In-Memory Caching ────────────────────────────────
  async getBrands(options = {}) {
    const opts = options || {};
    const now = Date.now();
    const forceRefresh = Boolean(opts.forceRefresh);

    // Return cached brands if still valid
    if (!forceRefresh && this._brandsCache && this._brandsCacheExpiry > now) {
      logger.debug(`[${this.name}] Returning ${this._brandsCache.length} brands from in-memory cache.`);
      return this._formatBrandsOutput(this._brandsCache, opts.format);
    }

    logger.info(`[${this.name}] Fetching brand taxonomy from OMS API...`);
    const client = this.getClient();

    try {
      const params = opts.limit ? { limit: opts.limit } : {};
      const res = await client.get('/brands', { params });
      const rawBrands = res.data?.brands || [];

      const normalized = rawBrands.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: b.count || 0
      }));

      // Cache normalized brands
      this._brandsCache = normalized;
      this._brandsCacheExpiry = now + this._brandsCacheTTL;

      logger.info(`[${this.name}] ✅ Retrieved and cached ${normalized.length} brands.`);
      return this._formatBrandsOutput(normalized, opts.format);
    } catch (error) {
      const brandsErrorMsg = this._extractErrorMessage(error);
      // Fallback: Check if taxonomies dump contains brands
      logger.warn(`[${this.name}] /brands fetch failed (${brandsErrorMsg}). Attempting /taxonomies fallback...`);
      try {
        const taxRes = await client.get('/taxonomies');
        const taxBrands = taxRes.data?.taxonomies?.brands || [];
        const normalized = taxBrands.map(b => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          count: b.count || 0
        }));

        this._brandsCache = normalized;
        this._brandsCacheExpiry = now + this._brandsCacheTTL;
        return this._formatBrandsOutput(normalized, opts.format);
      } catch (fallbackErr) {
        const errMsg = this._extractErrorMessage(fallbackErr);
        logger.error(`[${this.name}] getBrands failed: ${errMsg}`);
        throw new Error(`Fifozone OMS getBrands failed: ${errMsg}`);
      }
    }
  }

  clearBrandsCache() {
    this._brandsCache = null;
    this._brandsCacheExpiry = 0;
    logger.info(`[${this.name}] Brands cache cleared.`);
  }

  _formatBrandsOutput(brands, format) {
    if (format === 'names') {
      return brands.map(b => b.name);
    }
    if (format === 'options') {
      return brands.map(b => ({ label: b.name, value: b.name, key: b.id }));
    }
    return brands;
  }

  // ─── 12. TEST CONNECTION (Fast GET /products?limit=1 Probe) ─────────────────
  async testConnection(options = null) {
    logger.info(`[${this.name}] Testing connection to OMS API...`);
    const customCreds = (options && (options.baseURL || options.apiKey)) ? options : null;
    const client = customCreds ? this.getClient(customCreds) : this.getClient();
    const startTime = Date.now();

    try {
      const res = await client.get('/products', { params: { limit: 1 } });
      const latencyMs = Date.now() - startTime;
      const total = res.data?.total !== undefined ? res.data.total : (res.data?.count || 0);

      logger.info(`[${this.name}] Connection verified via /products (${latencyMs}ms). Products: ${total}`);

      const result = {
        success: true,
        productCount: total
      };

      if (options && options.includeStats) {
        result.stats = {
          total_products: total,
          total_orders: 0,
          processing_orders: 0,
          pending_orders: 0,
          outofstock_count: 0
        };
        result.timestamp = new Date().toISOString();
        result.latencyMs = latencyMs;
      }

      return result;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] Connection test failed: ${errMsg}`);
      throw new Error(`Fifozone OMS connection test failed: ${errMsg}`);
    }
  }

  // ─── 13. PULL CUSTOMERS (GET /customers) ────────────────────────────────────
  async pullCustomers(options = {}) {
    const opts = options || {};
    logger.info(`[${this.name}] Pulling customers from OMS API...`);
    const client = this.getClient();
    const limit = opts.limit || 100;
    const fetchAll = opts.fetchAll !== false && opts.page === undefined;

    // Single page mode
    if (!fetchAll) {
      const page = opts.page || 1;
      const params = { page, limit, ...(opts.search ? { search: opts.search } : {}) };
      const res = await client.get('/customers', { params });
      const rawList = res.data?.data || [];

      const normalized = rawList.map(c => this._normalizeCustomer(c));
      return {
        total: res.data?.total || normalized.length,
        page: res.data?.page || page,
        limit: res.data?.limit || limit,
        totalPages: res.data?.total_pages || 1,
        count: normalized.length,
        customers: normalized
      };
    }

    // Full multi-page catalog sweep
    const allCustomers = [];
    let page = 1;
    const maxPages = opts.maxPages || 50;

    try {
      while (page <= maxPages) {
        const params = { page, limit, ...(opts.search ? { search: opts.search } : {}) };
        const res = await client.get('/customers', { params });
        const batch = res.data?.data || [];

        if (!batch || batch.length === 0) break;

        const normalizedBatch = batch.map(c => this._normalizeCustomer(c));
        allCustomers.push(...normalizedBatch);

        const totalPages = res.data?.total_pages ? parseInt(res.data.total_pages, 10) : 1;
        if (page >= totalPages || batch.length < limit) break;

        page++;
      }

      logger.info(`[${this.name}] ✅ Successfully pulled ${allCustomers.length} total customers.`);
      return allCustomers;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] pullCustomers error: ${errMsg}`);
      throw new Error(`Fifozone OMS pullCustomers failed: ${errMsg}`);
    }
  }

  // Normalize single raw OMS customer object to internal Customer schema
  _normalizeCustomer(c) {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
    return {
      platformCustomerId: String(c.id || c.user_id || ''),
      name: fullName || c.email || 'Unnamed Customer',
      firstName: c.first_name || '',
      lastName: c.last_name || '',
      email: (c.email || '').trim().toLowerCase(),
      phone: (c.phone || '').trim(),
      city: c.city || '',
      state: c.state || '',
      pincode: c.postcode || c.pincode || '',
      country: c.country || 'India',
      platforms: ['fifozone'],
      raw: c
    };
  }

  // ─── 14. UNIVERSAL HUB STATS & DATA ─────────────────────────────────────────
  async getHubStats() {
    try {
      const data = await this.getHubData({ include: 'stats' });
      return data?.stats || {};
    } catch (_) {
      const conn = await this.testConnection({ includeStats: true });
      return conn.stats || {};
    }
  }

  async getHubData(options = {}) {
    logger.info(`[${this.name}] Fetching unified hub data...`);
    const client = this.getClient();
    try {
      const res = await client.get('/hub', { params: options });
      return res.data;
    } catch (error) {
      const errMsg = this._extractErrorMessage(error);
      logger.error(`[${this.name}] getHubData error: ${errMsg}`);
      throw new Error(`Fifozone OMS getHubData failed: ${errMsg}`);
    }
  }
}

const serviceInstance = new FifozoneOmsService();
serviceInstance.FifozoneOmsService = FifozoneOmsService;
serviceInstance.FifozoneOmsError = FifozoneOmsError;

module.exports = serviceInstance;
