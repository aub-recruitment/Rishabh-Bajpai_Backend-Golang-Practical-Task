const WatchHistory = require("../models/WatchHistory");
const Content = require("../models/Content");
const logger = require("../utils/logger");

exports.getContinueWatching = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const continueWatching = await WatchHistory.getContinueWatching(
      req.user._id,
      limit
    );

    res.json({
      success: true,
      count: continueWatching.length,
      data: { continueWatching },
    });
  } catch (error) {
    logger.error(`Get continue watching error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching continue watching list",
    });
  }
};

exports.getRecentlyWatched = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const recentlyWatched = await WatchHistory.getRecentlyWatched(
      req.user._id,
      limit
    );

    res.json({
      success: true,
      count: recentlyWatched.length,
      data: { recentlyWatched },
    });
  } catch (error) {
    logger.error(`Get recently watched error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching recently watched",
    });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const { watchedDuration, totalDuration, sessionId, deviceId, quality } =
      req.body;

    if (!watchedDuration || !totalDuration || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "watchedDuration, totalDuration, and sessionId are required",
      });
    }

    const content = await Content.findById(req.params.contentId);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: "Content not found",
      });
    }

    let watchHistory = await WatchHistory.findOne({
      user: req.user._id,
      content: content._id,
      sessionId,
    });

    if (watchHistory) {
      await watchHistory.updateProgress(watchedDuration);
    } else {
      watchHistory = await WatchHistory.create({
        user: req.user._id,
        content: content._id,
        watchedDuration,
        totalDuration,
        sessionId,
        device: {
          deviceId,
          deviceType: req.body.deviceType,
        },
        quality,
      });
    }

    res.json({
      success: true,
      message: "Watch progress updated",
      data: { watchHistory },
    });
  } catch (error) {
    logger.error(`Update progress error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error updating watch progress",
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await WatchHistory.getUserStats(req.user._id);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    logger.error(`Get watch stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error fetching watch statistics",
    });
  }
};
