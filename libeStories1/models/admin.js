const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});

const Admin = mongoose.model('Admin', adminSchema, 'adminlog'); // Explicitly set the collection name

module.exports = Admin;
