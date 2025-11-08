const express = require("express");
const watchHistoryController = require("../controllers/watchHistoryController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get("/continue-watching", watchHistoryController.getContinueWatching);
router.get("/recent", watchHistoryController.getRecentlyWatched);
router.put("/:contentId/progress", watchHistoryController.updateProgress);
router.get("/stats", watchHistoryController.getStats);

module.exports = router;
