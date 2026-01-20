const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.get('/leaderboard', userController.getLeaderboard);
router.get('/', userController.getAllUsers);
router.put('/', userController.updateUsers);
router.get('/:id', userController.getUserById);
router.post('/penalty/:participantId', userController.applyPenalty);

module.exports = router;

