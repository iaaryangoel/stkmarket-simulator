// src/components/LoginForm.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

/* ────────────────────────────────────────────────────────── */
/*                      helper types                          */
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
/* ────────────────────────────────────────────────────────── */

const socket = io(import.meta.env.VITE_SOCKET_URL);

const LoginForm = ({ onLogin }: { onLogin: (u: any) => void }) => {
  /* ------------ auth form state ------------ */
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  /* ------------ top‑level view ��------------ */
  type View = "auth" | "news" | "leaderboard" | "shares";
  const [view, setView] = useState<View>("auth");

  /* ------------ data for the three views --- */
  const [news, setNews] = useState<NewsItem[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const { toast } = useToast();

  /* ========== ENV secrets for signup ======== */
  const EMPLOYEE_SECRET = import.meta.env.VITE_EMPLOYEE_SECRET;
  const ADMIN_SECRET    = import.meta.env.VITE_ADMIN_SECRET;

  /* ────────────────────────────────────────── */
  /*         data fetch & socket updates        */
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
    socket.on("news:new",   (n: NewsItem) =>
      setNews((prev) => [n, ...prev])           // newest on top
    );

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("news:new");
    };
  }, []);

  /* ────────────────────────────────────────── */
  /*                 AUTH LOGIC                */
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
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
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
        secretKey
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
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  /* ────────────────────────────────────────── */
  /*            SMALL REUSABLE VIEWS           */
  /* ────────────────────────────────────────── */

  const MarketNews = () => (
    <div className="space-y-4">
      {news.map((n, idx) => (
        <div
          key={n._id}
          className={`border p-3 rounded ${
            idx === 0 ? "bg-yellow-100 animate-pulse" : "bg-white"
          }`}
        >
          {idx === 0 && (
            <span className="mr-2 inline-block bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              BREAKING NEWS
            </span>
          )}
          <span className="font-semibold">{n.headline}</span>{" "}
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(n.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );

  const LiveLeaderboard = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Rank</th>
            <th className="p-2 text-left">Participant</th>
            <th className="p-2 text-right">Net Worth</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((p, i) => (
            <tr key={p.participantId} className="border-b">
              <td className="p-2">{i + 1}</td>
              <td className="p-2">
                {p.name} ({p.participantId})
              </td>
              <td className="p-2 text-right">
                ₹{p.totalNetWorth.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const ShareGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {shares.map((s) => {
        const bid = (s.price * 0.98).toFixed(2);
        const ask = (s.price * 1.02).toFixed(2);
        return (
          <div
            key={s._id}
            className={`rounded p-4 shadow text-white ${
              s.change >= 0 ? "bg-green-600" : "bg-red-600"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{s.name}</span>
              <span className="text-lg">₹{s.price.toFixed(2)}</span>
            </div>
            <div className="mt-2 text-sm grid grid-cols-2 gap-1">
              <div>
                <span className="block font-semibold">Bid</span>
                <span>₹{bid}</span>
              </div>
              <div>
                <span className="block font-semibold">Ask</span>
                <span>₹{ask}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ────────────────────────────────────────── */
  /*                 MAIN RETURN                */
  /* ────────────────────────────────────────── */
  return (
    <Card className={`w-full ${
    view === "shares"
      ? "max-w-[80%]"
      : "max-w-xl"
  } bg-white/95 backdrop-blur-sm border-0 shadow-2xl`}>
      <CardHeader className="text-center space-y-3">
        <CardTitle className="text-2xl font-bold text-slate-900">
          FBS Stock Market
        </CardTitle>

        {/* top nav buttons */}
        {view === "auth" ? (
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setView("news")}>
              Market News
            </Button>
            <Button variant="outline" onClick={() => setView("leaderboard")}>
              Live Leaderboard
            </Button>
            <Button variant="outline" onClick={() => setView("shares")}>
              Share View
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setView("auth")}
          >
            ← Back to Home
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {/* ① Auth Forms */}
        {view === "auth" && (
          <Tabs value={authTab} onValueChange={setAuthTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Login
                </Button>
              </form>
            </TabsContent>

            {/* signup */}
            <TabsContent value="signup">
              <form autoComplete="off" onSubmit={handleSignup} className="space-y-3">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    name="role"
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="participant">Participant</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div id="secret-key-container">
                  <Label htmlFor="secretKey">
                    Secret Key (Employee / Admin)
                  </Label>
                  <Input
                    id="secretKey"
                    name="secretKey"
                    placeholder="Enter secret key"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onFocus={(e) => e.target.value = ""}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank for Participant registration
                  </p>
                </div></div>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {/* ② Market News */}
        {view === "news" && <MarketNews />}

        {/* ③ Leaderboard */}
        {view === "leaderboard" && <LiveLeaderboard />}

        {/* ④ Shares grid */}
        {view === "shares" && <ShareGrid />}
      </CardContent>
    </Card>
  );
};

export default LoginForm;
