const { body, param, query } = require("express-validator");

// User validation rules
exports.registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    ),

  body("phone")
    .optional()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage("Please provide a valid phone number"),
];

// Subscription Plan validation rules
exports.planValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Plan name is required")
    .isLength({ max: 100 })
    .withMessage("Plan name cannot exceed 100 characters"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),

  body("validity_days")
    .notEmpty()
    .withMessage("Validity days is required")
    .isInt({ min: 1 })
    .withMessage("Validity days must be at least 1"),

  body("access_level")
    .notEmpty()
    .withMessage("Access level is required")
    .isIn(["Free", "Basic", "Premium", "Ultimate"])
    .withMessage("Invalid access level"),

  body("max_devices_allowed")
    .notEmpty()
    .withMessage("Maximum devices allowed is required")
    .isInt({ min: 1 })
    .withMessage("Maximum devices must be at least 1"),

  body("resolution")
    .notEmpty()
    .withMessage("Resolution is required")
    .isIn(["480p", "720p", "1080p", "4K"])
    .withMessage("Invalid resolution"),
];

// Content validation rules
exports.contentValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("description").trim().notEmpty().withMessage("Description is required"),

  body("genre")
    .isArray()
    .withMessage("Genre must be an array")
    .notEmpty()
    .withMessage("At least one genre is required"),

  body("duration")
    .notEmpty()
    .withMessage("Duration is required")
    .isInt({ min: 1 })
    .withMessage("Duration must be at least 1 minute"),

  body("access_level")
    .notEmpty()
    .withMessage("Access level is required")
    .isIn(["Free", "Basic", "Premium"])
    .withMessage("Invalid access level"),
];

// Watch History validation rules
exports.watchHistoryValidation = [
  body("content")
    .notEmpty()
    .withMessage("Content ID is required")
    .isMongoId()
    .withMessage("Invalid content ID"),

  body("watchedDuration")
    .notEmpty()
    .withMessage("Watched duration is required")
    .isInt({ min: 0 })
    .withMessage("Watched duration must be a positive number"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["started", "in-progress", "completed"])
    .withMessage("Invalid status"),
];

// ID parameter validation
exports.idParamValidation = [
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
];

// Pagination validation
exports.paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("sort").optional().isString().withMessage("Sort must be a string"),
];

// Search validation
exports.searchValidation = [
  query("q")
    .optional()
    .isString()
    .withMessage("Search query must be a string")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters long"),

  query("genre").optional().isString().withMessage("Genre must be a string"),

  query("access_level")
    .optional()
    .isIn(["Free", "Basic", "Premium"])
    .withMessage("Invalid access level"),
];
