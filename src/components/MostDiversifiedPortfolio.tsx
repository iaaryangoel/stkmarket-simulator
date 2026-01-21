import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import axiosInstance from "@/lib/axiosInstance";
import { motion } from "framer-motion";

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

  useEffect(() => {
    axiosInstance
      .get("/admin/analytics/most-diversified")
      .then((res) => {
        const sorted = [...(res.data || [])].sort((a, b) => {
          // 🔥 Rank Logic
          // 1. More unique shares
          // 2. Lower max concentration
          // 3. Higher total value
          if (b.uniqueShares !== a.uniqueShares)
            return b.uniqueShares - a.uniqueShares;

          if (a.maxConcentration !== b.maxConcentration)
            return a.maxConcentration - b.maxConcentration;

          return b.totalValue - a.totalValue;
        });

        setData(sorted);
      });
  }, []);

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="border-b bg-slate-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          🌐 Most Diversified Portfolios
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="p-3 text-left">Rank</th>
                <th className="p-3 text-left">Participant</th>
                <th className="p-3 text-right">Stocks</th>
                <th className="p-3 text-left">Max Exposure</th>
                <th className="p-3 text-right">Portfolio Value</th>
              </tr>
            </thead>

            <tbody>
              {data.map((p, i) => (
                <motion.tr
                  key={p.participantId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b hover:bg-muted/30 transition"
                >
                  {/* Rank */}
                  <td className="p-3 font-semibold">
                    {i === 0 && "🥇"}
                    {i === 1 && "🥈"}
                    {i === 2 && "🥉"}
                    {i > 2 && i + 1}
                  </td>

                  {/* Participant */}
                  <td className="p-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.participantId}
                    </div>
                  </td>

                  {/* Unique Stocks */}
                  <td className="p-3 text-right">
                    <Badge variant="secondary">{p.uniqueShares}</Badge>
                  </td>

                  {/* Max Exposure */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={p.maxConcentration * 100}
                        className="h-2"
                      />
                      <span className="text-xs font-medium">
                        {(p.maxConcentration * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Total Value */}
                  <td className="p-3 text-right font-medium">
                    ₹{p.totalValue.toLocaleString()}
                  </td>
                </motion.tr>
              ))}

              {!data.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No diversification data available
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
