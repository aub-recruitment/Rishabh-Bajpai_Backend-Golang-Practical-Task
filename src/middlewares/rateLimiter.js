const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { getRedisClient } = require("../config/redis");
const logger = require("../utils/logger");

// Create store for rate limiting (Redis if available, memory otherwise)
let redisStore;
try {
  redisStore = new RedisStore({
    // Redis client instance
    client: getRedisClient(),
    // Key prefix for rate limit keys
    prefix: "ratelimit:",
    // Send rate limit info in headers
    sendHeaders: true,
  });
  logger.info("Using Redis store for rate limiting");
} catch (error) {
  logger.warn("Redis not available, using memory store for rate limiting");
  redisStore = undefined;
}

// Base rate limiter settings
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    store: redisStore, // Will use memory store if redisStore is undefined
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Too many requests, please try again later.",
    },
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP ${req.ip}`);
      res.status(429).json(options.message);
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiter for auth routes (login, register)
exports.authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  "Too many authentication attempts. Please try again after 15 minutes."
);

// Rate limiter for general API routes (authenticated)
exports.apiLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  "Too many requests. Please try again after 15 minutes."
);

// Rate limiter for public routes
exports.publicLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  30, // 30 requests per window
  "Too many requests from this IP. Please try again after 15 minutes."
);

// User-specific rate limiter middleware
exports.userRateLimiter = (windowMs, max) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const limiter = rateLimit({
      store: redisStore,
      windowMs,
      max,
      keyGenerator: (req) => `user:${req.user.id}`,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for user ${req.user.id}`);
        res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      },
    });

    return limiter(req, res, next);
  };
};

// IP-based rate limiter for specific routes
exports.createIpLimiter = (windowMs, max, message) => {
  return createLimiter(windowMs, max, message);
};
