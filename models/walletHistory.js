const mongoose = require('mongoose');

const walletHistorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionType: { type: String, required: true }, // e.g., "Order Payment", "Refund", "Referral Bonus"
    amount: { type: Number, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WalletHistory', walletHistorySchema);