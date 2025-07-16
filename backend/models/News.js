const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  headline: String,
  sentiment: { type: String, enum: ['positive', 'negative'] },
  affectedShares: [String],
  impact: Number,
  timestamp: Date
});

module.exports = mongoose.model('News', newsSchema);
