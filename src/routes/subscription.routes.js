const express = require("express");
const { body } = require("express-validator");
const subscriptionController = require("../controllers/subscriptionController");
const { protect, authorize } = require("../middlewares/auth");
const {
  dynamicRateLimiter,
  createLimiter,
} = require("../middlewares/rateLimiter");

const router = express.Router();

// Public routes
router.get("/plans", subscriptionController.getAllPlans);
router.get("/plans/:planId", subscriptionController.getPlanById);

// Protected routes
router.use(protect);
router.post(
  "/subscribe",
  [
    body("planId")
      .notEmpty()
      .withMessage("Plan ID is required")
      .isMongoId()
      .withMessage("Invalid plan ID"),
    body("autoRenew").optional().isBoolean(),
  ],
  subscriptionController.subscribe
);

router.get("/status", subscriptionController.getSubscriptionStatus);
router.get("/history", subscriptionController.getSubscriptionHistory);
router.put("/cancel", subscriptionController.cancelSubscription);

// Admin routes
router.post("/plans", authorize("admin"), subscriptionController.createPlan);
router.put(
  "/plans/:planId",
  authorize("admin"),
  subscriptionController.updatePlan
);
router.delete(
  "/plans/:planId",
  authorize("admin"),
  subscriptionController.deletePlan
);

module.exports = router;
