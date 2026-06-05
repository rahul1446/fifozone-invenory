const Settings = require('../models/Settings.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// @desc    Get general settings
// @route   GET /api/settings
// @access  Private
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  
  if (!settings) {
    settings = await Settings.create({});
  }
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update general settings
// @route   PUT /api/settings
// @access  Private (Admin)
const updateSettings = asyncHandler(async (req, res) => {
  const { companyName, email, phone, address, gstin, currency, timezone, logoUrl, primaryColor } = req.body;

  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings({});
  }

  if (companyName !== undefined) settings.companyName = companyName;
  if (email !== undefined) settings.email = email;
  if (phone !== undefined) settings.phone = phone;
  if (address !== undefined) settings.address = address;
  if (gstin !== undefined) settings.gstin = gstin;
  if (currency !== undefined) settings.currency = currency;
  if (timezone !== undefined) settings.timezone = timezone;
  if (logoUrl !== undefined) settings.logoUrl = logoUrl;
  if (primaryColor !== undefined) settings.primaryColor = primaryColor;
  
  settings.updatedBy = req.user._id;

  await settings.save();

  res.status(200).json({
    success: true,
    data: settings,
    message: 'Settings updated successfully'
  });
});

module.exports = {
  getSettings,
  updateSettings
};
