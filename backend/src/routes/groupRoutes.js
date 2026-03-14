const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/pending-approval', groupController.getPendingGroups);
router.get('/admin/stats', groupController.getAdminStats);
router.get('/admin/all', groupController.getAllGroups);
router.get('/:id', groupController.getGroupDetails);
router.get('/:id/report', groupController.getGroupReport);
router.post('/generate-code', groupController.generateJoinCode);
router.post('/join', groupController.joinGroupByCode);
router.post('/:id/status', groupController.updateGroupStatus);
router.patch('/:id/settings', groupController.updateGroupSettings);

module.exports = router;
