const mongoose = require('mongoose');
const userSessionSchema = new mongoose.Schema({
    userId: String,
    state: { type: String, default: '' },
    returnAddress: String,
    payAddress: String,
    updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('UserSession', userSessionSchema);
