const express = require('express');
const router = express.Router();
const { uploadProductImage, deleteProductImage } = require('../controllers/upload.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// POST /api/upload/product-image — upload a single product image
router.post('/product-image', requireAuth, uploadProductImage);

// DELETE /api/upload/product-image/:filename — remove an uploaded image
router.delete('/product-image/:filename', requireAuth, deleteProductImage);

module.exports = router;
