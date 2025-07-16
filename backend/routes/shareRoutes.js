/* ───────── routes/shareRoutes.js ───────── */
const express = require('express');
const router  = express.Router();
const c       = require('../controllers/shareController');

router.get('/',  c.getShares);
router.post('/', c.createShare);
router.put('/',  c.updateShares);
router.delete('/:id', c.deleteShare);

/* manual ±2 % */
router.post('/:id/inc', c.incShare);
router.post('/:id/dec', c.decShare);

module.exports = router;
