const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const subscriptionController = require('../controllers/subscriptionController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/subscriptions/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, planController.getPlans);
router.get('/my-subscription', authMiddleware, planController.getMySubscription);
router.put('/:id', authMiddleware, planController.updatePlan);

// Payment Methods (Super Admin managed)
router.get('/payment-methods', authMiddleware, subscriptionController.getAdminPaymentMethods);
router.post('/payment-methods', authMiddleware, subscriptionController.createAdminPaymentMethod);

// Upgrade Requests
router.post('/upgrade', authMiddleware, upload.single('proof'), subscriptionController.requestUpgrade);
router.get('/pending-upgrades', authMiddleware, subscriptionController.getPendingUpgrades);
router.post('/approve-upgrade/:id', authMiddleware, subscriptionController.approveUpgrade);
router.get('/subscriptions', authMiddleware, subscriptionController.getAllSubscriptions);

module.exports = router;
