const User = require("../models/User");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "profile-" +
        req.user._id +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPEG, JPG, PNG) are allowed"));
  },
}).single("picture");

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "currentSubscription"
    );

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const allowedUpdates = ["name", "bio", "phone", "preferences"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/v1/users/profile-picture
 * @access  Private
 */
exports.uploadProfilePicture = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file",
      });
    }

    try {
      // Delete old profile picture if exists
      const user = await User.findById(req.user._id);
      if (user.picture) {
        const oldPicturePath = path.join(process.cwd(), user.picture);
        try {
          await fs.unlink(oldPicturePath);
        } catch (error) {
          // Ignore if file doesn't exist
          logger.warn(`Could not delete old profile picture: ${error.message}`);
        }
      }

      // Update user with new picture URL
      const pictureUrl = `/uploads/${req.file.filename}`;
      user.picture = pictureUrl;
      await user.save();

      logger.info(`Profile picture uploaded for user: ${user.email}`);

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        data: { pictureUrl: user.picture },
      });
    } catch (error) {
      logger.error(`Upload profile picture error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error uploading profile picture",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });
};
