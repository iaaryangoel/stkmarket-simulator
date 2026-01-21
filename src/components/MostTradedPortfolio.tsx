import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL);

type MostTradedParticipant = {
  participantId: string;
  name: string;
  totalTrades: number;
  totalQuantity: number;
  totalTurnover: number; // ✅ NEW
  topShare: string;
  topShareQuantity: number; // ✅ NEW
};

const MostTradedPortfolio = () => {
  const [data, setData] = useState<MostTradedParticipant[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const res = await axiosInstance.get<MostTradedParticipant[]>(
        "/admin/analytics/most-traded",
      );

      // 🔥 SORT: most trades first
      setData(res.data || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
    socket.on("trade:executed", fetchData);

    return () => {
      socket.off("trade:executed", fetchData);
    };
  }, []);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>📊 Most Traded Portfolios</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Participant</th>
                <th className="p-2 text-right">Trades</th>
                <th className="p-2 text-right">Quantity</th>
                <th className="p-2 text-left">Top Share</th>
                <th className="p-2 text-right">Turnover</th>
              </tr>
            </thead>

            <tbody>
              {data.map((p, i) => (
                <tr
                  key={p.participantId}
                  className="border-b hover:bg-muted/30 transition"
                >
                  {/* Rank */}
                  <td className="p-2 font-semibold">
                    {i === 0 && "🥇"}
                    {i === 1 && "🥈"}
                    {i === 2 && "🥉"}
                    {i > 2 && i + 1}
                  </td>

                  {/* Participant */}
                  <td className="p-2">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.participantId}
                    </div>
                  </td>

                  {/* Trades */}
                  <td className="p-2 text-right">
                    <Badge variant="secondary">{p.totalTrades}</Badge>
                  </td>

                  {/* Quantity */}
                  <td className="p-2 text-right">{p.totalQuantity}</td>

                  {/* Top Share */}
                  <td className="p-2">
                    <Badge>{p.topShare}</Badge>
                  </td>
                  <td className="p-2 text-right">
                    ₹{p.totalTurnover.toLocaleString()}
                  </td>
                </tr>
              ))}

              {!data.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No trade data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MostTradedPortfolio;
