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
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "@/components/ui/use-toast";

const socket = io(import.meta.env.VITE_SOCKET_URL);

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

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{portfolio.balance?.toLocaleString() ?? "0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Participant ID
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {user.participantId ?? "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>My Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.holdings.length === 0 ? (
            <p className="text-gray-500">No holdings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Avg Price</th>
                    <th className="text-right p-2">Current Price</th>
                    <th className="text-right p-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map((holding, index) => {
                    const share = shares.find((s) => s.name === holding.symbol);
                    const profitLoss = calculateProfitLoss(holding);
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{holding.symbol}</td>
                        <td className="text-right p-2">{holding.quantity}</td>
                        <td className="text-right p-2">
                          ₹{holding.avgPrice.toFixed(2)}
                        </td>
                        <td className="text-right p-2">
                          ₹{share?.price?.toFixed(2) ?? "N/A"}
                        </td>
                        <td
                          className={`text-right p-2 ${
                            profitLoss >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ₹{profitLoss.toFixed(2)}
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

      {/* Market Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Change %</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share) => (
                  <tr key={share._id} className="border-b">
                    <td className="p-2 font-medium">{share.name}</td>
                    <td className="text-right p-2">
                      ₹{share.price.toFixed(2)}
                    </td>
                    <td
                      className={`text-right p-2 ${
                        share.change >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {share.change >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {share.change.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                <thead>
                  <tr className="border-b">
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
                    <tr key={i} className="border-b">
                      <td className="p-2 text-sm">
                        {new Date(t.date).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            t.action === "buy" ? "default" : "destructive"
                          }
                        >
                          {t.action.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2">{t.symbol}</td>
                      <td className="p-2 text-right">{t.quantity}</td>
                      <td className="p-2 text-right">₹{t.price.toFixed(2)}</td>
                      <td className="p-2 text-right">{t.counterpart}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{item.headline}</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Rank</th>
                    <th className="p-2 text-left">Participant</th>
                    <th className="p-2 text-right">Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-medium">
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

export default ParticipantDashboard;
