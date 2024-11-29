// models/wishlist.js
const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }], // List of books in the wishlist
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

wishlistSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Wishlist', wishlistSchema);
