import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Award,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { io } from "socket.io-client";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

const socket = io(import.meta.env.VITE_SOCKET_URL);

type MostTradedParticipant = {
  participantId: string;
  name: string;
  totalTrades: number;
  totalQuantity: number;
  totalTurnover: number;
  topShare: string;
  topShareQuantity: number;
};

const MostTradedPortfolio = () => {
  const [data, setData] = useState<MostTradedParticipant[]>([]);
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const fetchData = async () => {
    try {
      const res = await axiosInstance.get<MostTradedParticipant[]>(
        "/admin/analytics/most-traded",
      );
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
    <Card
      className={`rounded-2xl border transition-all duration-300 ${
        isDark
          ? "bg-[#02060E]/80 backdrop-blur-sm border-[#9303C5]/30 shadow-xl"
          : "hover:shadow-lg transition-shadow duration-300"
      }`}
    >
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`}
          >
            <Activity
              className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
            />
          </div>
          <CardTitle
            className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
          >
            Most Traded Portfolios
          </CardTitle>
          {isDark && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#9303C5]/20 text-[#d8b4fe]">
              Live Analytics
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? "border-[#9303C5]/30 bg-[#2a0140]/30" : "bg-gray-50"
                }`}
              >
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Participant
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Trades
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Top Share
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Turnover
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((p, i) => (
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
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-2xl">👑</span>}
                      {i === 1 && <span className="text-2xl">🥈</span>}
                      {i === 2 && <span className="text-2xl">🥉</span>}
                      {i > 2 && (
                        <span
                          className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
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

                  {/* Participant */}
                  <td className="px-4 py-3">
                    <div
                      className={`font-semibold ${isDark ? "text-white" : "text-gray-800"}`}
                    >
                      {p.name}
                    </div>
                    <div
                      className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {p.participantId}
                    </div>
                  </td>

                  {/* Trades */}
                  <td className="px-4 py-3 text-right">
                    <Badge
                      className={`rounded-full px-3 py-1 ${
                        isDark
                          ? "bg-[#9303C5]/20 text-[#d8b4fe] border border-[#9303C5]/30"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {p.totalTrades} trades
                    </Badge>
                  </td>

                  {/* Quantity */}
                  <td
                    className={`px-4 py-3 text-right font-semibold ${isDark ? "text-white" : "text-gray-800"}`}
                  >
                    {p.totalQuantity.toLocaleString()}
                  </td>

                  {/* Top Share */}
                  <td className="px-4 py-3">
                    <Badge
                      className={`rounded-full px-3 py-1 ${
                        isDark
                          ? "bg-[#2a0140]/50 text-[#d8b4fe] border border-[#9303C5]/30"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {p.topShare}
                    </Badge>
                  </td>

                  {/* Turnover */}
                  <td className="px-4 py-3 text-right">
                    <div
                      className={`font-bold text-lg ${isDark ? "text-[#d8b4fe]" : "text-purple-700"}`}
                    >
                      ₹{p.totalTurnover.toLocaleString()}
                    </div>
                  </td>
                </motion.tr>
              ))}

              {!data.length && (
                <tr>
                  <td
                    colSpan={6}
                    className={`p-8 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp className="h-12 w-12 opacity-30" />
                      <p>No trade data available</p>
                      <p className="text-sm">
                        Trades will appear here once participants start trading
                      </p>
                    </div>
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
