const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  name:   { type: String, unique: true },
  price:  { type: Number, required: true },
  change: { type: Number, default: 0 },

  /* ── NEW ──  “cool‑down” window after news‑driven moves.
     While lockedUntil > Date.now() the +/‑ buttons are disabled. */
  lockedUntil: { type: Date, default: null }
});

module.exports = mongoose.model('Share', shareSchema);
