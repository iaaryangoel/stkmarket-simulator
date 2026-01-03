const express = require("express");
const router = express.Router();

router.get("/status", (req, res) => {
  res.json({ running: global.marketRunning });
});

router.post("/toggle", (req, res) => {
  global.marketRunning = !global.marketRunning;

  const io = req.app.get("io");
  if (io) {
    io.emit("market:status", { running: global.marketRunning });
  }

  res.json({ running: global.marketRunning });
});

module.exports = router;