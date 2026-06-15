// src/components/ParticipantDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
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
  Activity,
  Sparkles,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

const socket = io(import.meta.env.VITE_SOCKET_URL);

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100 as const },
  },
};

const ParticipantDashboard = ({ user }) => {
  const { theme } = useTheme();
  const [shares, setShares] = useState([]);
  const [news, setNews] = useState([]);
  const [portfolio, setPortfolio] = useState({ balance: 0, holdings: [] });
  const [trades, setTrades] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showAllNews, setShowAllNews] = useState(false);

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

    socket.on("share:update", (updatedShare) => {
      setShares((prev) =>
        prev.some((s) => s._id === updatedShare._id)
          ? prev.map((s) => (s._id === updatedShare._id ? updatedShare : s))
          : [...prev, updatedShare],
      );
    });

    socket.on("user:update", (updatedUsers) => {
      const me = updatedUsers.find((u) => u._id === user._id);
      if (!me) return;
      setPortfolio({
        balance: me.balance,
        holdings: me.holdings,
      });
      setTrades(me.trades || []);
    });

    socket.on("share:delete", (id) => {
      setShares((prev) => prev.filter((s) => s._id !== id));
    });

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

    socket.on("news:new", (newsItem) => {
      toast({
        title: "📰 Breaking News",
        description: newsItem.headline,
      });
      setNews((prev) => [newsItem, ...prev]);
    });

    socket.on("leaderboard:update", (data) => {
      setLeaderboard(Array.isArray(data) ? data : []);
    });

    axiosInstance.get("/shares").then((res) => setShares(res.data));

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("share:add");
      socket.off("news:new");
      socket.off("news:delete");
      socket.off("market:status");
      socket.off("user:update");
      socket.off("leaderboard:update");
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

  const portfolioValue = useMemo(() => {
    const holdingsValue = portfolio.holdings.reduce((total, holding) => {
      const share = shares.find((s) => s.name === holding.symbol);
      return total + (share ? share.price * holding.quantity : 0);
    }, 0);
    return portfolio.balance + holdingsValue;
  }, [portfolio.balance, portfolio.holdings, shares]);

  const calculateProfitLoss = (holding) => {
    const share = shares.find((s) => s.name === holding.symbol);
    if (!share) return 0;
    return (share.price - holding.avgPrice) * holding.quantity;
  };

  const getRankIcon = (index) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  if (!user) return <div>Loading dashboard...</div>;

  const mid = Math.ceil(shares.length / 2);
  const leftShares = shares.slice(0, mid);
  const rightShares = shares.slice(mid);
  const isDark = theme === "dark";

  const displayedNews = showAllNews ? news : news.slice(0, 5);
  const hasMoreNews = news.length > 5;

  // For light theme, use original classes; for dark theme, add dark-specific classes
  const darkCardClass = isDark
    ? "bg-[#02060E]/80 backdrop-blur-sm border-[#9303C5]/30 shadow-xl"
    : "";
  const darkTableHeaderClass = isDark
    ? "bg-gradient-to-r from-[#2a0140]/50 to-transparent text-gray-300"
    : "bg-slate-50 text-slate-600";
  const darkBorderClass = isDark ? "border-[#9303C5]/20" : "";
  const darkHoverClass = isDark ? "hover:bg-[#2a0140]/30" : "hover:bg-slate-50";
  const darkTextClass = isDark ? "text-white" : "";
  const darkMutedTextClass = isDark ? "text-gray-400" : "text-gray-500";
  const darkPriceClass = isDark ? "text-[#d8b4fe]" : "";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Animated Background Effect for Dark Mode Only */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-40 w-80 h-80 bg-[#9303C5]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 -right-40 w-80 h-80 bg-[#2a0140]/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#9303C5]/5 rounded-full blur-3xl" />
        </div>
      )}

      {/* Portfolio Overview Cards - Light theme unchanged, dark theme enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cash Balance Card - Dark Theme Enhanced */}
        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }}>
          <Card
            className={`
      relative overflow-hidden rounded-2xl border transition-all duration-500
      ${
        isDark
          ? "bg-gradient-to-br from-[#02060E] via-[#1a0033] to-[#4a0163] border-[#9303C5]/50 shadow-[0_8px_32px_rgba(147,3,197,0.3)] hover:shadow-[0_8px_32px_rgba(147,3,197,0.5)] hover:scale-105"
          : "bg-gradient-to-br from-orange-950/90 via-orange-900 to-slate-900 text-orange-100 shadow-[0_0_30px_rgba(251,146,60,0.35)]"
      }
    `}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#9303C5]/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#2a0140]/40 to-transparent rounded-full blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle
                className={`text-sm font-medium tracking-wide ${isDark ? "text-gray-300" : "text-orange-100"}`}
              >
                Cash Balance
              </CardTitle>
              <div
                className={`p-2 rounded-full ${isDark ? "bg-[#9303C5]/20" : "bg-orange-500/20"}`}
              >
                <DollarSign
                  className={`h-4 w-4 ${isDark ? "text-[#d8b4fe]" : "text-emerald-400"}`}
                />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div
                className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : ""}`}
              >
                ₹{portfolio.balance?.toLocaleString() ?? "0"}
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : ""}`}>
                Available for trading
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolio Value Card - Dark Theme Enhanced */}
        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }}>
          <Card
            className={`
      relative overflow-hidden rounded-2xl border transition-all duration-500
      ${
        isDark
          ? "bg-gradient-to-br from-[#02060E] via-[#1a0033] to-[#4a0163] border-[#9303C5]/50 shadow-[0_8px_32px_rgba(147,3,197,0.3)] hover:shadow-[0_8px_32px_rgba(147,3,197,0.5)] hover:scale-105"
          : "bg-gradient-to-br from-emerald-950/90 via-emerald-900 to-slate-900 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
      }
    `}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#9303C5]/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#2a0140]/40 to-transparent rounded-full blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle
                className={`text-sm font-medium tracking-wide ${isDark ? "text-gray-300" : "text-emerald-100"}`}
              >
                Portfolio Value
              </CardTitle>
              <div
                className={`p-2 rounded-full ${isDark ? "bg-[#9303C5]/20" : "bg-emerald-500/20"}`}
              >
                <PieChart
                  className={`h-4 w-4 ${isDark ? "text-[#d8b4fe]" : "text-purple-400"}`}
                />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div
                className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : ""}`}
              >
                ₹{portfolioValue.toLocaleString()}
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : ""}`}>
                Total invested value
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participant ID Card - Dark Theme Enhanced */}
        <motion.div variants={item} whileHover={{ scale: 1.02, y: -5 }}>
          <Card
            className={`
      relative overflow-hidden rounded-2xl border transition-all duration-500
      ${
        isDark
          ? "bg-gradient-to-br from-[#02060E] via-[#1a0033] to-[#4a0163] border-[#9303C5]/50 shadow-[0_8px_32px_rgba(147,3,197,0.3)] hover:shadow-[0_8px_32px_rgba(147,3,197,0.5)] hover:scale-105"
          : "bg-gradient-to-br from-purple-950/90 via-purple-900 to-slate-900 text-purple-100 shadow-[0_0_30px_rgba(168,85,247,0.35)]"
      }
    `}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#9303C5]/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#2a0140]/40 to-transparent rounded-full blur-2xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle
                className={`text-sm font-medium tracking-wide ${isDark ? "text-gray-300" : "text-purple-100"}`}
              >
                Participant ID
              </CardTitle>
              <div
                className={`p-2 rounded-full ${isDark ? "bg-[#9303C5]/20" : "bg-purple-500/20"}`}
              >
                <IdCard
                  className={`h-4 w-4 ${isDark ? "text-[#d8b4fe]" : "text-blue-400"}`}
                />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div
                className={`text-2xl font-bold font-mono tracking-wider ${isDark ? "text-[#d8b4fe]" : "text-blue-600"}`}
              >
                {user.participantId ?? "-"}
              </div>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : ""}`}>
                Your unique identifier
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Holdings Section - Light theme unchanged */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className={`flex items-center gap-2 ${darkTextClass}`}>
                <Activity className="h-5 w-5 text-purple-400" />
                My Holdings
              </CardTitle>
              {isDark && (
                <Badge className="bg-[#9303C5]/20 text-[#d8b4fe] border-[#9303C5]/40">
                  {portfolio.holdings.length} Assets
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {portfolio.holdings.length === 0 ? (
              <p className={`text-center py-8 ${darkMutedTextClass}`}>
                No holdings yet. Start trading to build your portfolio!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={darkTableHeaderClass}>
                      <th className="text-left p-3">Name</th>
                      <th className="text-right p-3">Quantity</th>
                      <th className="text-right p-3">Avg Price</th>
                      <th className="text-right p-3">Current Price</th>
                      <th className="text-right p-3">Invested</th>
                      <th className="text-right p-3">Current Value</th>
                      <th className="text-right p-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding, index) => {
                      const share = shares.find(
                        (s) => s.name === holding.symbol,
                      );
                      const profitLoss = calculateProfitLoss(holding);
                      const invested = holding.avgPrice * holding.quantity;
                      const currentValue = share
                        ? share.price * holding.quantity
                        : 0;
                      const profitPercent = (profitLoss / invested) * 100;

                      return (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`border-b transition-all duration-300 ${darkBorderClass} ${darkHoverClass} ${
                            isDark && hoveredRow === index
                              ? "shadow-[inset_0_0_20px_rgba(147,3,197,0.1)]"
                              : ""
                          }`}
                        >
                          <td className={`p-3 font-medium ${darkTextClass}`}>
                            {holding.symbol}
                          </td>
                          <td className="text-right p-3">{holding.quantity}</td>
                          <td className="text-right p-3">
                            ₹{holding.avgPrice.toFixed(2)}
                          </td>
                          <td className="text-right p-3">
                            <span className={darkPriceClass}>
                              ₹{share?.price?.toFixed(2) ?? "N/A"}
                            </span>
                          </td>
                          <td className="text-right p-3">
                            ₹{invested.toLocaleString()}
                          </td>
                          <td className="text-right p-3 font-semibold">
                            ₹{currentValue.toLocaleString()}
                          </td>
                          <td className="text-right p-3">
                            <div
                              className={`flex items-center justify-end gap-1 ${profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {profitLoss >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <span className="font-semibold">
                                ₹{Math.abs(profitLoss).toLocaleString()}
                              </span>
                              <span className="text-xs opacity-70">
                                ({profitPercent >= 0 ? "+" : ""}
                                {profitPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Market Overview Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <CardTitle className={`flex items-center gap-2 ${darkTextClass}`}>
              <Sparkles className="h-5 w-5 text-purple-400" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Table */}
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={
                        isDark
                          ? "text-gray-400 border-b border-[#9303C5]/30"
                          : "text-slate-600"
                      }
                    >
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leftShares.map((share, idx) => (
                      <motion.tr
                        key={share._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b ${darkBorderClass} ${darkHoverClass} transition`}
                      >
                        <td className={`p-2 font-medium ${darkTextClass}`}>
                          {share.name}
                        </td>
                        <td className={`text-right p-2 ${darkPriceClass}`}>
                          ₹{share.price.toFixed(2)}
                        </td>
                        <td className="text-right p-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              share.change >= 0
                                ? isDark
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-green-100 text-green-700"
                                : isDark
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {share.change >= 0 ? "↑" : "↓"}
                            {Math.abs(share.change).toFixed(2)}%
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Table */}
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={
                        isDark
                          ? "text-gray-400 border-b border-[#9303C5]/30"
                          : "text-slate-600"
                      }
                    >
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Price</th>
                      <th className="text-right p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rightShares.map((share, idx) => (
                      <motion.tr
                        key={share._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`border-b ${darkBorderClass} ${darkHoverClass} transition`}
                      >
                        <td className={`p-2 font-medium ${darkTextClass}`}>
                          {share.name}
                        </td>
                        <td className={`text-right p-2 ${darkPriceClass}`}>
                          ₹{share.price.toFixed(2)}
                        </td>
                        <td className="text-right p-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              share.change >= 0
                                ? isDark
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-green-100 text-green-700"
                                : isDark
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {share.change >= 0 ? "↑" : "↓"}
                            {Math.abs(share.change).toFixed(2)}%
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Trades Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <CardTitle className={`flex items-center gap-2 ${darkTextClass}`}>
              <Clock className="h-5 w-5 text-purple-400" />
              Recent Trades
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {trades.length === 0 ? (
              <p className={`text-center py-8 ${darkMutedTextClass}`}>
                No trades yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={darkTableHeaderClass}>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Action</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Traded With</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 10).map((t, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`border-b transition ${darkBorderClass} ${darkHoverClass}`}
                      >
                        <td
                          className={`p-3 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        >
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`${
                              t.action === "buy"
                                ? isDark
                                  ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                                  : "bg-green-100 text-green-700 border-green-200"
                                : isDark
                                  ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                                  : "bg-red-100 text-red-700 border-red-200"
                            } border px-3 py-1 rounded-full text-xs font-semibold`}
                          >
                            {t.action.toUpperCase()}
                          </Badge>
                        </td>
                        <td className={`p-3 ${darkTextClass}`}>{t.symbol}</td>
                        <td className="p-3 text-right">{t.quantity}</td>
                        <td className="p-3 text-right">
                          ₹{t.price.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">{t.counterpart}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Market News Section - With Show All/Less functionality */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-purple-400" />
                <CardTitle className={darkTextClass}>Market News</CardTitle>
                {isDark && (
                  <Badge className="bg-[#9303C5]/20 text-[#d8b4fe] border-[#9303C5]/40 ml-2">
                    {news.length} Articles
                  </Badge>
                )}
              </div>
              {hasMoreNews && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllNews(!showAllNews)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isDark
                      ? "bg-[#2a0140]/50 text-[#d8b4fe] hover:bg-[#2a0140] border border-[#9303C5]/30"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {showAllNews ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show All ({news.length})
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {news.length === 0 ? (
              <p className={`text-center py-4 ${darkMutedTextClass}`}>
                No news available
              </p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {displayedNews.map((item, index) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${
                        index === 0 && isDark
                          ? "border-[#9303C5] bg-gradient-to-r from-[#9303C5]/10 to-transparent"
                          : index === 0 && !isDark
                            ? "border-red-500 bg-red-50/50"
                            : isDark
                              ? "border-[#2a0140] hover:border-[#9303C5]/50 hover:bg-[#2a0140]/20"
                              : "border-blue-200 hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={`text-sm font-medium ${darkTextClass}`}
                            >
                              {item.headline}
                            </p>
                            {index === 0 && (
                              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none animate-pulse text-xs">
                                BREAKING
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs mt-2 flex items-center gap-1 ${darkMutedTextClass}`}
                          >
                            <Clock className="h-3 w-3" />
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <CardTitle className={`flex items-center gap-2 ${darkTextClass}`}>
              <Award className="h-5 w-5 text-yellow-400" />
              Live Leaderboard (Top 15 Participants)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <p className={`text-center py-8 ${darkMutedTextClass}`}>
                No data available
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={darkTableHeaderClass}>
                      <th className="p-3 text-left">Rank</th>
                      <th className="p-3 text-left">Participant</th>
                      <th className="p-3 text-right">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 15).map((p, index) => (
                      <motion.tr
                        key={p.participantId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border-b transition-all duration-300 ${darkBorderClass} ${
                          p.participantId === user.participantId
                            ? isDark
                              ? "bg-[#9303C5]/20 border-[#9303C5]"
                              : "bg-blue-50/50"
                            : darkHoverClass
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(index) ? (
                              <span className="text-2xl">
                                {getRankIcon(index)}
                              </span>
                            ) : (
                              <span
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                                  index < 3
                                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white"
                                    : isDark
                                      ? "bg-[#2a0140] text-gray-300"
                                      : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {index + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{p.name}</div>
                          <div className={`text-xs ${darkMutedTextClass}`}>
                            {p.participantId}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-bold text-lg ${isDark ? "bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent" : ""}`}
                          >
                            ₹{p.totalNetWorth.toLocaleString()}
                          </span>
                        </td>
                      </motion.tr>
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
