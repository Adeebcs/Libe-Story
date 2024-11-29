const isAdminAuthenticated = (req, res, next) => {
    if (req.session.admin) {
        return next(); 
    }
   
    res.redirect('/admin');
};

module.exports = isAdminAuthenticated;