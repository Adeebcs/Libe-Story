const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

// Signup page
router.get('/signup', (req, res) => {
    res.render('signup', { title: 'Signup' });
});

// Login page
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

module.exports = router;
