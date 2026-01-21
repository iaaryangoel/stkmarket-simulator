/* ───────────────────────────── server.js ───────────────────────────── */
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

const Share = require("./models/Share");

/* Controllers that need io */
const { setIO: setShareIO } = require("./controllers/shareController");
const { setIO: setNewsIO } = require("./controllers/newsController");

const emitLeaderboard = require("./utils/emitLeaderboard");

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

/* ----------- ROUTES ----------- */
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/shares", require("./routes/shareRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/trade", require("./routes/tradeRoutes"));
app.use("/api/market", require("./routes/marketRoutes"));
// ✅ ADMIN ANALYTICS
app.use(
  "/api/admin/analytics",
  require("./routes/adminAnalyticsRoutes")
);

app.get("/", (_, res) => res.send("API is running..."));

/* ----------- SOCKET.IO ----------- */
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST", "DELETE"] },
});

app.set("io", io); // ✅ make io available via req.app.get('io')
setShareIO(io); // ShareController socket setup
setNewsIO(io); // NewsController socket setup

/* ----------- AUTO MARKET FLUCTUATION ENGINE ----------- */

const AUTO_FLUCTUATION_INTERVAL = 30000; // 30 sec
global.marketRunning = true;

setInterval(async () => {
  try {
    if (!global.marketRunning) return;
    const shares = await Share.find();

    for (let share of shares) {
      // Skip shares locked due to news
      if (share.lockedUntil && share.lockedUntil > Date.now()) continue;

      // Small random fluctuation: -0.5% to +0.5%
      const pctChange = (Math.random() * 1 - 0.5) / 100;

      const oldPrice = share.price;
      const newPrice = +(oldPrice * (1 + pctChange)).toFixed(2);

      share.price = newPrice;
      share.change = +(pctChange * 100).toFixed(2);

      await share.save();

      // 🔴 Emit real-time update to ALL dashboards
      io.emit("share:update", share.toObject());
    }
    await emitLeaderboard(io);
  } catch (err) {
    console.error("Auto fluctuation error:", err.message);
  }
}, AUTO_FLUCTUATION_INTERVAL);

io.on("connection", (socket) => {
  console.log("⚡ client connected:", socket.id);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server & WS running on ${PORT}`));
