const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a subscription plan name"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please provide a subscription plan description"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a subscription plan price"],
    },
    duration: {
      type: Number,
      required: [true, "Please provide subscription duration in days"],
    },
    features: [
      {
        type: String,
      },
    ],
    maxDevices: {
      type: Number,
      default: 1,
    },
    maxProfiles: {
      type: Number,
      default: 1,
    },
    qualityLevel: {
      type: String,
      enum: ["SD", "HD", "4K"],
      default: "SD",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
