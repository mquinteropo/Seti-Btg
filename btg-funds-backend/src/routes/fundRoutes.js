const express = require('express');
const router = express.Router();

const fundController = require('../controllers/fundController');
const { authenticate } = require('../middlewares/auth');

router.post('/subscribe', authenticate, fundController.subscribeFund);
router.post('/cancel', authenticate, fundController.cancelSubscription);
router.get('/history/:userId', authenticate, fundController.getTransactionHistory);

module.exports = router;
