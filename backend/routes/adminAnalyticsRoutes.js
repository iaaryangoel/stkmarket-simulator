const express = require("express");
const router = express.Router();
const analyticsController = require(
  "../controllers/adminAnalyticsController"
);

// 🔐 later you can add adminAuth middleware here
router.get(
  "/most-traded",
  analyticsController.getMostTradedPortfolios
);

router.get(
  "/most-diversified",
  analyticsController.getMostDiversifiedPortfolios
);


module.exports = router;
