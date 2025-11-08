const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const { protect } = require("../middlewares/auth");
const { uploadLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get("/profile", userController.getProfile);
router.put(
  "/profile",
  [
    body("name").optional().trim().isLength({ min: 2, max: 100 }),
    body("bio").optional().trim().isLength({ max: 500 }),
    body("phone")
      .optional()
      .trim()
      .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/),
  ],
  userController.updateProfile
);

// Disabled file upload feature for now
// router.post(
//   "/profile-picture",
//   uploadLimiter,
//   userController.uploadProfilePicture
// );

module.exports = router;
