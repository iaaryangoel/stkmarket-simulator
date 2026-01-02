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

interface Share {
  _id: string;
  name: string;
  price: number;
  change: number;
  lockedUntil?: string | null;
}

const socket = io(import.meta.env.VITE_SOCKET_URL); // 🔌

const AdminDashboard = () => {
  const [shares, setShares] = useState<Share[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [newShare, setNewShare] = useState({ name: "", price: 0 });
  const [newNews, setNewNews] = useState({
    headline: "",
    sentiment: "positive",
    affectedShares: [] as string[],
    impact: 1,
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNews = async () => {
    const res = await axiosInstance.get("/news");
    setNews(res.data);
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

    socket.on("news:new", (news) => {
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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const bumpShare = async (id: string, dir: "inc" | "dec") => {
    try {
      await axiosInstance.post(`/shares/${id}/${dir}`);
    } catch (err: any) {
      alert(err.response?.data?.msg || "Update failed");
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
    <div className="space-y-6">
      {/* ───────── Share Management ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Shares</CardTitle>
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
                  className="border p-2 rounded flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <strong>{sh.name}</strong> : ₹{sh.price.toFixed(2)}
                    {locked && <Badge className="ml-2">locked</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => bumpShare(sh._id, "inc")}
                    >
                      +2%
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => bumpShare(sh._id, "dec")}
                    >
                      ‑2%
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
            placeholder="Headline"
            value={newNews.headline}
            onChange={(e) =>
              setNewNews({ ...newNews, headline: e.target.value })
            }
          />

          <div className="flex flex-wrap gap-2 items-start">
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
                <div className="absolute z-10 w-full bg-white border rounded shadow p-2 max-h-60 overflow-y-auto">
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
              className="border rounded px-2 py-1"
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
          <ul className="space-y-4">
            {news.map((n) => (
              <li key={n._id} className="border p-3 rounded">
                <div className="flex justify-between items-center mb-1">
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
                <p className="text-xs text-muted-foreground">
                  {new Date(n.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ───────── Leaderboard ───────── */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Live Leaderboard (Top 5)</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-gray-500">No data</p>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
