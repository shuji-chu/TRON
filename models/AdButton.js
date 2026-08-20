const mongoose = require('mongoose');

const adButtonSchema = new mongoose.Schema({
    text: { type: String, required: true },
    url: { type: String, default: '' },
    order: { type: Number, default: 0 }
});

module.exports = mongoose.model('AdButton', adButtonSchema);