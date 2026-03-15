const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Middleware de segurança para o Bot
const botAuth = (req, res, next) => {
    const cleanToken = (t) => (t || "").replace(/["']/g, "").trim();
    const token = cleanToken(req.headers.authorization);
    const expectedToken = cleanToken(process.env.BOT_API_TOKEN);

    if (!expectedToken) {
        console.error(`[CRITICAL] BOT_API_TOKEN não está definido no .env do Backend!`);
    }

    if (token && token === expectedToken) {
        return next();
    }
    
    console.error(`[AUTH ERROR] Bot token mismatch!`);
    console.error(`Received: ${JSON.stringify(token)} (len: ${token ? token.length : 0})`);
    console.error(`Expected: ${JSON.stringify(expectedToken)} (len: ${expectedToken ? expectedToken.length : 0})`);
    
    return res.status(401).json({ message: 'Acesso não autorizado ao Bot.' });
};

router.get('/user/:phone', botAuth, botController.getUserInfo);
router.get('/status/:phone', botAuth, botController.getStatus);
router.post('/payment', botAuth, botController.submitBotPayment);
router.post('/loan-request', botAuth, botController.submitBotLoanRequest);

// Notifications
router.get('/notifications', botAuth, botController.getNotifications);
router.post('/notifications/:id/sent', botAuth, botController.markNotificationSent);

// Plans
// Support
router.post('/support-request', botAuth, botController.requestSupport);

module.exports = router;
