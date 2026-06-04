const express = require('express');
const router = express.Router();
const { upload, uploadSingleImage, uploadMultipleImages } = require('../controllers/upload.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// POST /api/upload/image   — upload one image, get back a Cloudinary URL
router.post('/image', requireAuth, upload.single('image'), uploadSingleImage);

// POST /api/upload/images  — upload up to 10 images at once
router.post('/images', requireAuth, upload.array('images', 10), uploadMultipleImages);

module.exports = router;
