const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');
const platformRoutes = require('./routes/platform.routes');
const alertRoutes = require('./routes/alert.routes');
const userRoutes = require('./routes/user.routes');
const uploadRoutes = require('./routes/upload.routes');
const importRoutes = require('./routes/import.routes');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ── Security Middlewares ──
app.use(helmet());
app.use(cors({
  origin: true, // Echo origin to allow cross-origin dev credentials
  credentials: true
}));
app.use(mongoSanitize());
app.use(hpp());

// Simple custom cookie parser middleware (avoids extra npm dependencies)
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        req.cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
  next();
});

// Request parsing & logger
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded product images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Global API rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per window
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// ── Register Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/import', importRoutes);
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/promotions', require('./routes/promotion.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/shipping', require('./routes/shipping.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/account-health', require('./routes/accountHealth.routes'));
app.use('/api/advertising', require('./routes/advertising.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// Base route indicator
app.get('/', (req, res) => {
  res.json({ message: 'Fifozone API Server running successfully' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
