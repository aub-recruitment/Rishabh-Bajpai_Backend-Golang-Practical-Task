const jwt = require("jsonwebtoken");
const User = require("../models/User");
const UserSubscription = require("../models/UserSubscription");

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Not authorized to access this route. Please provide a valid token.",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User no longer exists",
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been deactivated. Please contact support.",
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(403).json({
          success: false,
          message:
            "Your account is temporarily locked due to multiple failed login attempts.",
        });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Invalid token.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in authentication",
      error: error.message,
    });
  }
};

// Optional authentication - doesn't block if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (user && user.isActive && !user.isLocked()) {
          req.user = user;
        }
      } catch (error) {
        // Token invalid or expired, continue without auth
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    next();
  };
};

// Check if user has active subscription
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const subscription = await UserSubscription.getActiveSubscription(
      req.user._id
    );

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "Active subscription required to access this content",
      });
    }

    // Attach subscription to request
    req.subscription = subscription;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking subscription",
      error: error.message,
    });
  }
};

// Check subscription access level for content
const checkContentAccess = (req, res, next) => {
  try {
    if (!req.subscription || !req.content) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const canAccess = req.subscription.plan.canAccessContent(
      req.content.accessLevel
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: `Your ${req.subscription.plan.accessLevel} plan does not have access to ${req.content.accessLevel} content. Please upgrade your subscription.`,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error checking content access",
      error: error.message,
    });
  }
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  requireSubscription,
  checkContentAccess,
};
