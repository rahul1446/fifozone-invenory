const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ── Upload directory setup ──
const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Multer storage config (disk storage) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, WEBP, GIF)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ── Controller: Upload product image ──
const uploadProductImage = [
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json(new ApiResponse(400, null, 'No image file provided'));
    }

    // Build the public URL for the uploaded file
    const host = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${host}/uploads/products/${req.file.filename}`;

    res.status(200).json(new ApiResponse(200, {
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }, 'Image uploaded successfully'));
  })
];

// ── Controller: Delete product image ──
const deleteProductImage = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  // Security: only allow filenames starting with 'product-'
  if (!filename || !filename.startsWith('product-')) {
    return res.status(400).json(new ApiResponse(400, null, 'Invalid filename'));
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  res.status(200).json(new ApiResponse(200, null, 'Image deleted successfully'));
});

module.exports = { uploadProductImage, deleteProductImage };
