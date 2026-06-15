import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  PieChart,
  Shield,
  Target,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

// ---------------- TYPES ----------------

type DiversifiedParticipant = {
  participantId: string;
  name: string;
  uniqueShares: number;
  totalValue: number;
  maxConcentration: number; // 0 - 1
};

// ---------------- COMPONENT ----------------

const MostDiversifiedPortfolio = () => {
  const [data, setData] = useState<DiversifiedParticipant[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    axiosInstance.get("/admin/analytics/most-diversified").then((res) => {
      const sorted = [...(res.data || [])].sort((a, b) => {
        // 1️⃣ More unique stocks
        if (b.uniqueShares !== a.uniqueShares) {
          return b.uniqueShares - a.uniqueShares;
        }
        // 2️⃣ Lower max concentration (better spread)
        if (a.maxConcentration !== b.maxConcentration) {
          return a.maxConcentration - b.maxConcentration;
        }
        // 3️⃣ Higher total portfolio value
        if (b.totalValue !== a.totalValue) {
          return b.totalValue - a.totalValue;
        }
        // 4️⃣ Final fallback (stable order)
        return a.participantId.localeCompare(b.participantId);
      });
      setData(sorted);
    });
  }, []);

  const getConcentrationColor = (percentage: number) => {
    if (percentage < 30) return "text-green-400";
    if (percentage < 50) return "text-yellow-400";
    if (percentage < 70) return "text-orange-400";
    return "text-red-400";
  };

  const getConcentrationLabel = (percentage: number) => {
    if (percentage < 30) return "Well Diversified";
    if (percentage < 50) return "Moderate";
    if (percentage < 70) return "Concentrated";
    return "Highly Concentrated";
  };

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
            <PieChart
              className={`h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`}
            />
          </div>
          <CardTitle
            className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}
          >
            Most Diversified Portfolios
          </CardTitle>
          {isDark && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#9303C5]/20 text-[#d8b4fe]">
              Diversification Score
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
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Stocks
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Max Exposure
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Portfolio Value
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((p, i) => {
                const concentrationPercent = p.maxConcentration * 100;
                const concentrationColor =
                  getConcentrationColor(concentrationPercent);
                const concentrationLabel =
                  getConcentrationLabel(concentrationPercent);

                return (
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

                    {/* Unique Stocks */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={`rounded-full px-3 py-1 ${
                          isDark
                            ? "bg-[#9303C5]/20 text-[#d8b4fe] border border-[#9303C5]/30"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {p.uniqueShares} Stocks
                      </Badge>
                    </td>

                    {/* Max Exposure */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Progress
                          value={concentrationPercent}
                          className={`h-2 flex-1 ${
                            isDark ? "bg-[#2a0140]" : "bg-gray-200"
                          }`}
                        />
                        <div className="min-w-[70px]">
                          <span
                            className={`text-xs font-bold ${concentrationColor}`}
                          >
                            {concentrationPercent.toFixed(1)}%
                          </span>
                          <span
                            className={`text-[10px] ml-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {concentrationLabel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Value */}
                    <td className="px-4 py-3 text-right">
                      <div
                        className={`font-bold text-lg ${isDark ? "text-[#d8b4fe]" : "text-purple-700"}`}
                      >
                        ₹{p.totalValue.toLocaleString()}
                      </div>
                      <div
                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Total Value
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {!data.length && (
                <tr>
                  <td
                    colSpan={5}
                    className={`p-12 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="h-12 w-12 opacity-30" />
                      <p className="font-medium">
                        No diversification data available
                      </p>
                      <p className="text-sm">
                        Portfolio data will appear once participants start
                        trading
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

export default MostDiversifiedPortfolio;
