/**
 * woocommerce.service.js
 * 
 * @deprecated This module is deprecated as part of the migration to the Fifozone Universal OMS API.
 * All operations now delegate directly to FifozoneOmsService.
 * This file is retained solely as a backward-compatible compatibility shim for legacy callers.
 * Direct callers should import and use FifozoneOmsService directly:
 *   const FifozoneOmsService = require('./fifozoneOms.service');
 */

const logger = require('../utils/logger');
const FifozoneOmsService = require('./fifozoneOms.service');

class WooCommerceService {
  constructor() {
    this.name = 'Fifozone OMS (Deprecated WooCommerceService Shim)';
    logger.warn(
      `[DEPRECATED] WooCommerceService is deprecated and will be removed in a future release. ` +
      `Please migrate all calls to FifozoneOmsService.`
    );
  }

  // ─── Client Access & Diagnostics ───────────────────────────────────────────
  getClient(options = {}) {
    return FifozoneOmsService.getClient(options);
  }

  async testConnection(options = null) {
    logger.warn(`[${this.name}] Routing deprecated testConnection to FifozoneOmsService...`);
    return await FifozoneOmsService.testConnection(options);
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

  // ─── Products & Catalog ─────────────────────────────────────────────────────
  async pullProducts(options = {}) {
    logger.info(`[${this.name}] Routing pullProducts to Fifozone OMS API...`);
    return await FifozoneOmsService.pullProducts(options);
  }

  async getProducts(options = {}) {
    logger.info(`[${this.name}] Routing getProducts alias to Fifozone OMS API pullProducts...`);
    return await FifozoneOmsService.pullProducts(options);
  }

  async getProduct(productId) {
    logger.info(`[${this.name}] Routing getProduct alias to Fifozone OMS API getProductById for ID: ${productId}`);
    return await FifozoneOmsService.getProductById(productId);
  }

  async getProductById(productId) {
    logger.info(`[${this.name}] Routing getProductById to Fifozone OMS API for ID: ${productId}`);
    return await FifozoneOmsService.getProductById(productId);
  }

  async getProductBySku(sku) {
    logger.info(`[${this.name}] Routing getProductBySku to Fifozone OMS API for SKU: ${sku}`);
    return await FifozoneOmsService.getProductBySku(sku);
  }

  async createProduct(product) {
    logger.info(`[${this.name}] Routing createProduct to Fifozone OMS API: ${product?.masterName || product?.name || 'unknown'}`);
    return await FifozoneOmsService.createProduct(product);
  }

  async updateProduct(product, wooProductId) {
    logger.info(`[${this.name}] Routing updateProduct to Fifozone OMS API: ${product?.masterName || product?.name || 'unknown'}`);
    return await FifozoneOmsService.updateProduct(product, wooProductId);
  }

  async deleteProduct(product, force = true) {
    logger.info(`[${this.name}] Routing deleteProduct to Fifozone OMS API: ${product?.masterName || product?.name || 'unknown'}`);
    return await FifozoneOmsService.deleteProduct(product, force);
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

  async getOrder(orderId) {
    logger.info(`[${this.name}] Routing getOrder to Fifozone OMS API for order #${orderId}...`);
    return await FifozoneOmsService.getOrder(orderId);
  }

  async updateOrder(orderId, updateData = {}) {
    logger.info(`[${this.name}] Routing updateOrder to Fifozone OMS API for order #${orderId}...`);
    return await FifozoneOmsService.updateOrder(orderId, updateData);
  }

  // ─── Categories & Taxonomies ────────────────────────────────────────────────
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

  async getCategoryTree(forceRefresh = false) {
    return await FifozoneOmsService.getCategoryTree(forceRefresh);
  }

  async getCategories(parentId = 0) {
    return await FifozoneOmsService.getCategories(parentId);
  }

  clearCategoryCache() {
    FifozoneOmsService.clearCategoryCache();
  }

  async getBrands(options = {}) {
    return await FifozoneOmsService.getBrands(options);
  }

  async getTaxonomies() {
    return await FifozoneOmsService.getTaxonomies();
  }

  clearBrandsCache() {
    FifozoneOmsService.clearBrandsCache();
  }

  // ─── Legacy Backward Compatibility Helpers ──────────────────────────────────
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
        const match = results.find(
          p => (p.masterName || p.name || '').toLowerCase().trim() === targetName.toLowerCase().trim()
        );
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

  buildWooPayload(product, categoryIds = []) {
    return FifozoneOmsService.buildOmsPayload(product, categoryIds);
  }

  async syncVariations(client, wooProductId, variants) {
    logger.warn(`[${this.name}] syncVariations is obsolete; variation updates are handled natively by Fifozone OMS`);
    return { success: true, message: 'Variations handled natively by Fifozone OMS' };
  }
}

module.exports = new WooCommerceService();
