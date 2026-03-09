const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.get('/me', protect, authController.getMe);
router.get('/my-purchases', protect, authController.getMyPurchases);
router.get('/my-wishlist', protect, authController.getMyWishlist);
router.post('/wishlist/:id', protect, authController.toggleWishlist);

router.get('/my-cart', protect, authController.getMyCart);
router.post('/cart/:id', protect, authController.toggleCart);
router.delete('/cart', protect, authController.clearCart);

module.exports = router;
