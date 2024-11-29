const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const isAuthenticated = require('../middleware/auth');
const passport = require('passport');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const Address = require('../models/address');
const Feedback = require('../models/feedback');


// LoggedInAccess middleware
const preventLoggedInAccess = (req, res, next) => {
     
    if (req.session.userId) {
        return res.redirect('/home');
    }
    next();
};

router.get('/', preventLoggedInAccess, authController.showLoginPage);

router.get('/signup', preventLoggedInAccess, authController.showSignupPage);

router.post('/register', authController.registerUser);

router.post('/verifyOtp', authController.verifyOtp);

router.post('/resendOtp', authController.resendOtp);



//  user login
router.post('/verify', authController.verifyUser);

router.get('/forgotPassword', authController.showForgotPasswordPage);

router.post('/forgotPassword', authController.forgotPassword);

router.post('/verifyPasswordOtp', authController.verifyPasswordOtp);

router.post('/resetPassword', authController.resetPassword);


router.get('/home', isAuthenticated, (req, res) => {
     
    res.render('home', { message: 'Hello, World!' }); 
});


router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.negotiate(err);
        }
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/');
    });
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    
    req.session.user = req.user; 
    req.session.userId = req.user._id; 
    res.redirect('/home'); 
});
router.get('/account', userController.accountPage);

router.get('/settings', userController.getUserSettings);

router.post('/settings/update', userController.updateUserSettings);

router.get('/settings/address/new', userController.getAddAddressForm);

router.post('/settings/address/new', userController.addNewAddress);

router.get('/settings/address/edit/:addressId', userController.getEditAddressForm);

router.post('/settings/address/edit/:addressId', userController.updateAddress);

router.post('/settings/address/delete/:addressId', userController.deleteAddress);

router.get('/checkout', userController.getCheckoutPage);

router.post('/checkout', userController.checkout);

router.get('/order/success', userController.orderSuccess);

router.get('/orders', userController.getUserOrders);

router.post('/orders/cancel', userController.cancelOrder);

router.get('/orders/download-invoice/:orderId', userController.downloadInvoice);

router.get('/wallet', userController.getWalletPage); 

router.post('/wallet/add', userController.addToWallet); 

router.post('/wallet/payment-success', userController.handleWalletPaymentSuccess);

router.post('/wallet/order', userController.createWalletOrder);// Create Razorpay order for wallet top-up

router.post('/wallet/verify', userController.verifyWalletPayment);

router.get('/wallet/history', userController.getWalletHistory);

router.get('/change-password', userController.getChangePasswordForm);

router.post('/update-password', userController.updatePassword);

router.get('/contact-support', userController.getContactSupport);

router.post('/contact-support', userController.submitContactSupport);

router.get('/submit-feedback', userController.getSubmitFeedback);

router.post('/submit-feedback', userController.submitFeedback);

router.post("/checkout/retry", userController.retry_getCheckoutPage);

router.post("/checkout/again", userController.retryCheckOut);

router.get('/order/success/1', userController.orderSuccess2);


module.exports = router;
