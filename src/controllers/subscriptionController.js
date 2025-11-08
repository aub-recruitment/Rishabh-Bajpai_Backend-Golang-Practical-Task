const SubscriptionPlan = require("../models/SubscriptionPlan");
const UserSubscription = require("../models/UserSubscription");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const subscriptionEvents = require("../events/subscriptionEvents");

/**
 * @desc    Get all subscription plans
 * @route   GET /api/v1/subscriptions/plans
 * @access  Public
 */
exports.getAllPlans = async (req, res) => {
  try {
    const { accessLevel, sortBy = "displayOrder", order = "asc" } = req.query;

    const query = { isActive: true };
    if (accessLevel) {
      query.accessLevel = accessLevel;
    }

    const sortOrder = order === "desc" ? -1 : 1;
    const plans = await SubscriptionPlan.find(query).sort({
      [sortBy]: sortOrder,
    });

    res.json({
      success: true,
      count: plans.length,
      data: { plans },
    });
  } catch (error) {
    logger.error(`Get all plans error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription plans",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get plan by ID
 * @route   GET /api/v1/subscriptions/plans/:planId
 * @access  Public
 */
exports.getPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    logger.error(`Get plan error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Subscribe to a plan
 * @route   POST /api/v1/subscriptions/subscribe
 * @access  Private
 */
exports.subscribe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { planId, paymentMethod = "card", autoRenew = true } = req.body;

    // Check if plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found or inactive",
      });
    }

    // Check for existing active subscription
    const existingSubscription = await UserSubscription.getActiveSubscription(
      req.user._id
    );
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription. Please cancel it first.",
        currentSubscription: existingSubscription,
      });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create subscription
    const subscription = await UserSubscription.create({
      user: req.user._id,
      plan: planId,
      status: "active",
      startDate,
      endDate,
      autoRenew,
      paymentDetails: {
        transactionId: `txn_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod,
        paymentDate: new Date(),
      },
      isTrial: plan.trialDays > 0,
    });

    await subscription.populate("plan");

    // Emit subscription created event
    subscriptionEvents.emit("subscription.created", {
      user: req.user,
      subscription,
      plan,
    });

    logger.info(
      `New subscription created for user: ${req.user.email}, plan: ${plan.name}`
    );

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: { subscription },
    });
  } catch (error) {
    logger.error(`Subscribe error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get subscription status
 * @route   GET /api/v1/subscriptions/status
 * @access  Private
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await UserSubscription.getActiveSubscription(
      req.user._id
    );

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          subscription: null,
          message: "No active subscription found",
        },
      });
    }

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    logger.error(`Get subscription status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Get subscription history
 * @route   GET /api/v1/subscriptions/history
 * @access  Private
 */
exports.getSubscriptionHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const subscriptions = await UserSubscription.find({ user: req.user._id })
      .populate("plan")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await UserSubscription.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      count: subscriptions.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: { subscriptions },
    });
  } catch (error) {
    logger.error(`Get subscription history error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Cancel subscription
 * @route   PUT /api/v1/subscriptions/cancel
 * @access  Private
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;

    const subscription = await UserSubscription.getActiveSubscription(
      req.user._id
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    await subscription.cancel(reason, req.user._id);

    // Emit cancellation event
    subscriptionEvents.emit("subscription.cancelled", {
      user: req.user,
      subscription,
    });

    logger.info(`Subscription cancelled for user: ${req.user.email}`);

    res.json({
      success: true,
      message: `Subscription cancelled. You can continue using the service until ${subscription.endDate.toDateString()}`,
      data: { subscription },
    });
  } catch (error) {
    logger.error(`Cancel subscription error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Create subscription plan (Admin)
 * @route   POST /api/v1/subscriptions/plans
 * @access  Admin
 */
exports.createPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const plan = await SubscriptionPlan.create({
      ...req.body,
      createdBy: req.user._id,
    });

    logger.info(
      `New subscription plan created: ${plan.name} by ${req.user.email}`
    );

    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: { plan },
    });
  } catch (error) {
    logger.error(`Create plan error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error creating plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Update subscription plan (Admin)
 * @route   PUT /api/v1/subscriptions/plans/:planId
 * @access  Admin
 */
exports.updatePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.planId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    logger.info(`Plan updated: ${plan.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Plan updated successfully",
      data: { plan },
    });
  } catch (error) {
    logger.error(`Update plan error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error updating plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @desc    Delete subscription plan (Admin)
 * @route   DELETE /api/v1/subscriptions/plans/:planId
 * @access  Admin
 */
exports.deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Check if any active subscriptions use this plan
    const activeSubscriptions = await UserSubscription.countDocuments({
      plan: plan._id,
      status: "active",
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan with ${activeSubscriptions} active subscriptions. Please deactivate it instead.`,
      });
    }

    await plan.deleteOne();

    logger.info(`Plan deleted: ${plan.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete plan error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error deleting plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
