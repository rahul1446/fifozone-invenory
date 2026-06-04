const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer directly to Cloudinary.
 * @param {Buffer} buffer     Raw file buffer (from multer memoryStorage)
 * @param {string} folder     Cloudinary folder name (e.g. 'fifozone/products')
 * @param {string} publicId   Optional custom public ID
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadBufferToCloudinary = (buffer, folder = 'fifozone/products', publicId) => {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },   // auto-compress
        { fetch_format: 'auto' },   // auto WebP/AVIF for supported browsers
      ],
    };
    if (publicId) options.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by its public_id.
 * @param {string} publicId  e.g. 'fifozone/products/abc123'
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('[Cloudinary] delete failed:', err.message);
  }
};

module.exports = { uploadBufferToCloudinary, deleteFromCloudinary, cloudinary };
