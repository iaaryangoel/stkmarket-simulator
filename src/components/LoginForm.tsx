// src/components/LoginForm.tsx
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
import { TrendingUp, TrendingDown } from "lucide-react";
import { AxiosError } from "axios";

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
  /* ------------ auth form state ------------ */
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  /* ------------ top‑level view ��------------ */
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
          : [...prev, upd]
      )
    );
    socket.on("share:delete", (id: string) =>
      setShares((prev) => prev.filter((s) => s._id !== id))
    );
    socket.on(
      "news:new",
      (n: NewsItem) => setNews((prev) => [n, ...prev]) // newest on top
    );

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("news:new");
    };
  }, []);

  /* ────────────────────────────────────────── */
  /*                 AUTHLOGIC                */
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
  /*            SMALL REUSABLE VIEWS           */
  /* ────────────────────────────────────────── */

  const MarketNews = () => {
    if (news.length === 0) {
      return (
        <div className="rounded-xl border bg-white p-5 text-center text-base text-slate-500">
          No market news available yet 📰
        </div>
      );
    }

    const [breaking, ...others] = news;

    return (
      <div className="space-y-8">
        {/* 🔥 BREAKING NEWS */}
        <div
          className="relative rounded-2xl border border-yellow-200 
bg-gradient-to-r from-yellow-50 to-yellow-100 
p-8 shadow-lg animate-pulse"
        >
          {/* LIVE badge */}
          <span className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white">
            🔥 BREAKING
          </span>

          <h3 className="text-lg sm:text-2xl font-bold text-slate-900 pr-20 sm:pr-36 leading-snug">
            {breaking.headline}
          </h3>

          <p className="mt-3 text-sm text-slate-600">
            {new Date(breaking.timestamp).toLocaleString()}
          </p>
        </div>

        {/* 📰 OTHER MARKET NEWS */}
        {others.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((n, index) => (
              <div
                key={n._id}
                className="rounded-xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  animation: `fadeInUp 0.4s ease ${(index + 1) * 0.1}s both`,
                }}
              >
                <h4 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                  {n.headline}
                </h4>

                <p className="mt-3 text-sm text-slate-500">
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const LiveLeaderboard = () => (
    <div className="rounded-3xl border bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b bg-gradient-to-r from-[#F5F2FF] to-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            🏆 Live Leaderboard
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 animate-pulse">
              LIVE
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Rankings based on total net worth
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[520px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-slate-600">
              <th className="px-6 py-3 text-left font-medium">Rank</th>
              <th className="px-6 py-3 text-left font-medium">Participant</th>
              <th className="px-6 py-3 text-right font-medium">Net Worth</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-500">
                  No leaderboard data available yet 🚀
                </td>
              </tr>
            )}

            {leaderboard.slice(0, 10).map((p, i) => (
              <tr
                key={p.participantId}
                className={`transition-all hover:bg-slate-50 hover:scale-[1.01]
              ${
                i === 0
                  ? "bg-gradient-to-r from-yellow-50 to-white"
                  : i === 1
                  ? "bg-gradient-to-r from-slate-100 to-white"
                  : i === 2
                  ? "bg-gradient-to-r from-amber-50 to-white"
                  : ""
              }`}
              >
                {/* Rank */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold
                ${
                  i === 0
                    ? "bg-yellow-300 text-yellow-900 shadow"
                    : i === 1
                    ? "bg-slate-300 text-slate-800"
                    : i === 2
                    ? "bg-amber-200 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                </td>

                {/* Participant */}
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-800 text-[16px] truncate max-w-[200px]">
                    {p.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {p.participantId}
                  </div>
                </td>

                {/* Net Worth */}
                <td className="px-4 py-4 text-right">
                  <div className="font-extrabold text-green-700 text-[17px] tabular-nums">
                    ₹{p.totalNetWorth.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">Net Worth</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            className={`rounded-2xl border p-4 overflow-hidden transition-all duration-200 -translate-y-0.5 hover:-translate-y-1 hover:shadow-lg ${
              positive
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {s.name}
                </p>
                {/* <p className="text-xs text-slate-500">Market Price</p> */}
              </div>

              <p
                className={`text-lg font-bold leading-tight whitespace-nowrap ${
                  positive ? "text-green-700" : "text-red-700"
                }`}
              >
                ₹{s.price.toFixed(2)}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-200 my-3" />

            {/* Bid / Ask */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                <p className="text-[11px] text-slate-500">Bid</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  ₹{bid}
                </p>
              </div>

              <div className="flex-1 rounded-xl bg-white px-2 py-2 text-center shadow-sm">
                <p className="text-[11px] text-slate-500">Ask</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
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
  const viewButtons: { label: string; key: View }[] = [
    { label: "Market News", key: "news" },
    { label: "Live Leaderboard", key: "leaderboard" },
    { label: "Share View", key: "shares" },
  ];

  /* ────────────────────────────────────────── */
  /*                 MAIN RETURN                */
  /* ────────────────────────────────────────── */
  return (
    <div
      className={`min-h-screen w-full bg-[#F4F6FB] overflow-hidden ${
        isFullPage ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-2"
      }`}
    >
      {/* ================= MOBILE CURVED HEADER ================= */}
      {!isFullPage && (
        <div className="lg:hidden relative w-full bg-[#261753] pt-6 pb-8 overflow-hidden">
          {/* OVAL CURVE */}
          <div
            className="absolute left-1/2 -bottom-12 w-[160%] h-28 
                 -translate-x-1/2 bg-[#B09EE4] rounded-[100%]"
          />

          {/* CONTENT */}
          <div className="relative z-10 flex items-center gap-3 px-6">
            <img
              src="/Transparent logo.png"
              alt="Logo"
              className="h-14 w-14 object-contain"
            />

            <div className="leading-tight text-left">
              <span className="text-base font-extrabold tracking-wide text-[#B09EE4]">
                Finance Committee
              </span>
              <span className="block text-xs font-medium text-[#6d6a7c]">
                FOSTIIMA Chapter
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= DESKTOP LEFT PANEL ================= */}
      {!isFullPage && (
        <div className="hidden lg:flex relative justify-center items-center overflow-hidden rounded-r-[75px] bg-[#B09EE4]">
          <div
            className={`absolute inset-0 bg-[#261753] rounded-r-[75px] z-0 transition-all duration-700 ease-out mr-[20px]`}
          />

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
              <span className="text-lg font-extrabold tracking-wider text-[#B09EE4]">
                Finance Committee
              </span>
              <span className="text-base font-semibold text-[#6d6a7c]">
                FOSTIIMA Chapter
              </span>
            </div>
          </div>

          {/* Copyright */}
          <p className="absolute bottom-6 left-6 text-xs text-white/50 z-10">
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
          }
    bg-white rounded-2xl shadow-xl border
    transition-all duration-300
  `}
        >
          <CardHeader className="pb-6">
            {/* Header Row */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              {/* Back button */}
              {view !== "auth" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView("auth")}
                  className="
  rounded-full px-3 py-2
  border-[#B09EE4]
  text-[#6B5FB5]
  hover:bg-[#B09EE4]/10
  transition-all
  whitespace-nowrap
"
                >
                  ← Back
                </Button>
              )}

              {/* Title + Logo */}
              <div className="flex items-center justify-center gap-2 text-center">
                {view !== "auth" && (
                  <img
                    src="/Transparent logo.png" // ⬅ replace with your logo path
                    alt="FBS Logo"
                    className="h-12 w-12 object-contain"
                  />
                )}

                <CardTitle
                  className="
          text-xl sm:text-3xl
 font-extrabold tracking-tight
          bg-gradient-to-r
          from-[#B09EE4]
          via-[#8F7AE6]
          to-[#6B5FB5]
          bg-clip-text text-transparent
          text-center
        "
                >
                  FBS Stock Market
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
                    className="rounded-full px-5 py-2 text-sm transition hover:bg-indigo-50"
                  >
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
                <TabsList className="grid w-full grid-cols-2 mb-6 rounded-lg bg-[#F1ECFF] p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-md font-medium
data-[state=active]:bg-white
data-[state=active]:shadow
data-[state=active]:text-indigo-600"
                  >
                    Login
                  </TabsTrigger>

                  <TabsTrigger
                    value="signup"
                    className="rounded-md font-medium
data-[state=active]:bg-white
data-[state=active]:shadow
data-[state=active]:text-indigo-600"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* login */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-600" htmlFor="email">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <Label
                        className="text-sm text-gray-600"
                        htmlFor="password"
                      >
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <Button
                      className="
    w-full h-12
    bg-gradient-to-r
    from-[#B09EE4]
    to-[#8F7AE6]
    hover:from-[#9A86DB]
    hover:to-[#7C67D8]
    text-white
    rounded-lg
    font-semibold
    shadow-lg
    hover:shadow-xl
    transition-all duration-200
  "
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
                      <Label className="text-sm text-gray-600" htmlFor="name">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <Label
                        className="text-sm text-gray-600"
                        htmlFor="signup-email"
                      >
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        required
                        className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <Label
                        className="text-sm text-gray-600"
                        htmlFor="signup-password"
                      >
                        Password
                      </Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                        className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600" htmlFor="role">
                          Role
                        </Label>
                        <select
                          name="role"
                          className="w-full h-12 rounded-lg border-gray-300 bg-[#F8F6FF]"
                          required
                        >
                          <option value="participant">Participant</option>
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div id="secret-key-container">
                        <Label
                          className="text-sm text-gray-600"
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
                          className="h-12 rounded-lg bg-[#F8F6FF] border-gray-300
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank for Participant registration
                        </p>
                      </div>
                    </div>
                    <Button
                      className="
    w-full h-12
    bg-gradient-to-r
    from-[#B09EE4]
    to-[#8F7AE6]
    hover:from-[#9A86DB]
    hover:to-[#7C67D8]
    text-white
    rounded-lg
    font-semibold
    shadow-lg
    hover:shadow-xl
    transition-all duration-200
  "
                    >
                      Sign Up
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            {/* ② Market News */}
            {view === "news" && <MarketNews />}

            {/* ③ Leaderboard */}
            {view === "leaderboard" && <LiveLeaderboard />}

            {/* ④ Shares grid */}
            {view === "shares" && <ShareGrid />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;
