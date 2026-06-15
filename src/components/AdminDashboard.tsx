// AdminDashboard.tsx - Complete Fixed Version
import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  DollarSign,
  IndianRupee,
  Activity,
  Shield,
  AlertCircle,
  X,
  Search,
  Plus,
  Trash2,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";
import { AxiosError } from "axios";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MostTradedPortfolio from "./MostTradedPortfolio";
import MostDiversifiedPortfolio from "./MostDiversifiedPortfolio";
import { useTheme } from "@/contexts/ThemeContext";

interface AdminUser {
  _id: string;
  name: string;
  role: "admin" | "employee" | "participant";
  email?: string;
  participantId?: string;
}

interface Share {
  _id: string;
  name: string;
  price: number;
  change: number;
  lockedUntil?: string | null;
}

interface NewsItem {
  _id: string;
  headline: string;
  sentiment: "positive" | "negative";
  affectedShares: string[];
  impact: number;
  timestamp: string;
}

interface LeaderboardItem {
  participantId: string;
  name: string;
  totalNetWorth: number;
}

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
    transition: { type: "spring", stiffness: 100 } as const,
  },
};

const AdminDashboard = ({ user }: { user: AdminUser }) => {
  const { theme } = useTheme();
  const [shares, setShares] = useState<Share[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  const [newShare, setNewShare] = useState({ name: "", price: 0 });
  const [newNews, setNewNews] = useState({
    headline: "",
    sentiment: "positive",
    affectedShares: [] as string[],
    impact: 1,
  });

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSearchTerm, setShareSearchTerm] = useState("");
  const [marketRunning, setMarketRunning] = useState(true);

  const [bumpDialogOpen, setBumpDialogOpen] = useState(false);
  const [bumpValue, setBumpValue] = useState<number>(0);
  const [bumpTarget, setBumpTarget] = useState<{
    id: string;
    sign: "+" | "-";
  } | null>(null);

  const isDark = theme === "dark";

  const darkCardClass = isDark
    ? "bg-[#02060E]/80 backdrop-blur-sm border-[#9303C5]/30 shadow-xl"
    : "hover:shadow-lg transition-shadow duration-300";
  const darkBorderClass = isDark ? "border-[#9303C5]/20" : "border-gray-100";
  const darkHoverClass = isDark
    ? "hover:bg-[#2a0140]/30"
    : "hover:bg-gray-50 transition-colors duration-200";
  const darkTextClass = isDark ? "text-white" : "text-gray-800";
  const darkMutedTextClass = isDark ? "text-gray-400" : "text-gray-500";
  const darkPriceClass = isDark ? "text-[#d8b4fe]" : "text-purple-700";

  const fetchNews = async () => {
    const res = await axiosInstance.get("/news");
    setNews(res.data);
  };

  const toggleMarket = async () => {
    const res = await axiosInstance.post("/market/toggle");
    setMarketRunning(res.data.running);
  };

  const fetchLeaderboard = async () => {
    const res = await axiosInstance.get("/users/leaderboard");
    setLeaderboard(res.data);
  };

  const fetchAll = async () => {
    const [sRes, nRes, lRes] = await Promise.all([
      axiosInstance.get("/shares"),
      axiosInstance.get("/news"),
      axiosInstance.get("/users/leaderboard"),
    ]);
    setShares(sRes.data);
    setNews(nRes.data);
    setLeaderboard(lRes.data);
  };

  useEffect(() => {
    fetchAll();

    axiosInstance.get("/market/status").then((res) => {
      setMarketRunning(res.data.running);
    });

    socket.on("market:status", ({ running }) => {
      setMarketRunning(running);
      toast({
        title: running ? "📊 Market Resumed" : "⛔ Market Paused",
        description: running
          ? "Market fluctuations are active."
          : "Market fluctuations are halted.",
      });
    });

    socket.on("share:add", (newShare) => {
      setShares((prev) => [...prev, newShare]);
      toast({
        title: "📈 New Share Added",
        description: `${newShare.name} listed at ₹${newShare.price}`,
      });
    });

    socket.on("share:update", (updatedShare: Share) => {
      setShares((prev) =>
        prev.map((s) => (s._id === updatedShare._id ? updatedShare : s)),
      );
    });

    socket.on("share:delete", (id: string) => {
      setShares((prev) => prev.filter((s) => s._id !== id));
    });

    socket.on("news:new", (news: NewsItem) => {
      toast({
        title: "📰 Breaking News",
        description: news.headline,
      });
      setNews((prev) => [news, ...prev]);
    });

    socket.on("leaderboard:update", (data) => {
      setLeaderboard(data);
    });

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("share:add");
      socket.off("news:new");
      socket.off("market:status");
      socket.off("leaderboard:update");
    };
  }, []);

  const openBumpDialog = (id: string, sign: "+" | "-") => {
    setBumpTarget({ id, sign });
    setBumpValue(0);
    setBumpDialogOpen(true);
  };

  const confirmBump = async () => {
    if (!bumpTarget || bumpValue <= 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a positive percentage",
        variant: "destructive",
      });
      return;
    }

    const percent = bumpTarget.sign === "+" ? bumpValue : -bumpValue;

    try {
      await axiosInstance.post(`/shares/${bumpTarget.id}/bump`, { percent });
      setBumpDialogOpen(false);
    } catch (err: unknown) {
      const error = err as AxiosError<{ msg?: string }>;
      toast({
        title: "Update failed",
        description: error.response?.data?.msg ?? "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleAddShare = async () => {
    if (!newShare.name || newShare.price <= 0) return;
    await axiosInstance.post("/shares", newShare);
    setNewShare({ name: "", price: 0 });
  };

  const handleDeleteShare = async (id: string) => {
    await axiosInstance.delete(`/shares/${id}`);
  };

  const handleAddNews = async () => {
    const { headline, affectedShares, impact } = newNews;
    if (!headline || affectedShares.length === 0) return;
    if (impact < 1 || impact > 5) return alert("Impact must be 1‑5");

    await axiosInstance.post("/news", newNews);
    setNewNews({
      headline: "",
      sentiment: "positive",
      affectedShares: [],
      impact: 1,
    });
    fetchNews();
    fetchLeaderboard();
  };

  const applyPenalty = async (participantId: string) => {
    if (!confirm("Apply ₹1,00,000 penalty to this participant?")) return;

    try {
      await axiosInstance.post(`/users/penalty/${participantId}`);
      toast({
        title: "Penalty Applied",
        description: "₹1,00,000 deducted",
        variant: "destructive",
      });
    } catch {
      toast({
        title: "Penalty Failed",
        variant: "destructive",
      });
    }
  };

  const removeAffectedShare = (shareName: string) => {
    setNewNews({
      ...newNews,
      affectedShares: newNews.affectedShares.filter((s) => s !== shareName),
    });
  };

  const toggleShareSelection = (shareName: string, checked: boolean) => {
    if (checked) {
      setNewNews({
        ...newNews,
        affectedShares: [...newNews.affectedShares, shareName],
      });
    } else {
      setNewNews({
        ...newNews,
        affectedShares: newNews.affectedShares.filter((s) => s !== shareName),
      });
    }
  };

  const filteredShares = shares.filter((sh) =>
    sh.name.toLowerCase().includes(shareSearchTerm.toLowerCase()),
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Animated Background Effect for Dark Mode */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-20 -left-40 w-80 h-80 bg-[#9303C5]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 -right-40 w-80 h-80 bg-[#2a0140]/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#9303C5]/5 rounded-full blur-3xl" />
        </div>
      )}

      {/* Share Management Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`}
                >
                  <DollarSign
                    className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                  />
                </div>
                <CardTitle className={`text-xl font-bold ${darkTextClass}`}>
                  Manage Shares
                </CardTitle>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#9303C5]/20 text-[#d8b4fe]" : "bg-purple-100 text-purple-700"}`}
                >
                  {shares.length} Active
                </span>
              </div>

              <motion.div
                animate={marketRunning ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Button
                  onClick={toggleMarket}
                  className={`${
                    marketRunning
                      ? isDark
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/50"
                        : "bg-green-600 hover:bg-green-700"
                      : isDark
                        ? "bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-lg hover:shadow-red-500/50"
                        : "bg-red-600 hover:bg-red-700"
                  } text-white shadow-lg transition-all duration-300 rounded-full px-5`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${marketRunning ? "bg-green-300 animate-pulse" : "bg-red-300"}`}
                  />
                  {marketRunning ? "Market ON" : "Market OFF"}
                </Button>
              </motion.div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Activity
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMutedTextClass}`}
                />
                <Input
                  placeholder="Share Name"
                  value={newShare.name}
                  onChange={(e) =>
                    setNewShare({
                      ...newShare,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                  className={`pl-9 transition-all duration-200 focus:ring-2 ${
                    isDark
                      ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500"
                      : "focus:ring-purple-200 focus:border-purple-500"
                  }`}
                />
              </div>
              <div className="relative w-40">
                <IndianRupee
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${darkMutedTextClass}`}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={newShare.price}
                  onChange={(e) =>
                    setNewShare({ ...newShare, price: +e.target.value })
                  }
                  className={`pl-9 transition-all duration-200 focus:ring-2 ${
                    isDark
                      ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500"
                      : "focus:ring-purple-200 focus:border-purple-500"
                  }`}
                />
              </div>
              <Button
                onClick={handleAddShare}
                className={`${
                  isDark
                    ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] hover:shadow-lg hover:shadow-[#9303C5]/50"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/30"
                } text-white font-semibold px-6 transition-all duration-300 rounded-full`}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Share
              </Button>
            </div>

            <div className="grid gap-3">
              {shares.map((sh, idx) => {
                const locked =
                  sh.lockedUntil && new Date(sh.lockedUntil) > new Date();
                return (
                  <motion.div
                    key={sh._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className={`rounded-xl border p-4 flex items-center justify-between transition-all duration-300 ${
                      isDark
                        ? `${darkBorderClass} ${darkHoverClass} bg-[#02060E]/40`
                        : "bg-white hover:shadow-md border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isDark ? "bg-[#9303C5]/20" : "bg-purple-100"
                        }`}
                      >
                        <Activity
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className={`text-lg ${darkTextClass}`}>
                            {sh.name}
                          </strong>
                          {locked && (
                            <Badge
                              className={`${isDark ? "bg-[#9303C5]/20 text-[#d8b4fe]" : "bg-amber-100 text-amber-700"} rounded-full`}
                            >
                              🔒 locked
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs ${darkMutedTextClass}`}>
                          Current Price
                        </p>
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <p className={`text-2xl font-bold ${darkPriceClass}`}>
                        ₹{sh.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openBumpDialog(sh._id, "+")}
                        className={`rounded-full w-9 h-9 p-0 ${
                          isDark
                            ? "border-[#9303C5]/30 text-[#d8b4fe] hover:bg-[#9303C5]/20"
                            : "hover:bg-green-50 hover:border-green-300"
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openBumpDialog(sh._id, "-")}
                        className={`rounded-full w-9 h-9 p-0 ${
                          isDark
                            ? "border-[#9303C5]/30 text-[#d8b4fe] hover:bg-[#9303C5]/20"
                            : "hover:bg-red-50 hover:border-red-300"
                        }`}
                      >
                        <TrendingDown className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteShare(sh._id)}
                        className="rounded-full w-9 h-9 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* News Management Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`}
              >
                <Newspaper
                  className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                />
              </div>
              <CardTitle className={`text-xl font-bold ${darkTextClass}`}>
                Manage News
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <Textarea
              className={`min-h-[100px] transition-all duration-200 focus:ring-2 ${
                isDark
                  ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500"
                  : "focus:ring-purple-200 focus:border-purple-500"
              } rounded-xl`}
              placeholder="Enter news headline..."
              value={newNews.headline}
              onChange={(e) =>
                setNewNews({ ...newNews, headline: e.target.value })
              }
            />

            {/* Selected Shares Tags */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-sm font-medium ${darkMutedTextClass}`}>
                Selected Shares:
              </span>
              {newNews.affectedShares.length > 0 ? (
                newNews.affectedShares.map((share) => (
                  <Badge
                    key={share}
                    className={`flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-full ${
                      isDark
                        ? "bg-[#9303C5]/40 text-[#d8b4fe] hover:bg-[#9303C5]/60 border border-[#9303C5]/50"
                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    }`}
                    onClick={() => removeAffectedShare(share)}
                  >
                    {share}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))
              ) : (
                <span className={`text-sm italic ${darkMutedTextClass}`}>
                  No shares selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              {/* Share Selection Button - Opens Modal */}
              <Button
                type="button"
                onClick={() => {
                  setShareModalOpen(true);
                  setShareSearchTerm("");
                }}
                className={`w-[280px] justify-between rounded-xl ${
                  isDark
                    ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white hover:bg-[#2a0140]/50"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                } border`}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="truncate">
                    {newNews.affectedShares.length
                      ? `📌 ${newNews.affectedShares.length} share(s) selected`
                      : "Select Affected Shares"}
                  </span>
                </div>
              </Button>

              <div className="flex items-center gap-2">
                <span className={`text-sm ${darkMutedTextClass}`}>Impact:</span>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  className={`w-20 text-center transition-all duration-200 focus:ring-2 rounded-xl ${
                    isDark
                      ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5]"
                      : "focus:ring-purple-200 focus:border-purple-500"
                  }`}
                  value={newNews.impact}
                  onChange={(e) =>
                    setNewNews({ ...newNews, impact: +e.target.value })
                  }
                />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`w-6 h-1.5 rounded-full transition-all ${
                        level <= newNews.impact
                          ? newNews.sentiment === "positive"
                            ? "bg-green-500"
                            : "bg-red-500"
                          : isDark
                            ? "bg-gray-700"
                            : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <select
                className={`rounded-xl border px-4 py-2 text-sm transition-all duration-200 focus:ring-2 ${
                  isDark
                    ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5]"
                    : "bg-white border-gray-200 text-gray-700 focus:ring-purple-200 focus:border-purple-500"
                }`}
                value={newNews.sentiment}
                onChange={(e) =>
                  setNewNews({
                    ...newNews,
                    sentiment: e.target.value as "positive" | "negative",
                  })
                }
              >
                <option
                  value="positive"
                  className={isDark ? "bg-[#02060E]" : ""}
                >
                  📈 Positive
                </option>
                <option
                  value="negative"
                  className={isDark ? "bg-[#02060E]" : ""}
                >
                  📉 Negative
                </option>
              </select>

              <Button
                onClick={handleAddNews}
                disabled={
                  !newNews.headline || newNews.affectedShares.length === 0
                }
                className="bg-gradient-to-r from-[#9303C5] via-[#7B02A8] to-[#5B0186] hover:from-[#7B02A8] hover:via-[#5B0186] hover:to-[#3B0064] text-white font-semibold px-6 py-2.5 transition-all duration-300 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  Post News
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Share Selection Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent
          className={`sm:max-w-lg ${isDark ? "bg-[#02060E] border-[#9303C5]/30" : "bg-white"}`}
        >
          <DialogHeader>
            <DialogTitle className={`${darkTextClass}`}>
              Select Affected Shares
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search shares..."
                value={shareSearchTerm}
                onChange={(e) => setShareSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-all focus:ring-2 ${
                  isDark
                    ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white placeholder:text-gray-400 focus:border-[#9303C5] focus:ring-[#9303C5]"
                    : "bg-gray-50 border-gray-200 text-gray-800 focus:ring-purple-200 focus:border-purple-500"
                }`}
                autoFocus
              />
            </div>

            {/* Share List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredShares.length === 0 ? (
                <div className={`text-center py-8 ${darkMutedTextClass}`}>
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No shares found</p>
                </div>
              ) : (
                filteredShares.map((sh) => {
                  const isSelected = newNews.affectedShares.includes(sh.name);
                  return (
                    <label
                      key={sh._id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        isDark
                          ? `hover:bg-[#2a0140]/50 ${isSelected ? "bg-[#2a0140]/40" : ""}`
                          : `hover:bg-gray-50 ${isSelected ? "bg-purple-50" : ""}`
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          toggleShareSelection(sh.name, e.target.checked)
                        }
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isDark ? "bg-[#9303C5]/20" : "bg-purple-100"
                        }`}
                      >
                        <Activity
                          className={`h-4 w-4 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${darkTextClass}`}>
                          {sh.name}
                        </p>
                        <p className={`text-xs ${darkMutedTextClass}`}>
                          ₹{sh.price.toFixed(2)}
                        </p>
                      </div>
                      {isSelected && (
                        <div
                          className={`text-xs ${isDark ? "text-green-400" : "text-purple-600"}`}
                        >
                          ✓ Selected
                        </div>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center mt-4">
            <div className={`text-sm ${darkMutedTextClass}`}>
              {newNews.affectedShares.length} share(s) selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNewNews({ ...newNews, affectedShares: [] });
                }}
                className="rounded-full"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setShareModalOpen(false)}
                className={`rounded-full ${
                  isDark
                    ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] hover:shadow-lg hover:shadow-[#9303C5]/50"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600"
                }`}
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* News List Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`}
              >
                <Newspaper
                  className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                />
              </div>
              <CardTitle className={`text-xl font-bold ${darkTextClass}`}>
                Market News
              </CardTitle>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#9303C5]/20 text-[#d8b4fe]" : "bg-purple-100 text-purple-700"}`}
              >
                {news.length} Articles
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <AnimatePresence>
                {news.length === 0 ? (
                  <div className={`text-center py-12 ${darkMutedTextClass}`}>
                    <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No news articles yet</p>
                    <p className="text-sm">
                      Create your first market news above
                    </p>
                  </div>
                ) : (
                  news.map((n, idx) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`relative rounded-xl border p-5 transition-all duration-300 ${
                        isDark
                          ? `${darkBorderClass} ${darkHoverClass}`
                          : "bg-white border-gray-200 hover:shadow-md"
                      }`}
                    >
                      <div
                        className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${
                          n.sentiment === "positive"
                            ? "bg-gradient-to-b from-green-500 to-emerald-600"
                            : "bg-gradient-to-b from-red-500 to-rose-600"
                        }`}
                      />
                      <div className="flex justify-between items-start ml-4">
                        <div className="flex-1">
                          <h4
                            className={`font-semibold text-base mb-2 ${darkTextClass}`}
                          >
                            {n.headline}
                          </h4>
                          <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex flex-wrap gap-1">
                              {n.affectedShares.slice(0, 4).map((share, i) => (
                                <Badge
                                  key={i}
                                  className={`text-xs rounded-full ${isDark ? "bg-[#2a0140]/50 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                                >
                                  {share}
                                </Badge>
                              ))}
                              {n.affectedShares.length > 4 && (
                                <Badge
                                  className={`text-xs rounded-full ${isDark ? "bg-[#2a0140]/50 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                                >
                                  +{n.affectedShares.length - 4} more
                                </Badge>
                              )}
                            </div>
                            <Badge
                              className={`rounded-full ${
                                n.sentiment === "positive"
                                  ? isDark
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-green-100 text-green-700"
                                  : isDark
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {n.sentiment === "positive"
                                ? "📈 Positive"
                                : "📉 Negative"}{" "}
                              • Impact: {n.impact}/5
                            </Badge>
                          </div>
                          <p
                            className={`text-xs mt-3 flex items-center gap-1 ${darkMutedTextClass}`}
                          >
                            🕒 {new Date(n.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            axiosInstance
                              .delete(`/news/${n._id}`)
                              .then(fetchNews)
                          }
                          className="rounded-full px-4 hover:scale-105 transition-transform"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard Section */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`}
              >
                <Award
                  className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
                />
              </div>
              <CardTitle className={`text-xl font-bold ${darkTextClass}`}>
                🏆 Live Leaderboard (Top 15)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className={`p-8 text-center ${darkMutedTextClass}`}>
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className={`border-b ${isDark ? "border-[#9303C5]/30 bg-[#2a0140]/30" : "bg-gray-50"}`}
                    >
                      <th className="px-6 py-4 text-left text-sm font-semibold">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">
                        Participant
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">
                        Net Worth
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((p, i) => (
                      <motion.tr
                        key={p.participantId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`border-b transition-all duration-300 ${
                          isDark
                            ? "border-[#9303C5]/20 hover:bg-[#2a0140]/30"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="text-2xl">👑</span>}
                            {i === 1 && <span className="text-2xl">🥈</span>}
                            {i === 2 && <span className="text-2xl">🥉</span>}
                            {i > 2 && (
                              <span
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                                  isDark
                                    ? "bg-[#2a0140] text-gray-300"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {i + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-semibold ${darkTextClass}`}>
                            {p.name}
                          </div>
                          <div className={`text-xs ${darkMutedTextClass}`}>
                            ID: {p.participantId}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div
                            className={`font-bold text-lg ${darkPriceClass}`}
                          >
                            ₹{p.totalNetWorth.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => applyPenalty(p.participantId)}
                            className="rounded-full px-5 hover:scale-105 transition-transform duration-200"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Penalty
                          </Button>
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

      {/* Analytics Sections */}
      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardContent className="p-0">
            <MostTradedPortfolio />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card
          className={`rounded-2xl border transition-all duration-300 ${darkCardClass}`}
        >
          <CardContent className="p-0">
            <MostDiversifiedPortfolio />
          </CardContent>
        </Card>
      </motion.div>

      {/* Bump Percentage Dialog */}
      <Dialog open={bumpDialogOpen} onOpenChange={setBumpDialogOpen}>
        <DialogContent
          className={`sm:max-w-md ${isDark ? "bg-[#02060E] border-[#9303C5]/30" : ""}`}
        >
          <DialogHeader>
            <DialogTitle className={`${darkTextClass}`}>
              {bumpTarget?.sign === "+"
                ? "📈 Increase Share Price"
                : "📉 Decrease Share Price"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              min={1}
              placeholder="Enter percentage"
              value={bumpValue}
              onChange={(e) => setBumpValue(+e.target.value)}
              className={`transition-all duration-200 focus:ring-2 rounded-xl ${
                isDark
                  ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5]"
                  : "focus:ring-purple-200 focus:border-purple-500"
              }`}
            />
            <p className={`text-sm ${darkMutedTextClass}`}>
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Example: 5 means {bumpTarget?.sign}5% change
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBumpDialogOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBump}
              className={`rounded-full ${
                isDark
                  ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] hover:shadow-lg hover:shadow-[#9303C5]/50"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600"
              }`}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminDashboard;
