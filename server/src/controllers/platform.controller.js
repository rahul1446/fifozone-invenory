const axios = require('axios');
const SyncService = require('../services/sync.service');
const PlatformSync = require('../models/PlatformSync.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const WooCommerceService = require('../services/woocommerce.service');

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
const testConnection = asyncHandler(async (req, res) => {
  const { platform } = req.body;

  if (!platform) {
    return res.status(400).json(new ApiResponse(400, null, 'Platform is required'));
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────
  try {
    if (platform === 'fifozone') {
      const FifozoneOmsService = require('../services/fifozoneOms.service');
      const testRes = await FifozoneOmsService.testConnection();
      const total = testRes.productCount || '?';
      return res.status(200).json(new ApiResponse(200,
        { success: true, productCount: total },
        `Connected to Fifozone High-Speed OMS API! Found ${total} products.`
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
