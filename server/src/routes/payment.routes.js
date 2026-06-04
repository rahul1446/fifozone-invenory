const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/payment.controller');

router.use(requireAuth);

router.get('/overview', ctrl.getPaymentOverview);
router.get('/transactions', ctrl.getTransactions);
router.get('/fees', ctrl.getFeeBreakdown);
router.get('/export', ctrl.exportPayments);
router.get('/settlements', ctrl.getSettlements);
router.get('/invoices', ctrl.getInvoices);
router.post('/invoices', ctrl.createInvoice);
router.get('/refunds', ctrl.getRefunds);

module.exports = router;
