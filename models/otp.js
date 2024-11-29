const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60, // OTP will automatically be deleted after 60 seconds (1 minute)
    },
}, { collection: 'otps' }); // Specify the collection name here

module.exports = mongoose.model('Otp', otpSchema);