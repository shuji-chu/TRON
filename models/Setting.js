const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    usdtReceiveAddress: { type: String, default: '' },
    qrCodeFileId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Setting', settingSchema);