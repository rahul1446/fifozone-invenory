const express = require('express');
const router = express.Router();
const { validateImport, uploadImport, downloadTemplate } = require('../controllers/import.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// GET /api/import/template — download sample Excel template (public, no auth required)
router.get('/template', downloadTemplate);

// POST /api/import/validate — validate parsed products (admin + manager)
router.post('/validate', requireAuth, requireRole(['admin', 'manager']), validateImport);

// POST /api/import/upload — bulk upload approved products (admin + manager)
router.post('/upload', requireAuth, requireRole(['admin', 'manager']), uploadImport);

module.exports = router;
