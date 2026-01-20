// controllers/tradeController.js
const User = require("../models/User");
const Share = require("../models/Share");
const emitLeaderboard = require("../utils/emitLeaderboard");

const addTrade = (user, record) => {
  user.trades.unshift(record);
  if (user.trades.length > 50) user.trades.pop();
};

exports.handleTrade = async (req, res) => {
  const {
    type,
    action = "buy",
    participantId,
    shareSymbol,
    quantity,
    price,
    buyerParticipantId,
    sellerParticipantId,
  } = req.body;

  try {
    if (type === "direct") {
      const user = await User.findOne({ participantId });
      const share = await Share.findOne({ name: shareSymbol });
      if (!user || !share)
        return res.status(404).json({ message: "User or share not found" });

      if (action === "buy") {
        const cost = share.price * quantity;
        if (user.balance < cost)
          return res.status(400).json({ message: "Insufficient balance" });
        user.balance -= cost;
        const h = user.holdings.find((h) => h.symbol === share.name);
        if (h) {
          const tot = h.quantity + quantity;
          h.avgPrice = (h.avgPrice * h.quantity + cost) / tot;
          h.quantity = tot;
        } else {
          user.holdings.push({
            symbol: share.name,
            quantity,
            avgPrice: share.price,
          });
        }
        addTrade(user, {
          action: "buy",
          symbol: share.name,
          quantity,
          price: share.price,
          counterpart: "Market",
        });
        await user.save();
        const io = req.app.get("io");
        io.emit("user:update", [user]);
        await emitLeaderboard(io);
        return res.json({ message: "Buy completed", updatedUsers: [user] });
      }

      if (action === "sell") {
        const h = user.holdings.find((h) => h.symbol === share.name);
        if (!h || h.quantity < quantity)
          return res.status(400).json({ message: "Not enough shares to sell" });
        const proceeds = share.price * quantity;
        user.balance += proceeds;
        h.quantity -= quantity;
        if (h.quantity === 0)
          user.holdings = user.holdings.filter((x) => x.symbol !== share.name);
        addTrade(user, {
          action: "sell",
          symbol: share.name,
          quantity,
          price: share.price,
          counterpart: "Market",
        });
        await user.save();
        const io = req.app.get("io");
        io.emit("user:update", [user]);
        await emitLeaderboard(io);
        return res.json({ message: "Sell completed", updatedUsers: [user] });
      }

      return res.status(400).json({ message: "Invalid action" });
    }

    if (type === "p2p") {
      const buyer = await User.findOne({ participantId: buyerParticipantId });
      const seller = await User.findOne({ participantId: sellerParticipantId });
      const share = await Share.findOne({ name: shareSymbol });
      if (!buyer || !seller || !share)
        return res.status(404).json({ message: "User or share missing" });

      const total = price * quantity;
      if (buyer.balance < total)
        return res.status(400).json({ message: "Buyer Insufficient balance" });

      const sh = seller.holdings.find((h) => h.symbol === share.name);
      if (!sh || sh.quantity < quantity)
        return res.status(400).json({ message: "Seller lacks shares" });

      buyer.balance -= total;
      const bh = buyer.holdings.find((h) => h.symbol === share.name);
      if (bh) {
        const tot = bh.quantity + quantity;
        bh.avgPrice = (bh.avgPrice * bh.quantity + total) / tot;
        bh.quantity = tot;
      } else {
        buyer.holdings.push({ symbol: share.name, quantity, avgPrice: price });
      }
      addTrade(buyer, {
        action: "buy",
        symbol: share.name,
        quantity,
        price,
        counterpart: seller.name,
      });

      seller.balance += total;
      sh.quantity -= quantity;
      if (sh.quantity === 0)
        seller.holdings = seller.holdings.filter(
          (h) => h.symbol !== share.name
        );
      addTrade(seller, {
        action: "sell",
        symbol: share.name,
        quantity,
        price,
        counterpart: buyer.name,
      });

      await Promise.all([buyer.save(), seller.save()]);
      const io = req.app.get("io");
      io.emit("user:update", [buyer, seller]);
      await emitLeaderboard(io);
      return res.json({
        message: "P2P trade completed",
        updatedUsers: [buyer, seller],
      });
    }

    res.status(400).json({ message: "Invalid trade type" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Trade failed", error: err.message });
  }
};
