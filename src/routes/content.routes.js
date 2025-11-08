const express = require("express");
const contentController = require("../controllers/contentController");
const { optionalAuth, protect, authorize } = require("../middlewares/auth");
const {
  checkPremiumAccess,
  checkQualityAccess,
  checkDeviceLimit,
} = require("../middlewares/accessControl");
const {
  dynamicRateLimiter,
  streamingLimiter,
  searchLimiter,
  createLimiter,
} = require("../middlewares/rateLimiter");

const router = express.Router();

// Public/Optional auth routes
router.get("/", optionalAuth, contentController.browseContent);
router.get("/featured", contentController.getFeaturedContent);
router.get("/trending", contentController.getTrendingContent);
router.get("/:contentId", optionalAuth, contentController.getContentById);

// Protected routes
router.post(
  "/:contentId/stream",
  protect,
  checkPremiumAccess,
  checkQualityAccess("HD"),
  checkDeviceLimit,
  contentController.streamContent
);
router.post(
  "/stream/heartbeat",
  protect,
  checkPremiumAccess,
  contentController.streamHeartbeat
);

// Admin routes
router.post("/", protect, authorize("admin"), contentController.createContent);
router.put(
  "/:contentId",
  protect,
  authorize("admin"),
  contentController.updateContent
);
router.delete(
  "/:contentId",
  protect,
  authorize("admin"),
  contentController.deleteContent
);

module.exports = router;
