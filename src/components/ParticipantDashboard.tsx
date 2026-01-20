// ParticipantDashboard.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Newspaper,
  IdCard,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const socket = io(import.meta.env.VITE_SOCKET_URL);
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0 },
};

const ParticipantDashboard = ({ user }) => {
  const [shares, setShares] = useState([]);
  const [news, setNews] = useState([]);
  const [portfolio, setPortfolio] = useState({ balance: 0, holdings: [] });
  const [trades, setTrades] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchAll = async () => {
    const [newsRes, userRes] = await Promise.all([
      axiosInstance.get("/news"),
      axiosInstance.get(`/users/${user._id}`),
    ]);

    setNews(newsRes.data);
    setPortfolio({
      balance: userRes.data.balance || 0,
      holdings: userRes.data.holdings || [],
    });
    setTrades(userRes.data.trades || []);
  };

  useEffect(() => {
    if (!user?._id) return;
    fetchAll();
    fetchLeaderboard();

    // Real-time share updates
    socket.on("share:update", (updatedShare) => {
      setShares((prev) =>
        prev.some((s) => s._id === updatedShare._id)
          ? prev.map((s) => (s._id === updatedShare._id ? updatedShare : s))
          : [...prev, updatedShare]
      );
    });

    socket.on("user:update", (updatedUsers) => {
      const me = updatedUsers.find((u) => u._id === user._id);
      if (!me) return;

      // Update portfolio instantly
      setPortfolio({
        balance: me.balance,
        holdings: me.holdings,
      });

      // Update recent trades also
      setTrades(me.trades || []);
    });

    socket.on("share:delete", (id) => {
      setShares((prev) => prev.filter((s) => s._id !== id));
    });

    // 🔔 Toast: New share added
    socket.on("share:add", (share) => {
      toast({
        title: "📈 New Share Added",
        description: `${share.name} listed at ₹${share.price}`,
      });
    });

    socket.on("market:status", ({ running }) => {
      toast({
        title: running ? "📊 Market Resumed" : "⛔ Market Paused",
      });
    });

    socket.on("news:delete", (deletedId) => {
      setNews((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((n) => n._id !== deletedId);
      });

      toast({
        title: "🗑️ News Removed",
        description: "A news item was removed by admin",
      });
    });

    // 📰 Toast: Breaking news
    socket.on("news:new", (news) => {
      toast({
        title: "📰 Breaking News",
        description: news.headline,
      });

      // optional: prepend news instantly
      setNews((prev) => [news, ...prev]);
    });

    axiosInstance.get("/shares").then((res) => setShares(res.data));

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("share:add");
      socket.off("news:new");
      socket.off("news:delete");
      socket.off("market:status");
      socket.off("user:update"); // 👈 ADD THIS
    };
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await axiosInstance.get("/users/leaderboard");
      setLeaderboard(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const calculatePortfolioValue = () => {
    const holdingsValue = portfolio.holdings.reduce((total, holding) => {
      const share = shares.find((s) => s.name === holding.symbol);
      return total + (share ? share.price * holding.quantity : 0);
    }, 0);
    return portfolio.balance + holdingsValue;
  };

  const calculateProfitLoss = (holding) => {
    const share = shares.find((s) => s.name === holding.symbol);
    if (!share) return 0;
    return (share.price - holding.avgPrice) * holding.quantity;
  };

  if (!user) return <div>Loading dashboard...</div>;

  const mid = Math.ceil(shares.length / 2);
  const leftShares = shares.slice(0, mid);
  const rightShares = shares.slice(mid);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <Card
            className="
    relative overflow-hidden rounded-2xl border
    bg-gradient-to-br from-orange-950/90 via-orange-900 to-slate-900
    text-orange-100
    shadow-[0_0_30px_rgba(251,146,60,0.35)]
  "
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="border-t-4 border-orange-500">
                Cash Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{portfolio.balance?.toLocaleString() ?? "0"}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <Card
            className="
    relative overflow-hidden rounded-2xl border
    bg-gradient-to-br from-emerald-950/90 via-emerald-900 to-slate-900
    text-emerald-100
    shadow-[0_0_30px_rgba(16,185,129,0.35)]
  "
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="border-t-4 border-emerald-500">
                Portfolio Value
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{calculatePortfolioValue().toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <Card
            className="
    relative overflow-hidden rounded-2xl border
    bg-gradient-to-br from-purple-950/90 via-purple-900 to-slate-900
    text-purple-100
    shadow-[0_0_30px_rgba(168,85,247,0.35)]
  "
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="border-t-4 border-purple-500">
                Participant ID
              </CardTitle>
              <IdCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {user.participantId ?? "-"}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        {/* Holdings */}
        <Card>
          <CardHeader>
            <CardTitle>My Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.holdings.length === 0 ? (
              <p className="text-gray-500">No holdings yet</p>
            ) : (
              <div className="relative -mx-4 sm:mx-0 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b hover:bg-slate-50 transition">
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Quantity</th>
                      <th className="text-right p-2">Avg Price</th>
                      <th className="text-right p-2">Current Price</th>
                      <th className="text-right p-2">Total Invested</th>
                      <th className="text-right p-2">Current Value</th>
                      <th className="text-right p-2">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding, index) => {
                      const share = shares.find(
                        (s) => s.name === holding.symbol
                      );
                      const profitLoss = calculateProfitLoss(holding);
                      const invested = holding.avgPrice * holding.quantity;
                      const currentValue = share
                        ? share.price * holding.quantity
                        : 0;
                      return (
                        <tr
                          key={index}
                          className="border-b hover:bg-slate-50 transition"
                        >
                          <td className="p-2 font-medium">{holding.symbol}</td>
                          <td className="text-right p-2">{holding.quantity}</td>
                          <td className="text-right p-2">
                            ₹{holding.avgPrice.toFixed(2)}
                          </td>
                          <td className="text-right p-2">
                            ₹{share?.price?.toFixed(2) ?? "N/A"}
                          </td>
                          <td className="text-right p-2 font-medium">
                            ₹{invested.toFixed(2)}
                          </td>

                          <td className="text-right p-2 font-medium">
                            ₹{currentValue.toFixed(2)}
                          </td>

                          <td
                            className={`text-right p-2 ${
                              profitLoss >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            <motion.span
                              key={profitLoss}
                              initial={{ scale: 1.2 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.3 }}
                              className={`px-2 py-0.5 rounded text-xs font-semibold
  ${
    profitLoss >= 0
      ? "bg-green-950/60 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
      : "bg-red-950/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
  }
`}
                            >
                              ₹{profitLoss.toFixed(2)}
                            </motion.span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT TABLE */}
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-right px-2 py-1">Price</th>
                    <th className="text-right px-2 py-1">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {leftShares.map((share) => (
                    <tr
                      key={share._id}
                      className={`
    border-b h-8
    ${
      share.change >= 0
        ? "bg-gradient-to-r from-green-950/40 via-transparent to-transparent"
        : "bg-gradient-to-r from-red-950/40 via-transparent to-transparent"
    }
    hover:bg-slate-800/40 transition
  `}
                    >
                      <td className="px-2 py-1 font-medium">{share.name}</td>
                      <motion.td
                        key={share.price}
                        initial={{ opacity: 0.5, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-right px-2 py-1"
                      >
                        ₹{share.price.toFixed(2)}
                      </motion.td>

                      <td
                        className={`text-right px-2 py-1 ${
                          share.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {share.change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-medium
                      ${
                        share.change >= 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                          >
                            {share.change.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* RIGHT TABLE */}
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-right px-2 py-1">Price</th>
                    <th className="text-right px-2 py-1">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {rightShares.map((share) => (
                    <tr
                      key={share._id}
                      className={`
    border-b h-8
    ${
      share.change >= 0
        ? "bg-gradient-to-r from-green-950/40 via-transparent to-transparent"
        : "bg-gradient-to-r from-red-950/40 via-transparent to-transparent"
    }
    hover:bg-slate-800/40 transition
  `}
                    >
                      <td className="px-2 py-1 font-medium">{share.name}</td>
                      <td className="text-right px-2 py-1">
                        ₹{share.price.toFixed(2)}
                      </td>
                      <td
                        className={`text-right px-2 py-1 ${
                          share.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {share.change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-medium
                      ${
                        share.change >= 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                          >
                            {share.change.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        {/* ➕ Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length === 0 ? (
              <p className="text-gray-500">No trades yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b hover:bg-slate-50 transition">
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Action</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Traded With</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 10).map((t, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="p-2 text-sm">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <Badge
                            variant="outline"
                            className={
                              t.action === "buy"
                                ? "border-green-500 text-green-600"
                                : "border-red-500 text-red-600"
                            }
                          >
                            {t.action.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2">{t.symbol}</td>
                        <td className="p-2 text-right">{t.quantity}</td>
                        <td className="p-2 text-right">
                          ₹{t.price.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">{t.counterpart}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        {/* News */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Market News
            </CardTitle>
          </CardHeader>

          <CardContent>
            {news.length === 0 ? (
              <p className="text-gray-500">No news available</p>
            ) : (
              <div className="space-y-4">
                {news.map((item, index) => (
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className={`border-l-4 pl-4 ${
                      index === 0 && "shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        ? "border-red-500"
                        : "border-blue-500"
                    }`}
                  >
                    {/* Headline row */}
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <h4 className="font-semibold text-sm sm:text-base leading-snug">
                        {item.headline}
                      </h4>

                      {index === 0 && (
                        <Badge
                          className="
  bg-red-600 text-white text-[10px] sm:text-xs
  animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]
"
                        >
                          BREAKING
                        </Badge>
                      )}
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 120 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>🏆 Live Leaderboard (Top 5 Participants)</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b hover:bg-slate-50 transition">
                      <th className="p-2 text-left">Rank</th>
                      <th className="p-2 text-left">Participant</th>
                      <th className="p-2 text-right">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((p, index) => (
                      <tr
                        className={`
    border-b transition
    ${
      index === 0
        ? "bg-gradient-to-r from-yellow-900/40 to-transparent"
        : index === 1
          ? "bg-gradient-to-r from-slate-700/40 to-transparent"
          : index === 2
            ? "bg-gradient-to-r from-amber-900/40 to-transparent"
            : "hover:bg-slate-800/40"
    }
  `}
                      >
                        <td className="p-2">
                          <span
                            className={`w-7 h-7 inline-flex items-center justify-center rounded-full text-xs font-bold
  ${
    index === 0
      ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.6)]"
      : index === 1
        ? "bg-slate-400 text-black"
        : index === 2
          ? "bg-amber-300 text-black"
          : "bg-slate-700 text-slate-300"
  }
`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td className="p-2 font-medium">
                          {p.name}
                          <div className="text-xs text-slate-500">
                            {p.participantId}
                          </div>
                        </td>

                        <td className="p-2 text-right">
                          ₹{p.totalNetWorth.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ParticipantDashboard;
