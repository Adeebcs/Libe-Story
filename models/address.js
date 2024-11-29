const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    house_number: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postal_code: { type: String, required: true },
});

module.exports = mongoose.model('Address', addressSchema);
