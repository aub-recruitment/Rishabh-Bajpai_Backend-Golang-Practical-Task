const UserSubscription = require("../models/UserSubscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const { AppError } = require("../middlewares/errorHandler");
const emailService = require("./emailService");
const sessionService = require("./sessionService");
const logger = require("../utils/logger");

class SubscriptionService {
  // Create a new subscription
  async createSubscription(userId, planId) {
    try {
      // Get the subscription plan
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.is_active) {
        throw new AppError("Invalid or inactive subscription plan", 400);
      }

      // Check if user has an active subscription
      const activeSubscription = await UserSubscription.findOne({
        user: userId,
        status: "active",
      });

      if (activeSubscription) {
        throw new AppError("User already has an active subscription", 400);
      }

      // Calculate expiry date
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration);

      // Create subscription
      const subscription = await UserSubscription.create({
        user: userId,
        plan: planId,
        status: "active",
        startDate: new Date(),
        endDate,
        autoRenew: true,
      });

      return subscription;
    } catch (error) {
      logger.error(`Error creating subscription: ${error.message}`);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId, subscriptionId) {
    try {
      const subscription = await UserSubscription.findOne({
        _id: subscriptionId,
        user: userId,
        status: "active",
      });

      if (!subscription) {
        throw new AppError("Active subscription not found", 404);
      }

      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      await subscription.save();

      // End all active sessions
      await sessionService.endAllSessions(userId);

      return subscription;
    } catch (error) {
      logger.error(`Error cancelling subscription: ${error.message}`);
      throw error;
    }
  }

  // Renew subscription
  async renewSubscription(userId, planId) {
    try {
      const currentSubscription = await UserSubscription.findOne({
        user: userId,
        status: { $in: ["active", "expired"] },
      }).sort({ createdAt: -1 });

      if (currentSubscription && currentSubscription.status === "active") {
        throw new AppError("Cannot renew an active subscription", 400);
      }

      return this.createSubscription(userId, planId);
    } catch (error) {
      logger.error(`Error renewing subscription: ${error.message}`);
      throw error;
    }
  }

  // Check subscription status and access level
  async checkSubscriptionAccess(userId, requiredAccessLevel) {
    try {
      const subscription = await UserSubscription.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      if (!subscription) {
        return false;
      }

      // Check if subscription has expired
      if (new Date() > subscription.expiresAt) {
        subscription.status = "expired";
        await subscription.save();
        return false;
      }

      const accessLevels = {
        Free: 0,
        Basic: 1,
        Premium: 2,
        Ultimate: 3,
      };

      return (
        accessLevels[subscription.plan.access_level] >=
        accessLevels[requiredAccessLevel]
      );
    } catch (error) {
      logger.error(`Error checking subscription access: ${error.message}`);
      throw error;
    }
  }

  // Send subscription expiry notifications
  async sendExpiryNotifications() {
    try {
      const warningDays = 3; // Send notification 3 days before expiry
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + warningDays);

      const expiringSubscriptions = await UserSubscription.find({
        status: "active",
        expiresAt: {
          $gte: new Date(),
          $lte: warningDate,
        },
        expiryNotificationSent: false,
      }).populate(["user", "plan"]);

      for (const subscription of expiringSubscriptions) {
        await emailService.sendSubscriptionExpiryNotification(
          subscription.user,
          subscription
        );

        subscription.expiryNotificationSent = true;
        await subscription.save();
      }

      logger.info(
        `Sent ${expiringSubscriptions.length} subscription expiry notifications`
      );
    } catch (error) {
      logger.error(`Error sending expiry notifications: ${error.message}`);
      throw error;
    }
  }

  // Check device limit
  async checkDeviceLimit(userId) {
    try {
      const subscription = await UserSubscription.findOne({
        user: userId,
        status: "active",
      });

      if (!subscription) {
        throw new AppError("No active subscription found", 404);
      }

      const activeSessionCount = await sessionService.getActiveSessionCount(
        userId
      );
      return activeSessionCount < subscription.maxDevices;
    } catch (error) {
      logger.error(`Error checking device limit: ${error.message}`);
      throw error;
    }
  }

  // Get user's subscription history
  async getSubscriptionHistory(userId) {
    try {
      const history = await UserSubscription.find({ user: userId })
        .populate("plan")
        .sort({ createdAt: -1 });

      return history;
    } catch (error) {
      logger.error(`Error getting subscription history: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SubscriptionService();
