/* ───────── routes/shareRoutes.js ───────── */
const express = require("express");
const router = express.Router();
const c = require("../controllers/shareController");

router.get("/", c.getShares);
router.post("/", c.createShare);
router.put("/", c.updateShares);
router.delete("/:id", c.deleteShare);

router.post("/:id/bump", c.bumpByPercent);

module.exports = router;
