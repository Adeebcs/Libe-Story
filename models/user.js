const mongoose = require('mongoose');
const Address = require('./address');

const userSchema = new mongoose.Schema({
    first_name: { type: String },
    last_name: { type: String },
    googleId: String,
    user_id: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,

    addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }], // Reference Address model
    phone: String,
    referralCode: { type: String, unique: true },
    wallet: { type: Number, default: 0 },
    blocked: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    sessionId: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);
