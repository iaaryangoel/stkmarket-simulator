// routes/tradeRoutes.js
const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

router.post('/', tradeController.handleTrade);

module.exports = router;
