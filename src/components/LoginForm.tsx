// src/components/LoginForm.tsx - Fixed Dark Theme Colors Only
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Newspaper,
  Clock,
  Sparkles,
} from "lucide-react";
import { AxiosError } from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ────────────────────────────────────────────────────────── */
/*                      helper types                          */
interface Share {
  _id: string;
  name: string;
  price: number;
  change: number;
}
interface NewsItem {
  _id: string;
  headline: string;
  timestamp: string;
  sentiment: "positive" | "negative";
}
interface AuthUser {
  _id: string;
  name: string;
  role: "participant" | "employee" | "admin";
  participantId?: string;
}
interface LeaderboardEntry {
  participantId: string;
  name: string;
  totalNetWorth: number;
}

/* ────────────────────────────────────────────────────────── */

const socket = io(import.meta.env.VITE_SOCKET_URL);

const LoginForm = ({ onLogin }: { onLogin: (u: AuthUser) => void }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ------------ auth form state ------------ */
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  /* ------------ top‑level view ------------ */
  type View = "auth" | "news" | "leaderboard" | "shares";
  const [view, setView] = useState<View>("auth");

  /* ------------ data for the three views --- */
  const [news, setNews] = useState<NewsItem[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const { toast } = useToast();

  /* ========== ENV secrets for signup ======== */
  const EMPLOYEE_SECRET = import.meta.env.VITE_EMPLOYEE_SECRET;
  const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET;

  /* ────────────────────────────────────────── */
  /*         datafetch&socketupdates        */
  /* ────────────────────────────────────────── */
  useEffect(() => {
    const fetchInitial = async () => {
      const [nRes, sRes, lRes] = await Promise.all([
        axiosInstance.get("/news"),
        axiosInstance.get("/shares"),
        axiosInstance.get("/users/leaderboard"),
      ]);
      setNews(nRes.data);
      setShares(sRes.data);
      setLeaderboard(lRes.data);
    };
    fetchInitial();

    /* live share + news stream */
    socket.on("share:update", (upd: Share) =>
      setShares((prev) =>
        prev.some((s) => s._id === upd._id)
          ? prev.map((s) => (s._id === upd._id ? upd : s))
          : [...prev, upd],
      ),
    );
    socket.on("share:delete", (id: string) =>
      setShares((prev) => prev.filter((s) => s._id !== id)),
    );
    socket.on("news:new", (n: NewsItem) => setNews((prev) => [n, ...prev]));
    socket.on("leaderboard:update", (data: LeaderboardEntry[]) => {
      setLeaderboard(Array.isArray(data) ? data : []);
    });

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("news:new");
      socket.off("leaderboard:update");
    };
  }, []);

  /* ────────────────────────────────────────── */
  /*                 AUTH LOGIC                */
  /* ────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const email = fd.get("email");
    const password = fd.get("password");
    try {
      const res = await axiosInstance.post("/users/login", { email, password });
      onLogin(res.data);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${res.data.name}!`,
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast({
          title: "Login Failed",
          description: err.response?.data?.message || "Something went wrong",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: "Unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = fd.get("name");
    const email = fd.get("email");
    const password = fd.get("password");
    const role = fd.get("role");
    const secretKey = fd.get("secretKey");

    if (role === "employee" && secretKey !== EMPLOYEE_SECRET) {
      return toast({
        title: "Invalid Secret Key",
        description: "Employee key incorrect",
        variant: "destructive",
      });
    }
    if (role === "admin" && secretKey !== ADMIN_SECRET) {
      return toast({
        title: "Invalid Secret Key",
        description: "Admin key incorrect",
        variant: "destructive",
      });
    }

    try {
      const res = await axiosInstance.post("/users/register", {
        name,
        email,
        password,
        role,
        secretKey,
      });
      toast({
        title: "Registration Successful",
        description: `Account created${
          res.data.participantId
            ? `. Your Participant ID: ${res.data.participantId}`
            : ""
        }`,
      });
      setAuthTab("login");
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast({
          title: "Registration Failed",
          description: err.response?.data?.message || "Something went wrong",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: "Unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  /* ────────────────────────────────────────── */
  /*            REUSABLE VIEWS WITH DARK THEME  */
  /* ────────────────────────────────────────── */

  const MarketNews = () => {
    if (news.length === 0) {
      return (
        <div
          className={`rounded-2xl border-2 border-dashed p-8 text-center shadow-sm transition-all duration-300 ${
            isDark
              ? "bg-[#02060E]/80 border-[#9303C5]/30 text-gray-400 hover:border-[#9303C5]/50"
              : "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500 hover:border-purple-200"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Newspaper className="h-12 w-12 opacity-40" />
            <p className="text-base font-medium">
              No market news available yet 📰
            </p>
            <p className="text-xs opacity-60">Check back later for updates</p>
          </div>
        </div>
      );
    }

    const [breaking, ...others] = news;

    return (
      <div className="space-y-6">
        {/* 🔥 BREAKING NEWS - Hero Style */}
        <div
          className={`relative rounded-2xl overflow-hidden shadow-2xl ${
            isDark
              ? "bg-gradient-to-br from-[#2a0140] via-[#1a0033] to-[#4a0163] border border-[#9303C5]"
              : "bg-gradient-to-br from-red-600 via-red-500 to-red-600 border border-red-400"
          }`}
        >
          {/* Animated Background Glow */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl" />
            <div className="absolute bottom-0 -right-4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl" />
          </div>

          {/* Breaking Badge */}
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                🔥 BREAKING NEWS
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3
                  className={`text-lg sm:text-2xl md:text-3xl font-bold leading-tight ${
                    isDark ? "text-white" : "text-white"
                  }`}
                >
                  {breaking.headline}
                </h3>
                <div className="flex items-center gap-2 mt-3">
                  <p
                    className={`text-xs sm:text-sm flex items-center gap-1 ${
                      isDark ? "text-gray-300" : "text-red-100"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {new Date(breaking.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📰 OTHER MARKET NEWS - Card Grid */}
        {others.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((n, idx) => (
              <div
                key={n._id}
                className={`group relative rounded-xl overflow-hidden shadow-md transition-all duration-300 ${
                  isDark
                    ? "bg-[#02060E]/80 border border-[#9303C5]/30 hover:border-[#9303C5]/60 hover:shadow-lg hover:shadow-[#9303C5]/20"
                    : "bg-white border border-gray-200 hover:shadow-xl hover:border-purple-200"
                }`}
              >
                {/* Hover Gradient Overlay */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isDark
                      ? "bg-gradient-to-br from-[#9303C5]/10 via-transparent to-transparent"
                      : "bg-gradient-to-br from-purple-100/50 via-transparent to-transparent"
                  }`}
                />

                <div className="relative p-5">
                  {/* Headline */}
                  <h4
                    className={`text-base font-semibold leading-snug line-clamp-3 mb-3 ${
                      isDark
                        ? "text-white group-hover:text-[#d8b4fe]"
                        : "text-gray-800 group-hover:text-purple-700"
                    } transition-colors duration-300`}
                  >
                    {n.headline}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const LiveLeaderboard = () => (
    <div
      className={`rounded-3xl border shadow-2xl overflow-hidden ${
        isDark ? "bg-[#02060E]/80 border-[#9303C5]/40" : "bg-white"
      }`}
    >
      {/* Header with Live Indicator Animation - Larger for Projector */}
      <div
        className={`px-8 py-6 border-b ${
          isDark
            ? "border-[#9303C5]/40 bg-gradient-to-r from-[#2a0140] to-[#1a0033]"
            : "bg-gradient-to-r from-[#F5F2FF] to-white"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Animated Live Indicator - Larger */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75" />
              </div>
              <span
                className={`text-sm font-bold uppercase tracking-wider ${
                  isDark ? "text-red-400" : "text-red-600"
                }`}
              >
                LIVE
              </span>
            </div>
            <h2
              className={`text-2xl md:text-3xl font-bold flex items-center gap-3 ${
                isDark ? "text-white" : "text-slate-800"
              }`}
            >
              🏆 Leaderboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`text-sm px-4 py-2 rounded-full font-medium ${
                isDark
                  ? "bg-[#9303C5]/30 text-[#d8b4fe]"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              Real-time
            </div>
            <div
              className={`text-sm px-4 py-2 rounded-full font-medium ${
                isDark
                  ? "bg-green-500/30 text-green-400"
                  : "bg-green-100 text-green-700"
              }`}
            >
              📊 Updated Now
            </div>
          </div>
        </div>
        <p
          className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Rankings based on total net worth
        </p>
      </div>

      {/* Table - Larger text for projector */}
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full">
          <thead className={isDark ? "bg-[#2a0140]/60" : "bg-slate-100"}>
            <tr className={isDark ? "text-gray-300" : "text-slate-700"}>
              <th className="px-8 py-5 text-left text-base font-bold uppercase tracking-wider">
                Rank
              </th>
              <th className="px-8 py-5 text-left text-base font-bold uppercase tracking-wider">
                Participant
              </th>
              <th className="px-8 py-5 text-right text-base font-bold uppercase tracking-wider">
                Net Worth
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {leaderboard.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className={`p-16 text-center ${isDark ? "text-gray-400" : "text-slate-500"}`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-6xl">🏆</div>
                    <p className="text-xl font-medium">
                      No leaderboard data available yet
                    </p>
                    <p className="text-base">Be the first to start trading!</p>
                  </div>
                </td>
              </tr>
            )}

            {leaderboard.slice(0, 15).map((p, i) => {
              return (
                <tr
                  key={p.participantId}
                  className={`transition-all duration-300 ${
                    i === 0
                      ? isDark
                        ? "bg-gradient-to-r from-yellow-900/50 to-transparent hover:bg-yellow-900/60"
                        : "bg-gradient-to-r from-yellow-100/90 to-white hover:bg-yellow-100"
                      : i === 1
                        ? isDark
                          ? "bg-gradient-to-r from-slate-700/40 to-transparent hover:bg-slate-700/50"
                          : "bg-gradient-to-r from-slate-100/90 to-white hover:bg-slate-100"
                        : i === 2
                          ? isDark
                            ? "bg-gradient-to-r from-amber-900/40 to-transparent hover:bg-amber-900/50"
                            : "bg-gradient-to-r from-amber-100/80 to-white hover:bg-amber-100"
                          : isDark
                            ? "hover:bg-[#2a0140]/40"
                            : "hover:bg-gray-50"
                  }`}
                >
                  {/* Rank Column - With Crown for Top 1 */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      {i === 0 && (
                        <div className="relative">
                          <span className="text-3xl">👑</span>
                          <span className="absolute -top-2 -right-3 text-sm animate-pulse">
                            ⭐
                          </span>
                        </div>
                      )}
                      {i === 1 && <span className="text-3xl">🥈</span>}
                      {i === 2 && <span className="text-3xl">🥉</span>}
                      {i > 2 && (
                        <span
                          className={`w-10 h-10 flex items-center justify-center rounded-full text-base font-bold ${
                            isDark
                              ? "bg-[#2a0140] text-gray-300"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {i + 1}
                        </span>
                      )}
                      {i === 0 && (
                        <span
                          className={`text-sm font-bold px-3 py-1 rounded-full ${
                            isDark
                              ? "bg-yellow-500/30 text-yellow-400"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          #1
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Participant Column with Avatar */}
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold ${
                          i === 0
                            ? isDark
                              ? "bg-yellow-500/40 text-yellow-400"
                              : "bg-yellow-200 text-yellow-700"
                            : i === 1
                              ? isDark
                                ? "bg-slate-500/40 text-gray-300"
                                : "bg-slate-200 text-slate-700"
                              : i === 2
                                ? isDark
                                  ? "bg-amber-500/40 text-amber-400"
                                  : "bg-amber-200 text-amber-700"
                                : isDark
                                  ? "bg-[#2a0140] text-gray-300"
                                  : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div
                          className={`text-base font-bold ${isDark ? "text-white" : "text-gray-800"}`}
                        >
                          {p.name}
                        </div>
                        <div
                          className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {p.participantId}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Net Worth Column with Percentage Change */}
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <div
                        className={`text-2xl font-extrabold tracking-tight ${
                          i === 0
                            ? isDark
                              ? "text-yellow-400"
                              : "text-yellow-600"
                            : i === 1
                              ? isDark
                                ? "text-gray-300"
                                : "text-gray-700"
                              : i === 2
                                ? isDark
                                  ? "text-amber-400"
                                  : "text-amber-600"
                                : isDark
                                  ? "text-[#d8b4fe]"
                                  : "text-purple-700"
                        }`}
                      >
                        ₹{p.totalNetWorth.toLocaleString()}
                      </div>

                      {/* Additional Info for Top 3 */}
                      {i < 3 && (
                        <div
                          className={`text-sm mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                        >
                          {i === 0
                            ? "🏆 Leading the pack"
                            : i === 1
                              ? "🥈 Strong contender"
                              : "🥉 Rising star"}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with live status - Larger text for projector */}
      <div
        className={`px-8 py-4 border-t ${
          isDark
            ? "border-[#9303C5]/30 bg-[#02060E]/60 text-gray-400"
            : "border-gray-100 bg-gray-50 text-gray-500"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live updates active</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>📊 {leaderboard.length} Participants</span>
            <span>🔄 Auto-refresh every 5s</span>
            <span>🎯 Real-time rankings</span>
          </div>
          <div
            className={`text-xs px-3 py-1 rounded-full ${
              isDark
                ? "bg-[#9303C5]/20 text-[#d8b4fe]"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            Top 15 Shown
          </div>
        </div>
      </div>
    </div>
  );
  const ShareGrid = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
      {shares.map((s) => {
        const bid = (s.price * 0.98).toFixed(2);
        const ask = (s.price * 1.02).toFixed(2);
        const positive = s.change >= 0;

        return (
          <div
            key={s._id}
            className={`relative rounded-2xl border p-4 overflow-hidden shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
              positive
                ? isDark
                  ? "border-green-500/40 bg-gradient-to-br from-green-950/40 via-green-900/20 to-green-800/30"
                  : "border-green-400/60 bg-gradient-to-br from-green-400/30 via-green-300/10 to-green-500/20"
                : isDark
                  ? "border-red-500/40 bg-gradient-to-br from-red-950/40 via-red-900/20 to-red-800/30"
                  : "border-red-400/60 bg-gradient-to-br from-red-400/30 via-red-300/10 to-red-500/20"
            }`}
          >
            <div
              className={`absolute inset-0 rounded-2xl pointer-events-none ${
                positive
                  ? "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.25),transparent_60%)]"
                  : "bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.25),transparent_60%)]"
              }`}
            />

            <div className="relative flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-800"}`}
                >
                  {s.name}
                </p>
              </div>

              <p
                className={`text-lg font-bold leading-tight whitespace-nowrap ${
                  positive ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{s.price.toFixed(2)}
              </p>
            </div>

            <div
              className={`relative h-px my-3 ${isDark ? "bg-[#9303C5]/30" : "bg-slate-300/50"}`}
            />

            <div className="relative flex gap-2">
              <div
                className={`flex-1 rounded-xl backdrop-blur px-2 py-2 text-center shadow-inner ${
                  isDark ? "bg-white/10" : "bg-white/60"
                }`}
              >
                <p
                  className={`text-[11px] ${isDark ? "text-gray-400" : "text-slate-500"}`}
                >
                  Bid
                </p>
                <p
                  className={`text-sm font-semibold truncate ${isDark ? "text-[#d8b4fe]" : "text-slate-800"}`}
                >
                  ₹{bid}
                </p>
              </div>

              <div
                className={`flex-1 rounded-xl backdrop-blur px-2 py-2 text-center shadow-inner ${
                  isDark ? "bg-white/10" : "bg-white/60"
                }`}
              >
                <p
                  className={`text-[11px] ${isDark ? "text-gray-400" : "text-slate-500"}`}
                >
                  Ask
                </p>
                <p
                  className={`text-sm font-semibold truncate ${isDark ? "text-[#d8b4fe]" : "text-slate-800"}`}
                >
                  ₹{ask}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const isFullPage = view !== "auth";
  const viewButtons: { label: string; key: View; icon: React.ReactNode }[] = [
    {
      label: "Market News",
      key: "news",
      icon: <Newspaper className="h-4 w-4" />,
    },
    {
      label: "Live Leaderboard",
      key: "leaderboard",
      icon: <Award className="h-4 w-4" />,
    },
    {
      label: "Share View",
      key: "shares",
      icon: <Sparkles className="h-4 w-4" />,
    },
  ];

  /* ────────────────────────────────────────── */
  /*                 MAIN RETURN                */
  /* ────────────────────────────────────────── */
  return (
    <div
      className={`min-h-screen w-full overflow-hidden ${
        isDark
          ? "bg-gradient-to-br from-[#02060E] via-[#2a0140] to-[#9303C5]"
          : "bg-[#F4F6FB]"
      } ${isFullPage ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-2"}`}
    >
      {/* ================= MOBILE CURVED HEADER ================= */}
      {!isFullPage && (
        <div
          className={`lg:hidden relative w-full pt-6 pb-8 overflow-hidden transition-all duration-500 ${
            isDark
              ? "bg-gradient-to-br from-[#02060E] via-[#2a0140] to-[#9303C5]"
              : "bg-[#261753]"
          }`}
        >
          <div
            className={`absolute left-1/2 -bottom-12 w-[160%] h-28 rounded-[100%] transition-all duration-500 ${
              isDark
                ? "bg-gradient-to-br from-[#2a0140] to-[#9303C5]"
                : "bg-[#B09EE4]"
            } -translate-x-1/2`}
          />

          <div className="relative z-10 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <img
                src="/Transparent logo.png"
                alt="Logo"
                className="h-14 w-14 object-contain"
              />
              <div className="leading-tight text-left">
                <span
                  className={`text-base font-extrabold tracking-wide ${isDark ? "text-[#d8b4fe]" : "text-[#B09EE4]"}`}
                >
                  Finance Committee
                </span>
                <span
                  className={`block text-xs font-medium ${isDark ? "text-gray-400" : "text-[#6d6a7c]"}`}
                >
                  FOSTIIMA Chapter
                </span>
              </div>
            </div>
            {/* Theme Toggle for Mobile */}
            <div className="relative z-10 flex items-center justify-between px-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* ================= DESKTOP LEFT PANEL ================= */}
      {!isFullPage && (
        <div
          className={`hidden lg:flex relative justify-center items-center overflow-hidden rounded-r-[75px] transition-all duration-500 ${
            isDark
              ? "bg-gradient-to-br from-[#02060E] via-[#2a0140] to-[#9303C5]"
              : "bg-[#B09EE4]"
          }`}
        >
          <div
            className={`absolute inset-0 rounded-r-[75px] z-0 transition-all duration-700 ease-out mr-[20px] ${
              isDark ? "bg-[#02060E]/80" : "bg-[#261753]"
            }`}
          />

          {/* Theme Toggle for Desktop - Top Right Corner */}
          <div className="absolute top-6 right-12 z-20">
            <ThemeToggle />
          </div>

          {/* Illustration */}
          <div className="relative z-10 px-6 sm:px-8">
            <img
              src="/login-vector.svg"
              alt="Signup Illustration"
              width={400}
              height={400}
              className="max-w-full h-auto"
            />
          </div>

          {/* Floating Dots */}
          <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-white/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-white/15 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-white/25 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-1/5 left-1/5 w-2.5 h-2.5 bg-white/20 rounded-full animate-pulse delay-200"></div>
          <div className="absolute bottom-1/5 right-1/3 w-3.5 h-3.5 bg-white/15 rounded-full animate-pulse delay-1200"></div>

          {/* Logo + Text */}
          <div className="absolute top-6 left-10 flex items-center gap-3 z-10">
            <img
              src="/Transparent logo.png"
              alt="Logo"
              width={65}
              height={65}
              className="object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span
                className={`text-lg font-extrabold tracking-wider ${
                  isDark ? "text-[#d8b4fe]" : "text-[#B09EE4]"
                }`}
              >
                Finance Committee
              </span>
              <span
                className={`text-base font-semibold ${
                  isDark ? "text-gray-400" : "text-[#6d6a7c]"
                }`}
              >
                FOSTIIMA Chapter
              </span>
            </div>
          </div>

          {/* Copyright */}
          <p
            className={`absolute bottom-6 left-6 text-xs z-10 ${
              isDark ? "text-gray-500" : "text-white/50"
            }`}
          >
            © 2026 Finance Committee – FOSTIIMA
          </p>
        </div>
      )}

      {/* ───────── RIGHT AUTH PANEL ───────── */}
      <div
        className={`flex ${
          isFullPage
            ? "items-start justify-center py-10"
            : "items-center justify-center"
        } px-4`}
      >
        <Card
          className={`w-full ${
            isFullPage ? "max-w-6xl min-h-[85vh]" : "max-w-md"
          } rounded-2xl shadow-xl border transition-all duration-300 ${
            isDark
              ? "bg-[#02060E]/80 backdrop-blur-sm border-[#9303C5]/30"
              : "bg-white"
          }`}
        >
          <CardHeader className="pb-6">
            {/* Header Row */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              {view !== "auth" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("auth")}
                  className={`rounded-full px-3 py-2 transition-all whitespace-nowrap ${
                    isDark
                      ? "border-[#9303C5] text-[#d8b4fe] hover:bg-[#2a0140]/50"
                      : "border-[#B09EE4] text-[#6B5FB5] hover:bg-[#B09EE4]/10"
                  }`}
                >
                  ← Back
                </Button>
              )}

              <div className="flex items-center justify-center gap-2 text-center">
                {view !== "auth" && (
                  <img
                    src="/Transparent logo.png"
                    alt="FBS Logo"
                    className="h-12 w-12 object-contain"
                  />
                )}

                <CardTitle className="text-xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#B09EE4] via-[#8F7AE6] to-[#6B5FB5] bg-clip-text text-transparent text-center">
                  FOSTIIMA Stock Exchange
                </CardTitle>
              </div>
            </div>

            {/* Navigation buttons only on auth */}
            {view === "auth" && (
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {viewButtons.map((btn) => (
                  <Button
                    key={btn.key}
                    variant="outline"
                    onClick={() => setView(btn.key)}
                    className={`rounded-full px-5 py-2 text-sm transition flex items-center gap-2 ${
                      isDark
                        ? "border-[#9303C5] text-[#d8b4fe] hover:bg-[#2a0140]/50"
                        : "hover:bg-indigo-50"
                    }`}
                  >
                    {btn.icon}
                    {btn.label}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* ① Auth Forms */}
            {view === "auth" && (
              <Tabs
                value={authTab}
                onValueChange={(v) => setAuthTab(v as "login" | "signup")}
              >
                <TabsList
                  className={`grid w-full grid-cols-2 mb-6 rounded-lg p-1 ${
                    isDark ? "bg-[#2a0140]/50" : "bg-[#F1ECFF]"
                  }`}
                >
                  <TabsTrigger
                    value="login"
                    className={`rounded-md font-medium ${
                      isDark
                        ? "data-[state=active]:bg-[#9303C5] data-[state=active]:text-white data-[state=active]:shadow-lg"
                        : "data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-indigo-600"
                    }`}
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className={`rounded-md font-medium ${
                      isDark
                        ? "data-[state=active]:bg-[#9303C5] data-[state=active]:text-white data-[state=active]:shadow-lg"
                        : "data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-indigo-600"
                    }`}
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* login */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        htmlFor="email"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className={`h-12 rounded-lg border ${
                          isDark
                            ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5]"
                            : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div>
                      <Label
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        htmlFor="password"
                      >
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className={`h-12 rounded-lg border ${
                          isDark
                            ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5]"
                            : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <Button
                      className={`w-full h-12 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                        isDark
                          ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] text-white hover:from-[#7B02A8] hover:to-[#5B0186]"
                          : "bg-gradient-to-r from-[#B09EE4] to-[#8F7AE6] text-white hover:from-[#9A86DB] hover:to-[#7C67D8]"
                      }`}
                    >
                      Login
                    </Button>
                  </form>
                </TabsContent>

                {/* signup */}
                <TabsContent value="signup">
                  <form
                    autoComplete="off"
                    onSubmit={handleSignup}
                    className="space-y-3"
                  >
                    <div>
                      <Label
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        htmlFor="name"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        className={`h-12 rounded-lg border ${
                          isDark
                            ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5]"
                            : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div>
                      <Label
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        htmlFor="signup-email"
                      >
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        className={`h-12 rounded-lg border ${
                          isDark
                            ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5]"
                            : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div>
                      <Label
                        className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                        htmlFor="signup-password"
                      >
                        Password
                      </Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                        className={`h-12 rounded-lg border ${
                          isDark
                            ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5]"
                            : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label
                          className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                          htmlFor="role"
                        >
                          Role
                        </Label>
                        <select
                          name="role"
                          className={`w-full h-12 rounded-lg border ${
                            isDark
                              ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5]"
                              : "border-gray-300 bg-[#F8F6FF]"
                          }`}
                          required
                        >
                          <option
                            value="participant"
                            className={isDark ? "bg-[#02060E]" : ""}
                          >
                            Participant
                          </option>
                          <option
                            value="employee"
                            className={isDark ? "bg-[#02060E]" : ""}
                          >
                            Employee
                          </option>
                          <option
                            value="admin"
                            className={isDark ? "bg-[#02060E]" : ""}
                          >
                            Admin
                          </option>
                        </select>
                      </div>
                      <div id="secret-key-container">
                        <Label
                          className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                          htmlFor="secretKey"
                        >
                          Secret Key (Employee / Admin)
                        </Label>
                        <Input
                          id="secretKey"
                          name="secretKey"
                          placeholder="Enter secret key"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          onFocus={(e) => (e.target.value = "")}
                          className={`h-12 rounded-lg border ${
                            isDark
                              ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:ring-[#9303C5] focus:border-[#9303C5] placeholder:text-gray-500"
                              : "bg-[#F8F6FF] border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                          }`}
                        />
                        <p
                          className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Leave blank for Participant registration
                        </p>
                      </div>
                    </div>
                    <Button
                      className={`w-full h-12 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                        isDark
                          ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] text-white hover:from-[#7B02A8] hover:to-[#5B0186]"
                          : "bg-gradient-to-r from-[#B09EE4] to-[#8F7AE6] text-white hover:from-[#9A86DB] hover:to-[#7C67D8]"
                      }`}
                    >
                      Sign Up
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {/* ② Market News */}
                {view === "news" && <MarketNews />}

                {/* ③ Leaderboard */}
                {view === "leaderboard" && <LiveLeaderboard />}

                {/* ④ Shares grid */}
                {view === "shares" && <ShareGrid />}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
