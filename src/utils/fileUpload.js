const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('./ApiError');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Upload to Cloudinary
const uploadToCloudinary = async (file, folder = 'products') => {
  try {
    const cloudinary = require('../config/cloudinary');
    
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `ecommerce/${folder}`,
      use_filename: true,
      unique_filename: true
    });

    // Delete local file after upload
    fs.unlinkSync(file.path);

    return {
      public_id: result.public_id,
      url: result.secure_url,
      originalname: file.originalname
    };
  } catch (error) {
    // Delete local file if upload fails
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new ApiError(500, 'Error uploading to Cloudinary: ' + error.message);
  }
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const cloudinary = require('../config/cloudinary');
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary
};