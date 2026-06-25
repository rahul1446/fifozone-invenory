const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkEdit,
  bulkDelete,
  bulkSync,
  importCSV,
  bulkUpdateHsn
} = require('../controllers/product.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// Public listing (Read only inside internal network)
router.get('/', requireAuth, getProducts);
router.get('/:id', requireAuth, getProductById);

// Protected routes (Require Manager or Admin privileges)
router.post('/', requireAuth, requireRole(['admin', 'manager']), createProduct);
router.patch('/:id', requireAuth, requireRole(['admin', 'manager']), updateProduct);
router.post('/bulk-edit', requireAuth, requireRole(['admin', 'manager']), bulkEdit);
router.post('/bulk-sync', requireAuth, requireRole(['admin', 'manager']), bulkSync);
router.post('/import-csv', requireAuth, requireRole(['admin', 'manager']), importCSV);
router.post('/bulk-update-hsn', requireAuth, requireRole(['admin', 'manager']), bulkUpdateHsn);

// Deletions (Admin and Manager can delete)
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteProduct);
router.post('/bulk-delete', requireAuth, requireRole(['admin', 'manager']), bulkDelete);

module.exports = router;
