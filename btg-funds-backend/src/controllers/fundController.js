const fundService = require('../services/fundService');

exports.subscribeFund = async (req, res, next) => {
  try {
    const result = await fundService.subscribeFund({ ...req.body, userId: req.user.userId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const result = await fundService.cancelSubscription({ ...req.body, userId: req.user.userId });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getTransactionHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await fundService.getTransactionHistory(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
