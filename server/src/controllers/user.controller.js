const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, users, 'User list retrieved successfully'));
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, receiveEmailAlerts, receiveWhatsAppAlerts } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const user = new User({
    name,
    email,
    password,
    role: role || 'manager',
    phone: phone || '',
    receiveEmailAlerts: receiveEmailAlerts !== undefined ? receiveEmailAlerts : true,
    receiveWhatsAppAlerts: receiveWhatsAppAlerts !== undefined ? receiveWhatsAppAlerts : false
  });

  await user.save();

  // Strip password
  const savedUser = user.toObject();
  delete savedUser.password;

  res.status(201).json(new ApiResponse(201, savedUser, 'Staff user created successfully'));
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent self-deactivation or self-role change to be safe
  if (user._id.toString() === req.user._id.toString() && updates.role && updates.role !== user.role) {
    throw new ApiError(400, 'You cannot change your own role');
  }

  if (user._id.toString() === req.user._id.toString() && updates.isActive !== undefined && !updates.isActive) {
    throw new ApiError(400, 'You cannot deactivate your own profile');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json(new ApiResponse(200, updatedUser, 'Staff user updated successfully'));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user._id.toString()) {
    throw new ApiError(400, 'You cannot delete your own account');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Soft delete / deactivation
  user.isActive = false;
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Staff account deactivated successfully'));
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
