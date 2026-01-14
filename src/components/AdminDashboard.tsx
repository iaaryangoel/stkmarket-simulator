// AdminDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";
import { AxiosError } from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

const socket = io(import.meta.env.VITE_SOCKET_URL); // 🔌

const AdminDashboard = ({ user }) => {
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [marketRunning, setMarketRunning] = useState(true);

  const [bumpDialogOpen, setBumpDialogOpen] = useState(false);
  const [bumpValue, setBumpValue] = useState<number>(0);
  const [bumpTarget, setBumpTarget] = useState<{
    id: string;
    sign: "+" | "-";
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
          : "Market fluctuations are haulted.",
      });
    });

    // Real-time updates
    socket.on("share:add", (newShare) => {
      setShares((prev) => [...prev, newShare]);

      toast({
        title: "📈 New Share Added",
        description: `${newShare.name} listed at ₹${newShare.price}`,
      });
    });

    socket.on("share:update", (updatedShare: Share) => {
      setShares((prev) =>
        prev.map((s) => (s._id === updatedShare._id ? updatedShare : s))
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

      // instantly reflect without refresh
      setNews((prev) => [news, ...prev]);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("share:add");
      socket.off("news:new");
      socket.off("market:status");
      document.removeEventListener("mousedown", handleClickOutside);
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
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.response?.data?.msg || "Something went wrong",
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ───────── Share Management ───────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Shares</CardTitle>

          <Button
            onClick={toggleMarket}
            className={
              marketRunning
                ? "bg-green-600 hover:bg-green-700 text-white animate-pulse"
                : "bg-red-600 hover:bg-red-700 text-white"
            }
          >
            {marketRunning ? "● Market ON" : "● Market OFF"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Share Name"
              value={newShare.name}
              onChange={(e) =>
                setNewShare({ ...newShare, name: e.target.value.toUpperCase() })
              }
            />
            <Input
              type="number"
              placeholder="Price"
              value={newShare.price}
              onChange={(e) =>
                setNewShare({ ...newShare, price: +e.target.value })
              }
            />
            <Button onClick={handleAddShare}>Add</Button>
          </div>

          <ul className="space-y-2">
            {shares.map((sh) => {
              const locked =
                sh.lockedUntil && new Date(sh.lockedUntil) > new Date();
              return (
                <li
                  key={sh._id}
                  className="border rounded-lg px-4 py-3 flex justify-between items-center hover:bg-slate-50 transition"
                >
                  <div className="flex-1">
                    <strong>{sh.name}</strong> : ₹{sh.price.toFixed(2)}
                    {locked && <Badge className="ml-2">locked</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => openBumpDialog(sh._id, "+")}
                    >
                      +
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => openBumpDialog(sh._id, "-")}
                    >
                      −
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteShare(sh._id)}
                    >
                      ❌
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {/* ───────── News Management ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>Manage News</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="min-h-[80px]"
            placeholder="Headline"
            value={newNews.headline}
            onChange={(e) =>
              setNewNews({ ...newNews, headline: e.target.value })
            }
          />

          <div className="flex flex-wrap gap-2">
            {/* multiselect */}
            <div className="relative min-w-[200px]" ref={dropdownRef}>
              <Button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-left w-full"
              >
                {newNews.affectedShares.length
                  ? `Selected: ${newNews.affectedShares.join(", ")}`
                  : "Select Shares"}
              </Button>
              {dropdownOpen && (
                <div className="absolute z-10 bg-white border rounded shadow p-2 w-full">
                  {shares.map((sh) => (
                    <label key={sh._id} className="flex gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={newNews.affectedShares.includes(sh.name)}
                        onChange={(e) => {
                          const list = newNews.affectedShares;
                          const updated = e.target.checked
                            ? [...list, sh.name]
                            : list.filter((s) => s !== sh.name);
                          setNewNews({ ...newNews, affectedShares: updated });
                        }}
                      />
                      {sh.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Input
              type="number"
              min={1}
              max={5}
              className="w-20"
              value={newNews.impact}
              onChange={(e) =>
                setNewNews({ ...newNews, impact: +e.target.value })
              }
            />

            <select
              className="border rounded px-3 py-2"
              value={newNews.sentiment}
              onChange={(e) =>
                setNewNews({ ...newNews, sentiment: e.target.value })
              }
            >
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>

            <Button onClick={handleAddNews}>Post News</Button>
          </div>
        </CardContent>
      </Card>

      {/* ───────── News List ───────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" /> Market News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {news.map((n) => (
              <li key={n._id} className="relative border rounded-lg p-4">
                <div
                  className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${
                    n.sentiment === "positive" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div className="flex justify-between">
                  <h4 className="font-semibold">{n.headline}</h4>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      axiosInstance.delete(`/news/${n._id}`).then(fetchNews)
                    }
                  >
                    Delete
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Affected: {n.affectedShares.join(", ")} | Impact: {n.impact}
                </p>
                <Badge
                  variant={
                    n.sentiment === "positive" ? "default" : "destructive"
                  }
                >
                  {n.sentiment}
                </Badge>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ───────── Leaderboard ───────── */}
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            🏆 Live Leaderboard (Top 5)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50">
                    <th className="px-5 py-3 text-left font-medium">Rank</th>
                    <th className="px-5 py-3 text-left font-medium">
                      Participant
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      Net Worth
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {leaderboard.map((p, i) => (
                    <tr
                      key={p.participantId}
                      className="hover:bg-slate-50 transition"
                    >
                      {/* Rank */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-xs font-bold
                      ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                          ? "bg-slate-200 text-slate-700"
                          : i === 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                        >
                          {i + 1}
                        </span>
                      </td>

                      {/* Participant */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 truncate max-w-[220px]">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {p.participantId}
                        </div>
                      </td>

                      {/* Net Worth */}
                      <td className="px-5 py-4 text-right">
                        <div className="font-semibold text-slate-800">
                          ₹{p.totalNetWorth.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────── Bump Percentage Dialog ───────── */}
      <Dialog open={bumpDialogOpen} onOpenChange={setBumpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bumpTarget?.sign === "+"
                ? "Increase Share Price"
                : "Decrease Share Price"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              type="number"
              min={1}
              placeholder="Enter percentage"
              value={bumpValue}
              onChange={(e) => setBumpValue(+e.target.value)}
            />
            <p className="text-sm text-slate-500">
              Example: 5 means {bumpTarget?.sign}5%
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBumpDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBump}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
