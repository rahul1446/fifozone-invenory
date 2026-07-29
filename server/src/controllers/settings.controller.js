const Settings          = require('../models/Settings.model');
const asyncHandler      = require('../utils/asyncHandler');
const ApiError          = require('../utils/ApiError');
const ShiprocketService = require('../services/shiprocket.service');

// Bullet chars used as masked placeholder — never store these
const MASKED = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

// GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});

  const safe = settings.toObject();
  if (safe.shiprocket?.password) {
    safe.shiprocket.hasPassword = true;
    delete safe.shiprocket.password; // never send raw password to frontend
  } else {
    if (safe.shiprocket) safe.shiprocket.hasPassword = false;
  }

  res.status(200).json({ success: true, data: safe });
});

// PUT /api/settings
const updateSettings = asyncHandler(async (req, res) => {
  const {
    companyName, email, phone, address, gstin, currency, timezone, logoUrl, primaryColor,
    shiprocket, woocommerce
  } = req.body;

  let settings = await Settings.findOne();
  if (!settings) settings = new Settings({});

  // General
  if (companyName  !== undefined) settings.companyName  = companyName;
  if (email        !== undefined) settings.email        = email;
  if (phone        !== undefined) settings.phone        = phone;
  if (address      !== undefined) settings.address      = address;
  if (gstin        !== undefined) settings.gstin        = gstin;
  if (currency     !== undefined) settings.currency     = currency;
  if (timezone     !== undefined) settings.timezone     = timezone;
  if (logoUrl      !== undefined) settings.logoUrl      = logoUrl;
  if (primaryColor !== undefined) settings.primaryColor = primaryColor;

  // Shiprocket credentials
  if (shiprocket) {
    if (shiprocket.email          !== undefined) settings.shiprocket.email          = shiprocket.email?.trim();
    if (shiprocket.pickupLocation !== undefined) settings.shiprocket.pickupLocation = shiprocket.pickupLocation?.trim() || 'Primary';

    // Only update password if a real new one is sent (not the masked placeholder, not empty)
    const newPwd = shiprocket.password?.trim();
    if (newPwd && newPwd !== MASKED) {
      settings.shiprocket.password = newPwd;
    } else if (!newPwd && !settings.shiprocket.password) {
      // No password at all — mark not configured
    }
    // isConfigured = has BOTH a real email and a real password in DB
    settings.shiprocket.isConfigured = !!(settings.shiprocket.email && settings.shiprocket.password);
  }

  // WooCommerce credentials
  if (woocommerce) {
    if (woocommerce.siteUrl        !== undefined) settings.woocommerce.siteUrl        = woocommerce.siteUrl;
    if (woocommerce.consumerKey    !== undefined) settings.woocommerce.consumerKey    = woocommerce.consumerKey;
    if (woocommerce.consumerSecret !== undefined) settings.woocommerce.consumerSecret = woocommerce.consumerSecret;
    settings.woocommerce.isConfigured = !!(settings.woocommerce.siteUrl && settings.woocommerce.consumerKey);
  }

  settings.updatedBy = req.user._id;
  await settings.save();

  const safe = settings.toObject();
  if (safe.shiprocket?.password) {
    safe.shiprocket.hasPassword = true;
    delete safe.shiprocket.password;
  } else {
    if (safe.shiprocket) safe.shiprocket.hasPassword = false;
  }

  res.status(200).json({ success: true, data: safe, message: 'Settings saved successfully' });
});

module.exports = { getSettings, updateSettings, testShiprocketConnection, debugShiprocketRaw };

// POST /api/settings/test-shiprocket
async function testShiprocketConnection(req, res) {
  try {
    const settings = await Settings.findOne().lean();
    const email    = settings?.shiprocket?.email;
    const password = settings?.shiprocket?.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'No credentials found in database. Please enter your email and password and click Save first.'
      });
    }

    // Force fresh login by clearing cached token
    ShiprocketService.token       = null;
    ShiprocketService.tokenExpiry = null;
    await ShiprocketService.authenticate();

    res.status(200).json({ success: true, message: '✅ Shiprocket connected successfully! All shipping features are now active.' });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message  // Now shows the REAL Shiprocket error
    });
  }
}

// GET /api/settings/debug-shiprocket
// Shows raw Shiprocket API response — helps diagnose login issues
async function debugShiprocketRaw(req, res) {
  const axios = require('axios');
  try {
    const settings = await Settings.findOne().lean();
    const email    = settings?.shiprocket?.email;
    const password = settings?.shiprocket?.password;

    if (!email || !password) {
      return res.json({ success: false, message: 'No credentials stored in DB', email: null });
    }

    // Make a raw login call and return the full response
    let rawResponse, rawError;
    try {
      const r = await axios.post(
        'https://apiv2.shiprocket.in/v1/external/auth/login',
        { email, password },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      rawResponse = { status: r.status, data: r.data };
    } catch (e) {
      rawError = {
        message:      e.message,
        status:       e.response?.status,
        responseData: e.response?.data,
      };
    }

    res.json({
      success:       !!rawResponse?.data?.token,
      emailUsed:     email,
      passwordLength:password?.length,
      rawResponse,
      rawError,
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
}
