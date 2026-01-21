const User = require("../models/User");

exports.getMostTradedPortfolios = async (req, res) => {
  try {
    const users = await User.find({ role: "participant" });

    const result = users
      .map((u) => {
        if (!u.trades || !u.trades.length) return null;

        let totalQuantity = 0;
        let totalTurnover = 0;
        const shareMap = {};

        u.trades.forEach((t) => {
          totalQuantity += t.quantity;
          totalTurnover += t.quantity * t.price; // 🔥 turnover

          shareMap[t.symbol] = (shareMap[t.symbol] || 0) + t.quantity;
        });

        const [topShare, topShareQuantity] = Object.entries(shareMap).sort(
          (a, b) => b[1] - a[1],
        )[0] || ["-", 0];

        return {
          participantId: u.participantId,
          name: u.name,
          totalTrades: u.trades.length,
          totalQuantity,
          totalTurnover,
          topShare,
          topShareQuantity,
        };
      })
      .filter(Boolean)
      // ✅ FINAL SORT WITH TIE-BREAKERS
      .sort(
        (a, b) =>
          b.totalTrades - a.totalTrades ||
          b.totalQuantity - a.totalQuantity ||
          b.totalTurnover - a.totalTurnover ||
          b.topShareQuantity - a.topShareQuantity ||
          a.participantId.localeCompare(b.participantId),
      );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
};

exports.getMostDiversifiedPortfolios = async (req, res) => {
  try {
    const users = await User.find({ role: "participant" });

    const result = users
      .map((u) => {
        if (!u.trades || !u.trades.length) return null;

        const shareMap = {};
        let totalValue = 0;

        u.trades.forEach((t) => {
          const value = t.quantity * t.price;
          totalValue += value;

          shareMap[t.symbol] =
            (shareMap[t.symbol] || 0) + value;
        });

        const values = Object.values(shareMap);
        const uniqueShares = values.length;

        const maxConcentration =
          totalValue > 0
            ? Math.max(...values.map(v => v / totalValue))
            : 0;

        return {
          participantId: u.participantId,
          name: u.name,
          uniqueShares,
          totalValue,
          maxConcentration,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.uniqueShares - a.uniqueShares ||
        a.maxConcentration - b.maxConcentration ||
        b.totalValue - a.totalValue ||
        a.participantId.localeCompare(b.participantId)
      );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Diversification analytics failed" });
  }
};