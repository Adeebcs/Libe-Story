const User = require('../models/user');
const moment = require('moment');
const Order = require('../models/order');
const Feedback = require('../models/feedback');

exports.showUsersList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;


        const usersCount = await User.countDocuments();


        const users = await User.find()
            .skip((page - 1) * limit)
            .limit(limit);


        const totalPages = Math.ceil(usersCount / limit);


        res.render('userslist', {
            users: users,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server Error');
    }
};


exports.showEditUserPage = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('edituser', { user });
    } catch (err) {
        next(err);
    }
};


exports.updateUser = async (req, res) => {
    try {
        const { username, email, phone, address } = req.body;
        await User.findByIdAndUpdate(req.params.id, {
            username,
            email,
            phone,
            address,
            updated_at: new Date()
        });
        res.redirect('/admin/userslist');
    } catch (err) {
        next(err);
    }
};

exports.blockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        user.blocked = !user.blocked;
        await user.save();
        res.redirect('/admin/userslist');
    } catch (err) {
        next(err);
    }
};




exports.getSalesData = async (req, res, next) => {
    const filter = req.query.filter;
    const now = moment();
    let startDate;

   
    switch (filter) {
        case '1day':
            startDate = now.clone().subtract(1, 'day');
            break;
        case 'weekly':
            startDate = now.clone().subtract(1, 'week');
            break;
        case 'monthly':
            startDate = now.clone().subtract(1, 'month');
            break;
        case 'yearly':
            startDate = now.clone().subtract(1, 'year');
            break;
        default:
            return res.status(400).json({ error: 'Invalid filter' });
    }

    try {

        const orders = await Order.find({
            created_at: { $gte: startDate.toDate(), $lte: now.toDate() }
        });

   
        const salesData = {};

       
        orders.forEach(order => {
            const orderTime = moment(order.created_at);
            const interval = orderTime.clone().minute(Math.floor(orderTime.minute() / 15) * 15);

          
            const intervalKey = interval.format('YYYY-MM-DD HH:mm');
            
          
            salesData[intervalKey] = (salesData[intervalKey] || 0) + order.totalPrice;
        });

        
        const labels = Object.keys(salesData).sort();
        const values = labels.map(label => salesData[label]);

       
        res.json({ labels, values });
    } catch (err) {
        next(err);
    }
};

exports.getQuery = async (req, res) => {
    try {
        
        const feedbackData = await Feedback.find()
            .populate('user', 'first_name last_name username email') 
            .sort({ created_at: -1 }); 
        
        res.render('complains&feedback', { feedback: feedbackData });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving feedback and complaints');
    }
};
exports.deleteFeedback = async (req, res) => {
    try {
        const feedbackId = req.body.feedbackId;
        await Feedback.findByIdAndDelete(feedbackId);
        res.redirect('/admin/feedback'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting feedback');
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const { feedback, complaint } = req.body;
        const userId = req.user._id; 

        const newFeedback = new Feedback({
            user: userId,
            feedback,
            complaint,
        });

        await newFeedback.save();

        res.redirect('/feedback-thank-you'); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error submitting feedback');
    }
};