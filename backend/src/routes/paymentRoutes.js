const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

router.use(authMiddleware);

router.post('/submit', upload.single('proof'), paymentController.submitPayment);
router.post('/approve/:paymentId', paymentController.approvePayment);
router.get('/pending', paymentController.getPendingPayments);
router.get('/user/:userId/group/:groupId', paymentController.getUserPaymentHistory);
router.get('/receipt/:paymentId', paymentController.downloadReceipt);

module.exports = router;
