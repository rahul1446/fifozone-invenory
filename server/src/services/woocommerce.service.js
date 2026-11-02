const logger = require('../utils/logger');
const FifozoneOmsService = require('./fifozoneOms.service');

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

/**
 * WooCommerceService (Fifozone OMS Facade)
 * Fully migrated to Fifozone High-Speed OMS API endpoints.
 * All legacy REST calls have been replaced with direct Fifozone OMS calls.
 */
class WooCommerceService {
  constructor() {
    this.name = 'Fifozone OMS';
  }

  async getClient() {
    return FifozoneOmsService.getClient();
  }

  parseResponseData(data) {
    if (typeof data === 'string') {
      try {
        const clean = data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data;
        return JSON.parse(clean);
      } catch (e) {
        return [];
      }
    }
    return data || [];
  }

  // ─── 1. LOAD / PULL PRODUCTS ────────────────────────────────────────────────
  async pullProducts(options = {}) {
    logger.info(`[${this.name}] Routing pullProducts to custom high-speed Fifozone OMS API...`);
    return await FifozoneOmsService.pullProducts(options);
  }

  // ─── Categories ─────────────────────────────────────────────────────────────
  async resolveCategoryId(clientOrName, name, parentId = 0) {
    const targetName = typeof clientOrName === 'string' ? clientOrName : name;
    const targetParent = typeof clientOrName === 'string' ? (name || 0) : parentId;
    return await FifozoneOmsService.resolveCategoryId(targetName, targetParent);
  }

  async resolveSubCategoryId(clientOrCategoryName, categoryName, subCategoryName) {
    const catName = typeof clientOrCategoryName === 'string' ? clientOrCategoryName : categoryName;
    const subCatName = typeof clientOrCategoryName === 'string' ? categoryName : subCategoryName;
    return await FifozoneOmsService.resolveSubCategoryId(catName, subCatName);
  }

  async getCategoryTree() {
    return await FifozoneOmsService.getCategoryTree();
  }

  clearCategoryCache() {
    FifozoneOmsService.clearCategoryCache();
  }

  // ─── Find Product ID by SKU / Name ──────────────────────────────────────────
  async findWooProductId(clientOrSku, sku) {
    const targetSku = typeof clientOrSku === 'string' ? clientOrSku : sku;
    if (!targetSku) return null;
    try {
      const prod = await FifozoneOmsService.getProductBySku(targetSku);
      return prod?.id || prod?.product_id || null;
    } catch (_) {
      return null;
    }
  }

  async findWooProductIdByName(clientOrName, name) {
    const targetName = typeof clientOrName === 'string' ? clientOrName : name;
    if (!targetName) return null;
    try {
      const results = await FifozoneOmsService.pullProducts({ search: targetName, limit: 5 });
      if (results && results.length > 0) {
        const match = results.find(p => (p.masterName || p.name || '').toLowerCase().trim() === targetName.toLowerCase().trim());
        if (match) return match.platformIds?.fifozone?.productId || match.id || null;
        return results[0].platformIds?.fifozone?.productId || results[0].id || null;
      }
    } catch (_) {}
    return null;
  }

  async resolveWooId(clientOrProduct, product) {
    const prod = product || clientOrProduct;
    if (!prod) return null;
    let wooId = prod.platformIds?.fifozone?.productId;
    if (wooId && !isNaN(Number(wooId)) && Number(wooId) > 0) {
      return String(wooId);
    }
    if (prod.sku) {
      const found = await this.findWooProductId(prod.sku);
      if (found) return String(found);
    }
    if (prod.masterName) {
      const foundByName = await this.findWooProductIdByName(prod.masterName);
      if (foundByName) return String(foundByName);
    }
    return null;
  }

  // ─── Payload builder ────────────────────────────────────────────────────────
  buildWooPayload(product, categoryIds = []) {
    return FifozoneOmsService.buildOmsPayload(product, categoryIds);
  }

  async syncVariations(client, wooProductId, variants) {
    logger.info(`[${this.name}] syncVariations handled directly by Fifozone OMS batch updates`);
  }

  // ─── Product CRUD & Inventory ───────────────────────────────────────────────
  async createProduct(product) {
    logger.info(`[${this.name}] Routing createProduct to Fifozone OMS API: ${product.masterName}`);
    return await FifozoneOmsService.createProduct(product);
  }

  async updateProduct(product, wooProductId) {
    logger.info(`[${this.name}] Routing updateProduct to Fifozone OMS API: ${product.masterName}`);
    return await FifozoneOmsService.updateProduct(product, wooProductId);
  }

  async deleteProduct(product) {
    logger.info(`[${this.name}] Routing deleteProduct to Fifozone OMS API: ${product.masterName}`);
    return await FifozoneOmsService.deleteProduct(product);
  }

  async pushStock(sku, quantity) {
    logger.info(`[${this.name}] Routing pushStock to Fifozone OMS API for SKU: ${sku}`);
    return await FifozoneOmsService.pushStock(sku, quantity);
  }

  async pushPrice(sku, price) {
    logger.info(`[${this.name}] Routing pushPrice to Fifozone OMS API for SKU: ${sku}`);
    return await FifozoneOmsService.pushPrice(sku, price);
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────
  async pullOrders(options = {}) {
    logger.info(`[${this.name}] Routing pullOrders to Fifozone OMS API...`);
    return await FifozoneOmsService.pullOrders(options);
  }
}

module.exports = new WooCommerceService();
