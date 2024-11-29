const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth');

// Home page
router.get('/',isAuthenticated, (req, res) => {
    res.render('home', { title: 'Home' });
});

// Signup page
router.get('/signup',isAuthenticated, (req, res) => {
    res.render('signup', { title: 'Signup' });
});

// Login page
router.get('/login',isAuthenticated, (req, res) => {
    res.render('login', { title: 'Login' });
});



module.exports = router;
