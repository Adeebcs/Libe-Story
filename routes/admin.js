const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/adminController');
const isAdminAuthenticated = require('../middleware/adminAuth');


router.get('/', adminAuthController.showAdminLoginPage);


router.post('/login', adminAuthController.verifyAdminLogin);


router.get('/dashboard', isAdminAuthenticated, adminAuthController.showAdminDashboard);


router.get('/logout', isAdminAuthenticated, adminAuthController.adminLogout);


router.get('/userslist', isAdminAuthenticated, adminController.showUsersList);

router.get('/users', adminController.showUsersList);

router.get('/edit/:id', isAdminAuthenticated, adminController.showEditUserPage);


router.post('/edit/:id', isAdminAuthenticated, adminController.updateUser);


router.get('/block/:id', isAdminAuthenticated, adminController.blockUser);

router.get('/sales-data', adminController.getSalesData);

router.get('/msg', adminController.getQuery);

router.post('/submit-feedback', adminController.submitFeedback);

router.post('/feedback/delete', isAdminAuthenticated, adminController.deleteFeedback);


module.exports = router;
