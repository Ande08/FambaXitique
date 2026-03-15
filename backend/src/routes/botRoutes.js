const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Middleware de segurança para o Bot
const botAuth = (req, res, next) => {
    const cleanToken = (t) => (t || "").replace(/["']/g, "").trim();
    const token = cleanToken(req.headers.authorization);
    const expectedToken = cleanToken(process.env.BOT_API_TOKEN);

    if (token && token === expectedToken) {
        return next();
    }
    
    console.error(`[AUTH ERROR] Bot token mismatch!`);
    console.error(`Received: [${token ? token.substring(0, 5) + '...' : 'null'}] (len: ${token ? token.length : 0})`);
    console.error(`Expected: [${expectedToken ? expectedToken.substring(0, 5) + '...' : 'null'}] (len: ${expectedToken ? expectedToken.length : 0})`);
    
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
router.get('/plans', botAuth, botController.getAllPlans);

module.exports = router;
