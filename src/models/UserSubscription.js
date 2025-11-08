const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    cancelledAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentId: {
      type: String,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Static method to get active subscription for a user
userSubscriptionSchema.statics.getActiveSubscription = async function (userId) {
  const now = new Date();
  return this.findOne({
    user: userId,
    status: "active",
    startDate: { $lte: now },
    endDate: { $gt: now },
  }).populate("plan");
};

// Create indexes
userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });

const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema
);

module.exports = UserSubscription;
