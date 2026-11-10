const axios = require('axios');
const SyncService = require('../services/sync.service');
const PlatformSync = require('../models/PlatformSync.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const FifozoneOmsService = require('../services/fifozoneOms.service');

const getSyncStatus = asyncHandler(async (req, res) => {
  const syncStatus = await PlatformSync.find();
  res.status(200).json(new ApiResponse(200, syncStatus, 'Sync statuses retrieved successfully'));
});

const triggerManualSync = asyncHandler(async (req, res) => {
  SyncService.syncAllPlatforms();
  res.status(200).json(new ApiResponse(200, null, 'Platform manual synchronization triggered in background'));
});

const getWooCommerceCategories = asyncHandler(async (req, res) => {
  const tree = await FifozoneOmsService.getCategoryTree();
  res.status(200).json(new ApiResponse(200, tree, 'Categories retrieved successfully'));
});

const updateCredentials = asyncHandler(async (req, res) => {
  const { platform, ...credentials } = req.body;

  if (!platform) {
    return res.status(400).json(new ApiResponse(400, null, 'Platform identifier is required'));
  }

  // Normalize and trim strings in credentials
  const cleanCreds = {};
  for (const [k, v] of Object.entries(credentials)) {
    cleanCreds[k] = typeof v === 'string' ? v.trim() : v;
  }

  if (platform === 'flipkart') {
    const id = cleanCreds.clientId || cleanCreds.appId || cleanCreds.apiKey || '';
    const secret = cleanCreds.clientSecret || cleanCreds.appSecret || cleanCreds.apiSecret || '';
    cleanCreds.clientId = id;
    cleanCreds.appId = id; // keep appId synced for backwards-compatibility
    cleanCreds.clientSecret = secret;
  }

  const PlatformCredential = require('../models/PlatformCredential.model');

  await PlatformCredential.findOneAndUpdate(
    { platform },
    { credentials: cleanCreds, isActive: true },
    { upsert: true, new: true }
  );

  res.status(200).json(new ApiResponse(200, null, `Credentials updated successfully for ${platform}`));
});

const getCredentialsStatus = asyncHandler(async (req, res) => {
  const PlatformCredential = require('../models/PlatformCredential.model');
  const creds = await PlatformCredential.find({ isActive: true });

  const getForPlatform = (name) => {
    const found = creds.find(c => c.platform === name);
    if (name === 'fifozone' && !found && (process.env.FIFOZONE_OMS_API_KEY || FifozoneOmsService.apiKey)) {
      return {
        connected: true,
        storeUrl: process.env.FIFOZONE_OMS_BASE_URL || FifozoneOmsService.baseURL,
        apiKey: process.env.FIFOZONE_OMS_API_KEY || FifozoneOmsService.apiKey
      };
    }
    const c = found?.credentials || {};
    let isConnected = !!found;
    if (name === 'flipkart') {
      const id = c.clientId || c.appId || c.apiKey || process.env.FLIPKART_CLIENT_ID || process.env.FLIPKART_APP_ID;
      const secret = c.clientSecret || c.appSecret || c.apiSecret || process.env.FLIPKART_CLIENT_SECRET || process.env.FLIPKART_APP_SECRET;
      isConnected = !!(id && secret);
      return {
        connected: isConnected,
        ...c,
        clientId: id || '',
        appId: id || '',
        clientSecret: secret || ''
      };
    }
    return {
      connected: isConnected,
      ...c
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
  const { platform, credentials } = req.body;

  if (!platform) {
    return res.status(400).json(new ApiResponse(400, null, 'Platform is required'));
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────
  try {
    if (platform === 'fifozone') {
      const testRes = await FifozoneOmsService.testConnection();
      const total = testRes.productCount || '?';
      return res.status(200).json(new ApiResponse(200,
        { success: true, productCount: total },
        `Connected to Fifozone High-Speed OMS API! Found ${total} products.`
      ));
    }

    if (platform === 'amazon') {
      const AmazonService = require('../services/amazon.service');
      await AmazonService.getClient(credentials);
      return res.status(200).json(new ApiResponse(200, { success: true }, 'Amazon SP-API connection verified.'));
    }

    if (platform === 'flipkart') {
      const FlipkartService = require('../services/flipkart.service');
      const testRes = await FlipkartService.testConnection(credentials);
      return res.status(200).json(new ApiResponse(200, { success: true }, testRes?.message || 'Flipkart API connection verified.'));
    }

    if (platform === 'meesho') {
      const MeeshoService = require('../services/meesho.service');
      if (typeof MeeshoService?.testConnection === 'function') {
        const testRes = await MeeshoService.testConnection(credentials);
        return res.status(200).json(new ApiResponse(200, { success: true }, testRes?.message || 'Meesho API connection verified.'));
      }
      return res.status(200).json(new ApiResponse(200, { success: true }, 'Meesho configuration saved.'));
    }

    return res.status(400).json(new ApiResponse(400, null, 'Unknown platform'));

  } catch (err) {
    logger.warn(`[testConnection] Live connection failed for ${platform}: ${err.message}`);
    return res.status(400).json(new ApiResponse(400,
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
  getWooCommerceCategories,
  getOmsCategories: getWooCommerceCategories,
  getFifozoneCategories: getWooCommerceCategories
};
