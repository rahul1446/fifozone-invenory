const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { login, logout, refresh, me, changePassword } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (e) {}
  next();
};

router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', optionalAuth, logout);
router.get('/me', requireAuth, me);
router.patch('/change-password', requireAuth, changePassword);

module.exports = router;
