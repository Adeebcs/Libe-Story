const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    book_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    author: { type: String, required: true },
    chapters: { type: Number, required: true },
    synopsis: { type: String, required: true },
    regular_price: { type: Number, required: true },
    sale_price: { type: Number },
    image1: { type: String },
    image2: { type: String },
    image3: { type: String },
    discountPercentage: { type: Number },
    catdiscountPercentage: { type: Number },
    review: [
        {
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            username: String, 
            rating: Number,
            comment: String
        }
    ],
    stock: { type: Number, required: true },
    category: [String],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }, 
    ratings: { type: Number,default: 0  },
    highlights: [String],
    popularity: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    related_products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Book', bookSchema);
