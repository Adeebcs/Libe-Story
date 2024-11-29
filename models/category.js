const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: String,
    books: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
    }],
    deleted: {
        type: Boolean,
        default: false
    }
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;