const AlertRule = require('../models/AlertRule.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const getAlertRules = asyncHandler(async (req, res) => {
  const rules = await AlertRule.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, rules, 'Alert rules retrieved'));
});

const createAlertRule = asyncHandler(async (req, res) => {
  const ruleData = req.body;
  ruleData.createdBy = req.user._id;

  const rule = new AlertRule(ruleData);
  await rule.save();

  res.status(201).json(new ApiResponse(201, rule, 'Alert rule created successfully'));
});

const updateAlertRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const rule = await AlertRule.findById(id);
  if (!rule) {
    throw new ApiError(404, 'Alert rule not found');
  }

  const updatedRule = await AlertRule.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true }
  );

  res.status(200).json(new ApiResponse(200, updatedRule, 'Alert rule updated'));
});

const deleteAlertRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const rule = await AlertRule.findById(id);
  if (!rule) {
    throw new ApiError(404, 'Alert rule not found');
  }

  await AlertRule.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(200, null, 'Alert rule deleted successfully'));
});

module.exports = {
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule
};
