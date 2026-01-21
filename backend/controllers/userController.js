const User = require("../models/User");
const Share = require("../models/Share");
const emitLeaderboard = require("../utils/emitLeaderboard");


exports.getLeaderboard = async (req, res) => {
  try {
    const io = req.app.get("io");

    const shares = await Share.find();
    const users = await User.find({ role: "participant" });

    const leaderboard = users.map((user) => {
      const holdingsValue = user.holdings.reduce((sum, holding) => {
        const share = shares.find((s) => s.name === holding.symbol);
        return sum + (share ? share.price * holding.quantity : 0);
      }, 0);

      return {
        name: user.name,
        participantId: user.participantId,
        totalNetWorth: +(user.balance + holdingsValue).toFixed(2),
      };
    });

    const sorted = leaderboard.sort(
      (a, b) => b.totalNetWorth - a.totalNetWorth
    );

    io.emit("leaderboard:update", sorted.slice(0, 15));
    res.json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
};


exports.registerUser = async (req, res) => {
  const { name, email, password, role, secretKey } = req.body;

  try {
    // Secret key validation based on role
    if (role === "admin" && secretKey !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid Admin Secret Key" });
    }
    if (role === "employee" && secretKey !== process.env.EMPLOYEE_SECRET) {
      return res.status(403).json({ message: "Invalid Employee Secret Key" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const participantId =
      role === "participant"
        ? `PID${Math.floor(Math.random() * 10000)}`
        : undefined;

    const user = await User.create({
      name,
      email,
      password,
      role,
      participantId,
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
};

exports.updateUsers = async (req, res) => {
  const { updated } = req.body;
  const result = await Promise.all(
    updated.map((u) => User.findByIdAndUpdate(u._id, u, { new: true })),
  );
  res.status(200).json({ updated: result });
};

// ───────── Apply Penalty to Participant ─────────
exports.applyPenalty = async (req, res) => {
  try {
    const { participantId } = req.params;
    const PENALTY_AMOUNT = 100000; // 1 Lakh

    const user = await User.findOne({ participantId });

    if (!user)
      return res.status(404).json({ message: "Participant not found" });

    if (user.role !== "participant")
      return res
        .status(400)
        .json({ message: "Penalty allowed only for participants" });

    user.balance = Math.max(0, user.balance - PENALTY_AMOUNT);
    await user.save();

    const io = req.app.get("io");
    await emitLeaderboard(io);

    res.json({
      message: `Penalty of ₹${PENALTY_AMOUNT} applied`,
      updatedBalance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to apply penalty" });
  }
};
