// utils/emitLeaderboard.js
const User = require("../models/User");
const Share = require("../models/Share");

module.exports = async function emitLeaderboard(io) {
  try {
    const users = await User.find();

    const shares = await Share.find();
    const priceMap = {};
    shares.forEach((s) => (priceMap[s.name] = s.price));

    const leaderboard = users
      .filter((u) => u.participantId)
      .map((u) => {
        const holdingsValue = u.holdings.reduce((sum, h) => {
          const price = priceMap[h.symbol] || 0;
          return sum + price * h.quantity;
        }, 0);

        return {
          _id: u._id,
          name: u.name,
          participantId: u.participantId,
          totalNetWorth: Math.round(u.balance + holdingsValue),
        };
      })
      .sort((a, b) => b.totalNetWorth - a.totalNetWorth)
      .slice(0, 5);

    io.emit("leaderboard:update", leaderboard);
  } catch (err) {
    console.error("Leaderboard emit failed:", err.message);
  }
};
