/* ───────────── controllers/newsController.js ───────────── */
const Share = require("../models/Share");
const News = require("../models/News");

let ioInstance; // store socket instance

exports.setIO = (io) => {
  ioInstance = io;
};

/* helper: push one ±3 % step & broadcast */
const stepMove = async (share, isPos) => {
  const delta = +(share.price * 0.0025).toFixed(2);
  const signed = isPos ? delta : -delta;

  share.price = +(share.price + signed).toFixed(2);
  share.change = +((signed / share.price) * 100).toFixed(2);
  await share.save();

  if (ioInstance) {
    ioInstance.emit("share:update", share.toObject());
  }
};

exports.createNews = async (req, res) => {
  const { headline, sentiment, affectedShares, impact } = req.body;
  if (impact < 1 || impact > 5)
    return res.status(400).json({ msg: "Impact 1‑5 only" });

  const news = await News.create({
    headline,
    sentiment,
    affectedShares,
    impact,
    timestamp: new Date(),
  });

  const isPositive = sentiment === "positive";
  const steps = impact; // 1..5
  const PRICE_STEP_INTERVAL_SEC = 10;
  const intervalMs = PRICE_STEP_INTERVAL_SEC * 1000;

  for (const name of affectedShares) {
    const share = await Share.findOne({ name });
    if (!share) continue;

    /* lock while steps run */
    const PER_IMPACT_DELAY_SEC = 30;
    const totalLockMs = steps * PER_IMPACT_DELAY_SEC * 1000;

    share.lockedUntil = new Date(Date.now() + totalLockMs);

    await share.save();

    if (ioInstance) {
      ioInstance.emit("share:update", share.toObject()); // lock update
    }

    /* immediate first step */
    await stepMove(share, isPositive);

    /* remaining scheduled steps */
    for (let i = 1; i < steps; i++) {
      setTimeout(() => {
        Share.findById(share._id).then((s) => s && stepMove(s, isPositive));
      }, i * intervalMs);
    }
  }

  if (ioInstance) {
    ioInstance.emit("news:new", news.toObject());
  }
  res.status(201).json(news);
};

/* unchanged list & delete */
exports.getNews = async (_, res) =>
  res.json(await News.find().sort({ timestamp: -1 }));
exports.deleteNews = async (req, res) => {
  const deleted = await News.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ msg: "News not found" });
  }

  // 🔥 realtime delete broadcast
  if (ioInstance) {
    ioInstance.emit("news:delete", deleted._id);
  }

  res.json({ success: true });
};

