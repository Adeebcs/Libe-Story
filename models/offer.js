const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['general', 'product', 'category'], // Offer can be general, product-specific, or category-specific
        required: true 
    },
    discountPercentage: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    productSpecific: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book' 
    }], // Array of specific products to which the offer applies
    categorySpecific: [{ 
        type: String, 
        ref: 'Category' 
    }], // Array of specific categories to which the offer applies
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('offer', offerSchema);
