/**
 * Mock API Server — Port 5001
 * Simulates Amazon SP-API and Flipkart Seller API with realistic fake data.
 * Runs alongside the main Fifozone server on port 5000.
 * 
 * Toggle with USE_MOCK_API=true in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../..', '.env') });

const express = require('express');
const cors = require('cors');
const mockRouter = require('./mockRouter');

const app = express();

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger (lightweight) ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[MOCK] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── All mock routes ──
app.use('/mock', mockRouter);

// ── Health check ──
app.get('/mock/health', (req, res) => {
  res.json({
    status: 'Mock API server running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    platforms: {
      amazon: { baseUrl: '/mock/amazon', status: 'OK', marketplace: 'A21TJRUUN4KGV (India)' },
      flipkart: { baseUrl: '/mock/flipkart', status: 'OK' },
    },
    endpoints: {
      amazon: [
        'GET  /mock/amazon/orders/v0/orders',
        'GET  /mock/amazon/catalog/2022-04-01/items',
        'GET  /mock/amazon/fba/inventory/v1/summaries',
        'GET  /mock/amazon/returns',
        'GET  /mock/amazon/finances/v0/financialEvents',
        'GET  /mock/amazon/messaging/v1/messages',
        'GET  /mock/amazon/reviews',
        'GET  /mock/amazon/advertising/v2/sp/campaigns',
        'GET  /mock/amazon/seller/accountHealth',
      ],
      flipkart: [
        'GET  /mock/flipkart/orders',
        'GET  /mock/flipkart/listings',
        'GET  /mock/flipkart/inventory',
        'GET  /mock/flipkart/returns',
        'GET  /mock/flipkart/payments/settlements',
        'GET  /mock/flipkart/messages',
        'GET  /mock/flipkart/reviews',
        'GET  /mock/flipkart/advertising/campaigns',
        'GET  /mock/flipkart/seller/health',
      ],
    },
  });
});

// ── 404 handler ──
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'MOCK_ENDPOINT_NOT_FOUND',
    message: `No mock route for ${req.method} ${req.originalUrl}`,
    hint: 'Visit GET /mock/health to see all available endpoints',
  });
});

// ── Start ──
const PORT = process.env.MOCK_SERVER_PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n✅  Mock API server running on http://localhost:${PORT}`);
  console.log(`   → Amazon mock:   http://localhost:${PORT}/mock/amazon`);
  console.log(`   → Flipkart mock: http://localhost:${PORT}/mock/flipkart`);
  console.log(`   → Health check:  http://localhost:${PORT}/mock/health\n`);
});

module.exports = app;
