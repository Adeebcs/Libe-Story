const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route to show signup page
router.get('/signup', authController.showSignupPage);

// Route to handle registration
router.post('/register', authController.registerUser);

// Route to show login page
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/home');
    }
    authController.showLoginPage(req, res);
});

// Route to handle user login
router.post('/verify', authController.verifyUser);

// Route to show home page
router.get('/home', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }
    res.render('home', { message: 'Hello, World!' });
});

// Route to handle logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.negotiate(err);
        }
        res.clearCookie('connect.sid', { path: '/' });
        res.redirect('/');
    });
});

module.exports = router;
