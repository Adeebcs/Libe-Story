// models/cart.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            quantity: { type: Number, required: true, default: 1 },
            selected: { type: Boolean, default: true }
        }
    ],
    total_price: { type: Number, default: 0 },
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Middleware to update the updated_at field on save
cartSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Cart', cartSchema);
