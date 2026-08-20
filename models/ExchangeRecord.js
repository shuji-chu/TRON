const mongoose = require('mongoose');
const exchangeRecordSchema = new mongoose.Schema({
    txId: { type: String, unique: true },
    fromAddress: String,
    toAddress: String,
    usdtAmount: Number,
    rate: Number,
    trxAmount: Number,
    returnAddress: String,
    outTxHash: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    userId: String,
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ExchangeRecord', exchangeRecordSchema);
