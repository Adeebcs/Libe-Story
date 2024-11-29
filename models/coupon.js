const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },  // Discount in percentage
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    productSpecific: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],  // Applicable to specific books
    categorySpecific: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],  // Applicable to specific categories
    isActive: { type: Boolean, default: true },
});

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;
