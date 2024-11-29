const User = require('../models/user');

const isAuthenticated = async (req, res, next) => {
    if (req.session.userId) {
        try {
           
            const user = await User.findById(req.session.userId);

            if (!user || user.blocked) {
                
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    res.redirect('/'); 
                });
            } else {
                return next(); 
            }
        } catch (err) {
            console.error('Error checking user status:', err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/'); 
    }
};

module.exports = isAuthenticated;


