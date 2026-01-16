import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Users, ArrowLeftRight } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";
import { AxiosError } from "axios";
import { motion } from "framer-motion";

interface Share {
  _id: string;
  name: string;
  price: number;
  change: number;
}

interface Holding {
  shareSymbol: string;
  quantity: number;
}

interface User {
  _id: string;
  name: string;
  role: "admin" | "employee" | "participant";
  participantId: string;
  balance: number;
  holdings?: Holding[];
}

const socket = io(import.meta.env.VITE_SOCKET_URL); // adjust for production
const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
  };

const EmployeeDashboard = ({ user }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const { toast } = useToast();

  /* --- initial load + realtime listeners ---------------------------- */
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          axiosInstance.get("/shares"),
          axiosInstance.get("/users"),
        ]);
        setShares(sRes.data || []);
        setUsers(uRes.data || []);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive",
        });
      }
    };
    loadInitial();

    /* share updates --------------------------------------------------- */
    socket.on("share:update", (updated) => {
      setShares((prev) =>
        prev.some((s) => s._id === updated._id)
          ? prev.map((s) => (s._id === updated._id ? updated : s))
          : [...prev, updated]
      );
    });
    socket.on("share:add", (newShare) => {
      setShares((prev) => [...prev, newShare]);

      toast({
        title: "📈 New Share Listed",
        description: `${newShare.name} listed at ₹${newShare.price}`,
      });
    });

    socket.on("share:delete", (id) => {
      setShares((prev) => prev.filter((s) => s._id !== id));
    });

    /* user / participant updates -------------------------------------- */
    socket.on("user:update", (changedUsers: User[]) => {
      setUsers((prev) => {
        const map = new Map(prev.map((u) => [u.participantId, u]));
        changedUsers.forEach((u: User) => map.set(u.participantId, u));
        return Array.from(map.values());
      });
    });

    socket.on("market:status", ({ running }) => {
      toast({
        title: running ? "📊 Market Resumed" : "⛔ Market Paused",
      });
    });

    return () => {
      socket.off("share:update");
      socket.off("share:delete");
      socket.off("share:add");
      socket.off("user:update");
      socket.off("market:status");
    };
  }, []);

  /* helpers ----------------------------------------------------------- */
  const participants = users.filter((u) => u.role === "participant");

  const handleDirectTrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formE1 = e.currentTarget;
    const form = new FormData(formE1);
    const payload = {
      type: "direct",
      action: form.get("action"),
      participantId: form.get("participantId"),
      shareSymbol: form.get("shareSymbol"),
      quantity: parseInt(form.get("quantity") as string, 10),
    };

    try {
      const res = await axiosInstance.post("/trade", payload);
      toast({ title: "Trade Executed", description: res.data.message });
      // local state will update via socket `user:update`
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast({
          title: "Trade Failed",
          description: err.response?.data?.message || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: "Unexpected error occurred",
          variant: "destructive",
        });
      }
    }
    formE1.reset();
  };

  const handleP2PTrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formE1 = e.currentTarget;
    const form = new FormData(formE1);
    const payload = {
      type: "p2p",
      buyerParticipantId: form.get("buyerParticipantId"),
      sellerParticipantId: form.get("sellerParticipantId"),
      shareSymbol: form.get("p2pShareSymbol"),
      quantity: parseInt(form.get("p2pQuantity") as string, 10),
      price: parseFloat(form.get("p2pPrice") as string),
    };

    try {
      const res = await axiosInstance.post("/trade", payload);
      toast({ title: "P2P Executed", description: res.data.message });
      // user changes come via socket
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        toast({
          title: "Trade Failed",
          description: err.response?.data?.message || "Unknown error",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: "Unexpected error occurred",
          variant: "destructive",
        });
      }
    }
    formE1.reset();
  };

  /* ------------------------------------------------------------------- */
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        {/* Market Overview */}
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>Market Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b hover:bg-slate-50 transition">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Change %</th>
                  </tr>
                </thead>
                <tbody>
                  {shares.map((s) => (
                    <motion.tr
                      key={s._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ backgroundColor: "#f8fafc" }}
                      className="border-b"
                    >
                      <td className="p-2">{s.name}</td>
                      <motion.td
                        key={s.price}
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="p-2 text-right font-semibold"
                      >
                        ₹{s.price.toFixed(2)}
                      </motion.td>

                      <motion.td
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-end gap-1 font-medium ${
                          s.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {s.change >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {s.change.toFixed(2)}%
                        </div>
                      </motion.td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div variants={item}>
        {/* Trading Interface */}
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>Trading Interface</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="direct">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger
                  value="direct"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4" /> Trade w/ Exchange
                </TabsTrigger>
                <TabsTrigger
                  value="p2p"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <ArrowLeftRight className="h-4 w-4" /> P2P Trade
                </TabsTrigger>
              </TabsList>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* direct tab */}
                <TabsContent value="direct" className="space-y-4">
                  <form onSubmit={handleDirectTrade} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* participant select */}
                      <div>
                        <Label>Participant</Label>
                        <select
                          name="participantId"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select</option>
                          {participants.map((p) => (
                            <option key={p._id} value={p.participantId}>
                              {p.name} ({p.participantId})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* share select */}
                      <div>
                        <Label>Share</Label>
                        <select
                          name="shareSymbol"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select</option>
                          {shares.map((s) => (
                            <option key={s._id} value={s.name}>
                              {s.name} - ₹{s.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* qty */}
                      <div>
                        <Label>Quantity</Label>
                        <Input name="quantity" type="number" min="1" required />
                      </div>
                      {/* action */}
                      <div>
                        <Label>Action</Label>
                        <select
                          name="action"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="buy">Buy from Market</option>
                          <option value="sell">Sell to Market</option>
                        </select>
                      </div>
                    </div>
                    <motion.div
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Button className="w-full h-11 text-base">
                        Execute Trade
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {/* p2p tab */}
                <TabsContent value="p2p" className="space-y-4">
                  <form onSubmit={handleP2PTrade} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* buyer */}
                      <div>
                        <Label>Buyer</Label>
                        <select
                          name="buyerParticipantId"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select buyer</option>
                          {participants.map((p) => (
                            <option key={p._id} value={p.participantId}>
                              {p.name} ({p.participantId})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* seller */}
                      <div>
                        <Label>Seller</Label>
                        <select
                          name="sellerParticipantId"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select seller</option>
                          {participants.map((p) => (
                            <option key={p._id} value={p.participantId}>
                              {p.name} ({p.participantId})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* share */}
                      <div>
                        <Label>Share</Label>
                        <select
                          name="p2pShareSymbol"
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select</option>
                          {shares.map((s) => (
                            <option key={s._id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* qty */}
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          name="p2pQuantity"
                          type="number"
                          min="1"
                          required
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                        />
                      </div>
                      {/* price */}
                      <div>
                        <Label>Price/Share</Label>
                        <Input
                          name="p2pPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          className="focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                        />
                      </div>
                    </div>
                    <Button className="w-full h-11 text-base">
                      Execute P2P
                    </Button>
                  </form>
                </TabsContent>
              </motion.div>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
      <motion.div variants={item}>
        {/* Active Participants */}
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>Active Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border-b hover:bg-slate-50 transition">
                    <th className="p-2 text-left">PID</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-right">Balance</th>
                    <th className="p-2 text-right">Holdings</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p._id} className="border-b">
                      <td className="p-2">{p.participantId}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-right">
                        ₹{p.balance.toLocaleString()}
                      </td>
                      <td className="p-2 text-right">
                        {p.holdings?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default EmployeeDashboard;
