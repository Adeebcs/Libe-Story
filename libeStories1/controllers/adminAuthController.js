const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');

exports.showAdminLoginPage = (req, res) => {
    res.render('adminLogin', { msg: null });
};

exports.verifyAdminLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch) {
                req.session.admin = admin.username;
                return res.redirect('/adminDashboard');
            }
        }
        res.render('adminLogin', { msg: 'Invalid username or password' });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.adminLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Failed to logout');
        }
        res.redirect('/admin');
    });
};

exports.showAdminDashboard = (req, res) => {
    if (!req.session.admin) {
        return res.redirect('/admin');
    }
    res.render('adminDashboard', { message: 'Hello Admin!' });
};



