const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// In a real scenario, we would use a specialized secret token for the bot
// For now, we allow access for development integration

router.get('/user/:phone', botController.getUserInfo);
router.get('/status/:phone', botController.getStatus);
router.post('/payment', botController.submitBotPayment);
router.post('/loan-request', botController.submitBotLoanRequest);

// Notifications
router.get('/notifications', botController.getNotifications);
router.post('/notifications/:id/sent', botController.markNotificationSent);

module.exports = router;
