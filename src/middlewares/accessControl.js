/**
 * Access control middleware for managing content access based on subscription levels
 */

const UserSubscription = require("../models/UserSubscription");
const { AppError } = require("./errorHandler");

/**
 * Check if user has access to premium content
 */
exports.checkPremiumAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: "active",
      endDate: { $gt: new Date() },
    }).populate("plan");

    if (!subscription || !subscription.plan) {
      throw new AppError("Premium subscription required", 403);
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has access to specific content quality level
 */
exports.checkQualityAccess = (requiredQuality) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401);
      }

      const subscription = await UserSubscription.findOne({
        user: req.user._id,
        status: "active",
        endDate: { $gt: new Date() },
      }).populate("plan");

      if (!subscription || !subscription.plan) {
        throw new AppError("Active subscription required", 403);
      }

      const qualityLevels = {
        SD: 0,
        HD: 1,
        "4K": 2,
      };

      const userQualityLevel =
        qualityLevels[subscription.plan.qualityLevel] || 0;
      const requiredQualityLevel = qualityLevels[requiredQuality] || 0;

      if (userQualityLevel < requiredQualityLevel) {
        throw new AppError(
          `Subscription plan with ${requiredQuality} quality required`,
          403
        );
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has reached their device limit
 */
exports.checkDeviceLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: "active",
      endDate: { $gt: new Date() },
    }).populate("plan");

    if (!subscription || !subscription.plan) {
      throw new AppError("Active subscription required", 403);
    }

    // In a real application, you would track active devices
    // For now, we'll assume the device count is within limits
    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};
