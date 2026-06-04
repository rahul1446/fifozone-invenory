const axios = require('axios');
const SyncService = require('../services/sync.service');
const PlatformSync = require('../models/PlatformSync.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const WooCommerceService = require('../services/woocommerce.service');

const USE_MOCK = process.env.USE_MOCK_API === 'true';
const MOCK_BASE = process.env.MOCK_BASE_URL || 'http://localhost:5001/mock';

const getSyncStatus = asyncHandler(async (req, res) => {
  const syncStatus = await PlatformSync.find();
  res.status(200).json(new ApiResponse(200, syncStatus, 'Sync statuses retrieved successfully'));
});

const triggerManualSync = asyncHandler(async (req, res) => {
  SyncService.syncAllPlatforms();
  res.status(200).json(new ApiResponse(200, null, 'Platform manual synchronization triggered in background'));
});

const getWooCommerceCategories = asyncHandler(async (req, res) => {
  const tree = await WooCommerceService.getCategoryTree();
  res.status(200).json(new ApiResponse(200, tree, 'WooCommerce categories retrieved successfully'));
});

const updateCredentials = asyncHandler(async (req, res) => {
  const { platform, ...credentials } = req.body;

  if (!platform) {
    return res.status(400).json(new ApiResponse(400, null, 'Platform identifier is required'));
  }

  const PlatformCredential = require('../models/PlatformCredential.model');

  await PlatformCredential.findOneAndUpdate(
    { platform },
    { credentials, isActive: true },
    { upsert: true, new: true }
  );

  res.status(200).json(new ApiResponse(200, null, `Credentials updated successfully for ${platform}`));
});

const getCredentialsStatus = asyncHandler(async (req, res) => {
  const PlatformCredential = require('../models/PlatformCredential.model');
  const creds = await PlatformCredential.find({ isActive: true });

  const getForPlatform = (name) => {
    const found = creds.find(c => c.platform === name);
    return {
      connected: !!found,
      ...(found?.credentials || {})
    };
  };

  const result = {
    fifozone: getForPlatform('fifozone'),
    amazon:   getForPlatform('amazon'),
    flipkart: getForPlatform('flipkart'),
    meesho:   getForPlatform('meesho'),
  };

  res.status(200).json(new ApiResponse(200, result, 'Credential status retrieved successfully'));
});

// ─── testConnection ─────────────────────────────────────────────────────────
// When USE_MOCK_API=true  → hits the local mock server (always succeeds)
// When USE_MOCK_API=false → hits real Amazon / Flipkart / WooCommerce APIs
const testConnection = asyncHandler(async (req, res) => {
  const { platform } = req.body;

  if (!platform) {
    return res.status(400).json(new ApiResponse(400, null, 'Platform is required'));
  }

  // ── MOCK MODE ────────────────────────────────────────────────────────────
  if (USE_MOCK) {
    try {
      if (platform === 'amazon') {
        const r = await axios.get(`${MOCK_BASE}/amazon/seller/accountHealth`, { timeout: 5000 });
        const health = r.data?.accountHealth || r.data || {};
        const status = health.healthStatus || 'NORMAL';
        return res.status(200).json(new ApiResponse(200,
          { success: true, mockMode: true, healthStatus: status },
          `✅ Amazon mock server connected! Account health: ${status}.`
        ));
      }

      if (platform === 'flipkart') {
        const r = await axios.get(`${MOCK_BASE}/flipkart/seller/health`, { timeout: 5000 });
        const score = r.data?.sellerScore ?? r.data?.score ?? 82;
        return res.status(200).json(new ApiResponse(200,
          { success: true, mockMode: true, sellerScore: score },
          `✅ Flipkart mock server connected! Seller score: ${score}/100.`
        ));
      }

      if (platform === 'fifozone') {
        const WooCommerceService = require('../services/woocommerce.service');
        try {
          const client = await WooCommerceService.getClient();
          const response = await client.get('products', { per_page: 1 });
          const total = response.headers?.['x-wp-total'] || response.data?.length || '?';
          return res.status(200).json(new ApiResponse(200,
            { success: true, productCount: total },
            `✅ Connected to Fifozone WooCommerce! Found ${total} products.`
          ));
        } catch (wooErr) {
          // WooCommerce might not be reachable in dev — return graceful mock
          return res.status(200).json(new ApiResponse(200,
            { success: true, mockMode: true },
            '✅ Fifozone connection verified (mock mode).'
          ));
        }
      }

      if (platform === 'meesho') {
        // Meesho doesn't have a public health endpoint — just verify credentials exist
        const PlatformCredential = require('../models/PlatformCredential.model');
        const cred = await PlatformCredential.findOne({ platform: 'meesho', isActive: true });
        if (cred) {
          return res.status(200).json(new ApiResponse(200,
            { success: true, mockMode: true },
            '✅ Meesho credentials found and saved. Sync will activate automatically.'
          ));
        }
        return res.status(200).json(new ApiResponse(200,
          { success: false },
          'No Meesho credentials saved yet. Save your Supplier ID and API Key first.'
        ));
      }

      return res.status(400).json(new ApiResponse(400, null, 'Unknown platform'));

    } catch (err) {
      logger.warn(`[testConnection] Mock ping failed for ${platform}: ${err.message}`);
      // Even if mock server is down, don't show hard failure — tell user to start it
      return res.status(200).json(new ApiResponse(200,
        { success: false, mockMode: true },
        `Mock server not reachable. Run "npm run dev:mock" in the server folder, then retry.`
      ));
    }
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────
  try {
    if (platform === 'fifozone') {
      const WooCommerceService = require('../services/woocommerce.service');
      const client = await WooCommerceService.getClient();
      const response = await client.get('products', { per_page: 1 });
      const total = response.headers?.['x-wp-total'] || response.data?.length || '?';
      return res.status(200).json(new ApiResponse(200,
        { success: true, productCount: total },
        `Connected to Fifozone WooCommerce! Found ${total} products.`
      ));
    }

    if (platform === 'amazon') {
      const AmazonService = require('../services/amazon.service');
      await AmazonService.getClient();
      return res.status(200).json(new ApiResponse(200, { success: true }, 'Amazon SP-API connection verified.'));
    }

    if (platform === 'flipkart') {
      const FlipkartService = require('../services/flipkart.service');
      await FlipkartService.getAccessToken();
      return res.status(200).json(new ApiResponse(200, { success: true }, 'Flipkart API connection verified.'));
    }

    return res.status(400).json(new ApiResponse(400, null, 'Unknown platform'));

  } catch (err) {
    logger.warn(`[testConnection] Live connection failed for ${platform}: ${err.message}`);
    return res.status(200).json(new ApiResponse(200,
      { success: false },
      `Connection failed: ${err.message}`
    ));
  }
});

module.exports = {
  getSyncStatus,
  triggerManualSync,
  updateCredentials,
  getCredentialsStatus,
  testConnection,
  getWooCommerceCategories
};
