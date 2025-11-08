const mongoose = require("mongoose");

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastPosition: {
      type: Number,
      default: 0,
      min: 0,
    },
    watchDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
watchHistorySchema.index({ user: 1, content: 1 }, { unique: true });
watchHistorySchema.index({ watchedAt: -1 });
watchHistorySchema.index({ completed: 1 });

// Static methods
watchHistorySchema.statics.getContinueWatching = function (userId, limit = 10) {
  return this.find({
    user: userId,
    completed: false,
    progress: { $gt: 0, $lt: 100 },
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("content", "-videoUrl")
    .lean();
};

watchHistorySchema.statics.getRecentlyWatched = function (userId, limit = 20) {
  return this.find({
    user: userId,
  })
    .sort({ watchedAt: -1 })
    .limit(limit)
    .populate("content", "-videoUrl")
    .lean();
};

module.exports = mongoose.model("WatchHistory", watchHistorySchema);
