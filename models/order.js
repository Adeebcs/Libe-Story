const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            quantity: { type: Number, required: true },
        }
    ],
    status: {
        type: String,
        enum: ['Order Placed', 'Shipped', 'Delivered', 'Payment Failed','Pending', 'Cancelled', 'Returned', 'Return requested'],
        default: 'Order Placed',
    },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address', required: true },
    phone: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    actualTotal: { type: Number, required: true },  // Total price without discounts
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    paymentMethod: { type: String, enum: ['Pay on Delivery', 'Online Payment', 'Wallet Pay'], required: false }, 
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
