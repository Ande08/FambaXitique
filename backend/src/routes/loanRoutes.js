const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.use(authMiddleware);

router.post('/request', loanController.requestLoan);
router.get('/pending', loanController.getPendingLoans);
router.post('/approve/:id', upload.single('proof'), loanController.approveLoan);
router.post('/vote/:id', loanController.voteLoan);
router.get('/group/:groupId', loanController.getUserLoans);

module.exports = router;
