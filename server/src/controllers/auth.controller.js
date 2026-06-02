const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// JWT generation helpers
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

const setCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // standard for MERN local cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find user and explicitly select password field
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // Strip password
  const loggedInUser = user.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;

  // Set httpOnly cookie
  res.cookie('refreshToken', refreshToken, setCookieOptions());

  res.status(200).json(
    new ApiResponse(200, { user: loggedInUser, accessToken }, 'Login successful')
  );
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null } });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

const refresh = asyncHandler(async (req, res) => {
  // Grab refresh token from cookies or fallback header
  const refreshToken = req.cookies?.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, setCookieOptions());

    res.status(200).json(
      new ApiResponse(200, { accessToken }, 'Access token refreshed successfully')
    );
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token credentials');
  }
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, req.user, 'Current user profile retrieved')
  );
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'Old and new passwords are required');
  }

  // Refind user with password selection
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(oldPassword))) {
    throw new ApiError(401, 'Incorrect old password');
  }

  user.password = newPassword;
  user.refreshToken = null; // force relogin elsewhere
  await user.save();

  res.status(200).json(new ApiResponse(200, null, 'Password updated successfully. Please log in again.'));
});

module.exports = {
  login,
  logout,
  refresh,
  me,
  changePassword
};
