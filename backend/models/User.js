// models/User.js
const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  date:        { type: Date,   default: Date.now },
  action:      { type: String, enum: ['buy', 'sell'], required: true },
  symbol:      { type: String, required: true },
  quantity:    { type: Number, required: true },
  price:       { type: Number, required: true },
  counterpart: { type: String, required: true } // 'Market' or other participant's name
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:          String,
  email:         { type: String, unique: true },
  password:      String,
  role:          String,
  participantId: String,
  balance:       { type: Number, default: 10000 },
  holdings: [
    { symbol: String, quantity: Number, avgPrice: Number }
  ],
  trades: { type: [tradeSchema], default: [] } // ← newly added
});

module.exports = mongoose.model('User', userSchema);
