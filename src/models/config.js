const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Config schema
const configSchema = new Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true },
    system_id: { type: String, required: true },
    password: { type: String, required: true },
    system_type: { type: String, default: '' },
    version: { type: String, default: '3.4' },
    tls: { type: Boolean, default: false }
});

// Create the Config model from the schema
const Config = mongoose.model('Config', configSchema);

module.exports = Config;
