const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/customer.controller');

router.use(requireAuth);

router.get('/', ctrl.getCustomers);
router.get('/export-csv', ctrl.exportCustomers);
router.get('/:id', ctrl.getCustomer);
router.post('/:id/notes', ctrl.addNote);
router.delete('/:id/notes/:noteId', ctrl.deleteNote);

module.exports = router;
