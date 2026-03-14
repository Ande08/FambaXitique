const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Middleware de segurança para o Bot
const botAuth = (req, res, next) => {
    const token = req.headers.authorization;
    if (token === process.env.BOT_API_TOKEN) {
        return next();
    }
    return res.status(401).json({ message: 'Acesso não autorizado ao Bot.' });
};

router.get('/user/:phone', botAuth, botController.getUserInfo);
router.get('/status/:phone', botAuth, botController.getStatus);
router.post('/payment', botAuth, botController.submitBotPayment);
router.post('/loan-request', botAuth, botController.submitBotLoanRequest);

// Notifications
router.get('/notifications', botAuth, botController.getNotifications);
router.post('/notifications/:id/sent', botAuth, botController.markNotificationSent);

module.exports = router;
