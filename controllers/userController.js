const dotenv = require("dotenv")
dotenv.config();
const User = require('../models/user');
const Address = require('../models/address');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Book = require('../models/book');
const bcrypt = require('bcrypt');
const Razorpay = require('razorpay');
const pdf = require('html-pdf-chrome'); 
const WalletHistory = require('../models/walletHistory');
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET, 
});


const Feedback = require('../models/feedback');

exports.getUserSettings = async (req, res, next) => {
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId).populate('addresses');
        res.render('userSettings', { user, errorMsg: null });
    } catch (err) {
        next(err);
    }
};

exports.updateUserSettings = async (req, res, next) => {
    const userId = req.session.userId;
    const { first_name, last_name, username, email, phone } = req.body;

    try {
        
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.render('userSettings', {
                user: req.body,
                errorMsg: 'Email is already associated with another account.'
            });
        }

        await User.findByIdAndUpdate(userId, {
            first_name,
            last_name,
            username,
            email,
            phone
        });
        res.redirect('/settings');
    } catch (err) {
        next(err);
    }
};



exports.getAddAddressForm = (req, res) => {
    res.render('addAddress');
};


exports.addNewAddress = async (req, res, next) => {
    const userId = req.session.userId;
    const { name, house_number, street, city, state, country, postal_code } = req.body;

    try {
        const address = new Address({
            name,
            house_number,
            street,
            city,
            state,
            country,
            postal_code
        });

        await address.save();
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        user.addresses.push(address._id);
        await user.save();
        res.redirect('/settings');
    } catch (err) {
        next(err);
    }
};


exports.getEditAddressForm = async (req, res, next) => {
    const addressId = req.params.addressId;

    try {
        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.render('editAddress', { address });
    } catch (err) {
        next(err);
    }
};


exports.updateAddress = async (req, res, next) => {
    const addressId = req.params.addressId;
    const { name, house_number, street, city, state, country, postal_code } = req.body;

    try {
        const address = await Address.findByIdAndUpdate(
            addressId,
            {
                name,
                house_number,
                street,
                city,
                state,
                country,
                postal_code
            },
            { new: true }
        );

        if (!address) {
            return res.status(404).send('Address not found');
        }

        res.redirect('/settings');
    } catch (err) {
        next(err);
    }
};


exports.deleteAddress = async (req, res, next) => {
    const userId = req.session.userId;
    const addressId = req.params.addressId;

    try {
        await Address.findByIdAndDelete(addressId);
        await User.findByIdAndUpdate(userId, {
            $pull: { addresses: addressId }
        });

        res.redirect('/settings');
    } catch (err) {
        next(err);
    }
};

exports.getCheckoutPage = async (req, res, next) => {
    try {
        const userId = req.session.userId;

        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.book',
            model: 'Book',
            strictPopulate: false
        });

        if (!cart || cart.items.length === 0) {
            return res.status(404).send('Your cart is empty.');
        }

        const user = await User.findById(userId).populate('addresses');
        if (!user) {
            return res.status(404).send('User not found.');
        }

        const totalItems = cart.items.length;
        const totalPrice = cart.items.reduce((total, item) => {
            return total + (item.quantity * (item.book.sale_price || item.book.regular_price));
        }, 0);

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: totalPrice * 100,
            currency: 'INR',
            receipt: 'order_rcptid_11'
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.render('checkout', { 
            user, 
            cart, 
            totalItems, 
            totalPrice, 
            razorpayOrderId: razorpayOrder.id,
            phone: req.body.phone || '',
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
            isRetry: false 
        });
    } catch (err) {
        next(err);
    }
};

const createOrder = async ({ userId, items, address, phone, actualTotal, totalPrice, paymentMethod, appliedCoupon, status }) => {
    return new Order({
        user: userId,
        items: items.map(item => ({
            book: item.book._id,
            quantity: item.quantity,
        })),
        address,
        phone,
        actualTotal,
        totalPrice,
        paymentMethod,
        appliedCoupon,
        status,
    });
};

exports.checkout = async (req, res, next) => {
    const userId = req.session.userId;
    const { address, phone, payment, paymentStatus } = req.body;

    try {
       
        const cart = await Cart.findOne({ user: userId }).populate('items.book');
        if (!cart || cart.items.length === 0) {
            return res.status(404).send('No items in cart to checkout.');
        }

        let actualTotal = 0;
        let totalPrice = 0;

     
        for (const item of cart.items) {
            const bookPrice = item.book.sale_price || item.book.regular_price;
            actualTotal += item.quantity * item.book.regular_price;
            totalPrice += item.quantity * bookPrice;
        }

        let orderStatus = 'Order Placed';
        let orderPaymentStatus = paymentStatus === 'Failed' ? 'Failed' : 'Success';

       
        if (payment === 'Wallet Pay') {
            const user = await User.findById(userId);
            if (user.wallet >= totalPrice) {
             
                user.wallet -= totalPrice;
                await user.save();

               
                const order = await createOrder({
                    userId,
                    items: cart.items,
                    address,
                    phone,
                    actualTotal,
                    totalPrice,
                    paymentMethod: payment,
                    appliedCoupon: req.session.coupon ? req.session.coupon._id : null,
                    status: orderStatus,
                    paymentStatus: 'Success'
                });

                await order.save();

                await WalletHistory.create({
                    user: user._id,
                    transactionType: 'Order Payment',
                    amount: -totalPrice,
                    orderId: order._id,
                });
            } else {
                return res.status(400).send('Insufficient wallet balance.');
            }
        } else if (payment === 'Online Payment') {
          
            if (paymentStatus === 'Failed') {
                orderStatus = 'Pending';
                orderPaymentStatus = 'Failed';
            }
        }

       
        const order = await createOrder({
            userId,
            items: cart.items,
            address,
            phone,
            actualTotal,
            totalPrice,
            paymentMethod: payment,
            appliedCoupon: req.session.coupon ? req.session.coupon._id : null,
            status: orderStatus,
            paymentStatus: orderPaymentStatus,
        });

        await order.save();

    
        cart.items = [];
        await cart.save();

        req.session.orderId = order._id; 

        
        if (orderPaymentStatus === 'Failed') {
            return res.redirect('/orders'); 
        } else {
            return res.redirect('/order/success'); 
        }
    } catch (err) {
        console.error("Checkout error:", err);
        next(err);
    }
};


exports.orderSuccess = async (req, res, next) => {
    const userId = req.session.userId;
    const orderId = req.session.orderId;

    try {
        const order = await Order.findById(orderId).populate('items.book');
        if (!order) {
            return res.status(404).send('Order not found.');
        }

       
        await Cart.updateOne({ user: userId }, { $set: { items: [] } });

      
        for (const item of order.items) {
            const book = await Book.findById(item.book);
            if (book) {
                book.sale_price = book.regular_price;
                book.stock -= item.quantity;
                await book.save();
            }
        }

      
        delete req.session.orderId;

       
        return res.render('orderSuccess', { order });
    } catch (err) {
        console.error("Order success error:", err);
        next(err);
    }
};


exports.retry_getCheckoutPage = async (req, res, next) => {
    try {
        const userId = req.session.userId; 
        const orderId = req.body.orderId;
        req.session.orderId = orderId;

       
        const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.book');

        if (!order) {
            return res.status(404).send('Order not found.');
        }

        const user = await User.findById(userId).populate('addresses');
        if (!user) {
            return res.status(404).send('User not found.');
        }

        
        const totalItems = order.items.length;
        const totalPrice = order.totalPrice;

      
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: totalPrice * 100,
            currency: 'INR',
            receipt: `order_rcptid_${orderId}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

      
        res.render('checkout', {
            user, 
            items: order.items,
            totalItems,
            totalPrice,
            razorpayOrderId: razorpayOrder.id,
            phone: order.phone || '',
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
            isRetry: true 
        });
    } catch (err) {
        next(err);
    }
};

exports.retryCheckOut = async (req, res, next) => {
    const userId = req.session.userId;
    const orderId = req.session.orderId;
    const { address, phone, payment, paymentStatus } = req.body;

    try {
        
        const order = await Order.findById(orderId).populate('items.book');
        if (!order) {
            return res.status(404).send('Order not found.');
        }

       
        order.phone = phone || order.phone;
        order.address = address || order.address;

      
        if (payment === 'Wallet Pay') {
            const user = await User.findById(userId);
            if (user.wallet >= order.totalPrice) {
        
                user.wallet -= order.totalPrice;
                await user.save();

          
                order.status = 'Order Placed';
                

                await WalletHistory.create({
                    user: user._id,
                    transactionType: 'Order Payment',
                    amount: -order.totalPrice,
                    orderId: order._id,
                });

            } else {
                return res.status(400).send('Insufficient wallet balance.');
            }
        } else if (payment === 'Online Payment') {
            if (paymentStatus === 'Success') {
                console.log('Payment status:', paymentStatus);
                order.status = 'Order Placed';
                
            } else {
                return res.status(400).send('Payment failed. Please try again.');
            }
        } else if (payment === 'Pay on Delivery') {
          
            order.status = 'Order Placed';
          
        }

      
        await order.save();

      
        delete req.session.orderId;

       
        return res.redirect('/order/success/1');
    } catch (err) {
        console.error("Error in retryCheckOut:", err);
        next(err);
    }
};

exports.orderSuccess2 = async (req, res, next) => {
    try {
       
        delete req.session.orderId;

        return res.render('orderSuccess');
    } catch (err) {
        console.error("Error displaying order success:", err);
        next(err);
    }
};




exports.getUserOrders = async (req, res, next) => {
    const userId = req.session.userId;
    const sortOption = req.query.sort || '';
    const page = parseInt(req.query.page) || 1; 
    const limit = 7; 

    try {
        let sortQuery = {};

 
        if (sortOption === 'dateDesc') {
            sortQuery = { created_at: -1 };
        } else if (sortOption === 'dateAsc') {
            sortQuery = { created_at: 1 };
        } else if (sortOption === 'priceDesc') {
            sortQuery = { totalPrice: -1 };
        } else if (sortOption === 'priceAsc') {
            sortQuery = { totalPrice: 1 };
        } else if (sortOption === 'status') {
            sortQuery = { status: 1 };
        }

        
        const orderCount = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(orderCount / limit);
        const orders = await Order.find({ user: userId })
            .populate('items.book')
            .sort(sortQuery)
            .skip((page - 1) * limit)
            .limit(limit);

        
        res.render('orders', { 
            orders,
            totalPages,
            currentPage: page,
            sort: sortOption
        });
    } catch (err) {
        next(err);
    }
};



exports.cancelOrder = async (req, res, next) => {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId).populate('items.book').populate('user'); 
        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.status !== 'Order Placed') {
            return res.status(400).send('Order cannot be canceled');
        }

     
        for (let item of order.items) {
            const book = await Book.findById(item.book._id);
            book.stock += item.quantity;
            await book.save();
        }

        order.status = 'Cancelled';
        await order.save();


        if (order.paymentMethod === 'Wallet Pay' || order.paymentMethod === 'Online Payment') {
            const user = order.user;
            user.wallet += order.totalPrice;
            await user.save();

         
            await WalletHistory.create({
                user: user._id,
                transactionType: 'Refund',
                amount: order.totalPrice,
                orderId: order._id
            });
        }

  
        res.redirect('/orders');
    } catch (err) {
        next(err);
    }
};


exports.getWalletPage = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

       
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const skip = (page - 1) * limit;


        const history = await WalletHistory.find({ user: userId })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 }); 

      
        const totalCount = await WalletHistory.countDocuments({ user: userId });

       
        res.render('wallet', {
            user,
            history,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit), 
        });
    } catch (err) {
        next(err);
    }
};




exports.addToWallet = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { amount } = req.body; 
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        
        const options = {
            amount: amount * 100, 
            currency: 'INR',
            receipt: `wallet_${userId}_${Date.now()}`,
        };

        
        const order = await razorpay.orders.create(options);

        res.render('addToWallet', { orderId: order.id, amount, user });
    } catch (err) {
        next(err);
    }
};

exports.handleWalletPaymentSuccess = async (req, res, next) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

     
        const isSignatureValid = razorpay.utils.verifyPaymentSignature({
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature
        });

        if (!isSignatureValid) {
            return res.status(400).send('Invalid payment signature');
        }

     
        const amount = req.body.amount;
        user.wallet = (user.wallet || 0) + parseFloat(amount);
        await user.save();

        await WalletHistory.create({
            user: user._id,
            transactionType: 'Add Funds',
            amount: parseFloat(amount),
        });
       
        res.redirect('home');
    } catch (err) {
        next(err);
    }
};


exports.createWalletOrder = async (req, res, next) => {
    const { amount } = req.body;
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const receipt = `wallet_${new Date().getTime()}`.substring(0, 40);

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: receipt,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.json({
            orderId: razorpayOrder.id,
            currency: razorpayOrder.currency,
            amount: razorpayOrder.amount
        });
    } catch (err) {
        next(err);
    }
};

exports.verifyWalletPayment = async (req, res, next) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount } = req.body;
    const userId = req.session.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.wallet += parseFloat(amount);
        await user.save();
        await WalletHistory.create({
            user: user._id,
            transactionType: 'Wallet Top-Up',
            amount: parseFloat(amount),
            createdAt: new Date()
        });

      
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.getWalletHistory = async (req, res, next) => {
    const userId = req.session.userId;

    try {
        const walletHistory = await WalletHistory.find({ user: userId }).sort({ date: -1 });
        res.render('walletHistory', { history: walletHistory });
    } catch (err) {
        next(err);
    }
};

exports.accountPage = async (req, res, next) => {
    try {
        const user = await User.findOne({ _id: req.session.userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.render('account', { user });
    } catch (error) {
        console.error('Error fetching account data:', error.message);
        next(error);
    }
};

exports.getChangePasswordForm = (req, res) => {
    res.render('changePassword', { msg: '' });
};

exports.updatePassword = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { currentPassword, npassword, cpassword } = req.body;

        const userData = await User.findById(userId);
        if (!userData) {
            return res.render('changePassword', { msg: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, userData.password);

        if (passwordMatch) {
            if (npassword === cpassword) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(npassword, salt);
                
                userData.password = hashedPassword;
                await userData.save();

                return res.render('changePassword', { msg: 'Password updated successfully' });
            } else {
                return res.render('changePassword', { msg: 'New passwords do not match' });
            }
        } else {
            return res.render('changePassword', { msg: 'Current password is incorrect' });
        }
    } catch (error) {
        console.error('Error updating password:', error);
        return res.render('changePassword', { msg: 'Error updating password' });
    }
};

exports.downloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;

      
        const order = await Order.findById(orderId).populate('items.book').populate('user');

        if (!order) {
            return res.status(404).send('Order not found');
        }

 
        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        table, th, td { border: 1px solid black; padding: 10px; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Invoice</h1>
                    <p>Order ID: ${order._id}</p>
                    <p>Customer Name: ${order.user ? order.user.first_name + ' ' + order.user.last_name : 'N/A'}</p>
                    <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
                    <hr />
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.book.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${item.book.regular_price}</td>
                                    <td>₹${(item.book.regular_price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <h3>Total Amount: ₹${order.totalPrice.toFixed(2)}</h3>
                </body>
            </html>
        `;

       
        const pdfOptions = {
            format: 'A4'
        };

     
        const pdfBuffer = await pdf.create(html, pdfOptions).then(pdf => pdf.toBuffer());

       
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);
        res.send(pdfBuffer);

    } catch (err) {
        next(err);
    }
};



exports.getContactSupport = (req, res) => {
    res.render('support', {
        address: '1234 Example St, Citytown, CT 56789',
        phone: '(123) 456-7890'
    });
};

exports.submitContactSupport = async (req, res) => {
    const { question } = req.body;
    const userId = req.session.userId;  

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User not logged in' });
    }

    try {
 
        const newFeedback = new Feedback({
            feedback: 'N/A', 
            question: question,
            user: userId,
        });

  
        await newFeedback.save();

        
        res.redirect('/contact-support');
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'An error occurred while submitting your question' });
    }
};



exports.getSubmitFeedback = async (req, res) => {
    try {
     
        const userId = req.session.userId || req.query.userId; 
        if (!userId) {
            return res.redirect('/login'); 
        }

        const user = await User.findById(userId).select('_id first_name last_name');
        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('feedback', { user }); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading feedback page');
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const { feedback, complaint, user_id } = req.body;

        
        const newFeedback = new Feedback({
            feedback,
            complaint,
            user: user_id,
            created_at: new Date(),
        });

      
        await newFeedback.save();

        res.redirect('/thank-you'); 
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).send('Error submitting feedback');
    }
};
