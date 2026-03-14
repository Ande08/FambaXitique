const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/group/:groupId', invoiceController.getUserInvoices);
router.post('/group/:groupId/bulk-generate', invoiceController.bulkGenerateInvoices);
router.get('/user/:userId/group/:groupId', invoiceController.getMemberInvoices);

module.exports = router;
