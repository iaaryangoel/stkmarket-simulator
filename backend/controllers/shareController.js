/* ───────────── controllers/shareController.js ───────────── */
const Share = require('../models/Share');

let ioInstance;

/* --- SOCKET.IO Setup from server.js --- */
exports.setIO = (io) => {
  ioInstance = io;
};

/* --- Socket Emission Helper --- */
const emitShare = (type, payload) => {
  if (ioInstance) {
    ioInstance.emit(`share:${type}`, payload);
  }
};

/* -------------------- GET all shares -------------------- */
exports.getShares = async (_, res) => {
  const shares = await Share.find();
  res.json(shares);
};

/* -------------------- CREATE a share -------------------- */
exports.createShare = async (req, res) => {
  const { name, price } = req.body;
  if (!name || price <= 0) return res.status(400).json({ msg: 'Invalid data' });

  if (await Share.findOne({ name }))
    return res.status(400).json({ msg: 'Share already exists' });

  const share = await Share.create({ name, price, change: 0 });
  emitShare('add', share.toObject());
  res.status(201).json(share);
};

/* -------------------- BULK UPDATE -------------------- */
exports.updateShares = async (req, res) => {
  const { updates } = req.body;
  const result = await Promise.all(
    updates.map(u =>
      Share.findOneAndUpdate(
        { name: u.name },
        { price: u.price, change: u.change },
        { new: true }
      ).then(s => {
        if (s) emitShare('update', s.toObject());
        return s;
      })
    )
  );
  res.json({ updated: result });
};

/* -------------------- DELETE -------------------- */
exports.deleteShare = async (req, res) => {
  const deleted = await Share.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ msg: 'Share not found' });

  emitShare('delete', req.params.id); // emit deletion event
  res.json({ msg: 'Share deleted' });
};

/* -------------------- ±2% Manual Bump -------------------- */
const TWO_PC = 0.02;

const bump = async (req, res, dir) => {
  const share = await Share.findById(req.params.id);
  if (!share) return res.status(404).json({ msg: 'Share not found' });

  // Respect locked state (e.g., due to news)
  if (share.lockedUntil && share.lockedUntil > Date.now()) {
    return res.status(423).json({ msg: 'Share is locked by news' });
  }

  const mult = 1 + (dir === 'inc' ? TWO_PC : -TWO_PC);
  share.price = +(share.price * mult).toFixed(2);
  share.change = dir === 'inc' ? +2 : -2;
  await share.save();

  emitShare('update', share.toObject());
  res.json(share);
};

exports.incShare = (req, res) => bump(req, res, 'inc');
exports.decShare = (req, res) => bump(req, res, 'dec');
