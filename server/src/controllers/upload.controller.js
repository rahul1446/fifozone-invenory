const multer = require('multer');
const { uploadBufferToCloudinary } = require('../utils/cloudinary');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Use memory storage — buffer goes straight to Cloudinary, nothing saved to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per image
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif).'), false);
    }
  },
});

// POST /api/upload/image  — single image upload
const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, null, 'No image file provided.'));
  }

  const result = await uploadBufferToCloudinary(
    req.file.buffer,
    'fifozone/products'
  );

  res.status(200).json(new ApiResponse(200, {
    url:       result.secure_url,   // HTTPS URL to use in product form
    publicId:  result.public_id,    // Keep this to delete later if needed
    width:     result.width,
    height:    result.height,
    format:    result.format,
    bytes:     result.bytes,
  }, 'Image uploaded successfully'));
});

// POST /api/upload/images  — multiple images (up to 10)
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json(new ApiResponse(400, null, 'No image files provided.'));
  }

  const results = await Promise.all(
    req.files.map(file =>
      uploadBufferToCloudinary(file.buffer, 'fifozone/products')
    )
  );

  const images = results.map(r => ({
    url:      r.secure_url,
    publicId: r.public_id,
    width:    r.width,
    height:   r.height,
    format:   r.format,
    bytes:    r.bytes,
  }));

  res.status(200).json(new ApiResponse(200, { images }, `${images.length} image(s) uploaded successfully`));
});

module.exports = { upload, uploadSingleImage, uploadMultipleImages };
