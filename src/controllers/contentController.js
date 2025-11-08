const Content = require("../models/Content");
const logger = require("../utils/logger");

/**
 * @desc    Browse content with filters and pagination
 * @route   GET /api/v1/content
 * @access  Public/Private
 */
exports.browseContent = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      genre,
      search,
      sortBy = "releaseYear",
      order = "desc",
    } = req.query;

    // Build query
    const query = { isActive: true };
    if (type) query.type = type;
    if (genre) query.genre = genre;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOrder = order === "desc" ? -1 : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [content, total] = await Promise.all([
      Content.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-videoUrl"),
      Content.countDocuments(query),
    ]);

    // Send response
    res.json({
      success: true,
      data: {
        content,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Error in browseContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Get featured content
 * @route   GET /api/v1/content/featured
 * @access  Public
 */
exports.getFeaturedContent = async (req, res) => {
  try {
    const content = await Content.find({ isActive: true })
      .sort({ releaseYear: -1 })
      .limit(10)
      .select("-videoUrl");

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    logger.error("Error in getFeaturedContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Get trending content
 * @route   GET /api/v1/content/trending
 * @access  Public
 */
exports.getTrendingContent = async (req, res) => {
  try {
    const content = await Content.find({ isActive: true })
      .sort({ releaseYear: -1 })
      .limit(10)
      .select("-videoUrl");

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    logger.error("Error in getTrendingContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Get content by ID
 * @route   GET /api/v1/content/:contentId
 * @access  Public/Private
 */
exports.getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    logger.error("Error in getContentById:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Stream content
 * @route   POST /api/v1/content/:contentId/stream
 * @access  Private
 */
exports.streamContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    // Here you would typically validate user subscription and generate stream token
    res.json({
      success: true,
      data: {
        streamUrl: content.videoUrl,
        token: "dummy-stream-token",
      },
    });
  } catch (error) {
    logger.error("Error in streamContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Stream heartbeat
 * @route   POST /api/v1/content/stream/heartbeat
 * @access  Private
 */
exports.streamHeartbeat = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: "active",
      },
    });
  } catch (error) {
    logger.error("Error in streamHeartbeat:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Create new content
 * @route   POST /api/v1/content
 * @access  Admin
 */
exports.createContent = async (req, res) => {
  try {
    const content = await Content.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: { content },
    });
  } catch (error) {
    logger.error("Error in createContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Update content
 * @route   PUT /api/v1/content/:contentId
 * @access  Admin
 */
exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.contentId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    res.json({
      success: true,
      data: { content },
    });
  } catch (error) {
    logger.error("Error in updateContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

/**
 * @desc    Delete content
 * @route   DELETE /api/v1/content/:contentId
 * @access  Admin
 */
exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndDelete(req.params.contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    logger.error("Error in deleteContent:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
};
