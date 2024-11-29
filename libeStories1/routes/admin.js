const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');

// Route to show admin login page
router.get('/admin', adminAuthController.showAdminLoginPage);

// Route to handle admin login
router.post('/adminLogin', adminAuthController.verifyAdminLogin); // This should match the form action

// Route to show admin home page
router.get('/adminDashboard', (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin');
    }
    res.render('adminDashboard', { message: 'Hello Admin!' });
});

module.exports = router;
