
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    feedback: { type: String, required: true },
    complaint: { type: String },
    question: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', feedbackSchema);