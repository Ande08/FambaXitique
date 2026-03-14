const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, planController.getPlans);
router.get('/my-subscription', authMiddleware, planController.getMySubscription);
router.put('/:id', authMiddleware, planController.updatePlan);

module.exports = router;
