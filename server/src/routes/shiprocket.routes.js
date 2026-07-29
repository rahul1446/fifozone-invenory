const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/shiprocket.controller');

const admin = [requireAuth, requireRole(['admin', 'manager'])];

// ─── Shipments overview ──────────────────────────────────────
router.get('/shipments',                    ...admin, ctrl.getAllShipments);

// ─── Order actions ───────────────────────────────────────────
router.post('/orders/bulk-push',            ...admin, ctrl.bulkPushOrders);
router.post('/orders/:id/push',             ...admin, ctrl.pushOrder);
router.post('/orders/:id/cancel',           ...admin, ctrl.cancelOrder);
router.post('/orders/:id/awb',              ...admin, ctrl.generateAWB);
router.post('/orders/:id/pickup',           ...admin, ctrl.requestPickup);
router.post('/orders/:id/label',            ...admin, ctrl.printLabel);
router.post('/orders/:id/invoice',          ...admin, ctrl.printInvoice);
router.get('/orders/:id/track',             ...admin, ctrl.trackShipment);
router.get('/orders/:id/couriers',          ...admin, ctrl.getAvailableCouriers);

// ─── Manifest (bulk) ────────────────────────────────────────
router.post('/manifest',                    ...admin, ctrl.generateManifest);

// ─── Serviceability & rate check ────────────────────────────
router.get('/serviceability',               ...admin, ctrl.checkServiceability);

// ─── Pickup locations ────────────────────────────────────────
router.get('/pickup-locations',             ...admin, ctrl.getPickupLocations);

// ─── NDR Management ─────────────────────────────────────────
router.get('/ndr',                          ...admin, ctrl.getNDRList);
router.post('/ndr/action',                  ...admin, ctrl.submitNDRAction);

// ─── Webhook (public — Shiprocket calls this) ────────────────
router.post('/webhook', ctrl.webhookListener);

module.exports = router;
