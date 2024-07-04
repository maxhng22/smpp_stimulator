const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const logSchema = new Schema({
  source_address: {
    type: String,
    required: true
  },
  destination_address: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  datetime: {
    type: Date,
    default: Date.now // Automatically set to the current date and time
  }
});

// Create the Log model from the schema
const Log = mongoose.model('Log', logSchema);

module.exports = Log;
