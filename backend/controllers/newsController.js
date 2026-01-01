/* ───────────── controllers/newsController.js ───────────── */
const Share  = require('../models/Share');
const News   = require('../models/News');

let ioInstance; // store socket instance

exports.setIO = (io) => {
  ioInstance = io;
};

/* helper: push one ±1 % step & broadcast */
const stepMove = async (share, isPos) => {
  const delta  = +(share.price * 0.01).toFixed(2);
  const signed = isPos ? delta : -delta;

  share.price  = +(share.price + signed).toFixed(2);
  share.change = +(signed / share.price * 100).toFixed(2);
  await share.save();

  if (ioInstance) {
    ioInstance.emit('share:update', share.toObject());
  }
};

exports.createNews = async (req, res) => {
  const { headline, sentiment, affectedShares, impact } = req.body;
  if (impact < 1 || impact > 5)
    return res.status(400).json({ msg: 'Impact 1‑5 only' });

  const news = await News.create({
    headline, sentiment, affectedShares, impact, timestamp: new Date()
  });

  const isPositive = sentiment === 'positive';
  const steps      = impact;             // 1..5
  const intervalMs = 0.5 * 60_000;         // 0.5 minutes

  for (const name of affectedShares) {
    const share = await Share.findOne({ name });
    if (!share) continue;

    /* lock while steps run */
    share.lockedUntil = new Date(Date.now() + (steps - 1) * intervalMs);
    await share.save();
    
    if (ioInstance) {
      ioInstance.emit('share:update', share.toObject()); // lock update
    }

    /* immediate first step */
    await stepMove(share, isPositive);

    /* remaining scheduled steps */
    for (let i = 1; i < steps; i++) {
      setTimeout(() => {
        Share.findById(share._id).then(s => s && stepMove(s, isPositive));
      }, i * intervalMs);
    }
  }

  res.status(201).json(news);
};

/* unchanged list & delete */
exports.getNews    = async (_, res) => res.json(await News.find().sort({ timestamp: -1 }));
exports.deleteNews = async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  res.json({ msg: 'News deleted' });
};
