import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ArrowLeftRight,
  Activity,
  Wallet,
  Building2,
  Search,
} from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { io } from "socket.io-client";
import { AxiosError } from "axios";
import { motion, Variants } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

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

interface EmployeeUser {
  _id: string;
  name: string;
  role: "admin" | "employee" | "participant";
  email?: string;
  participantId?: string;
}

const socket = io(import.meta.env.VITE_SOCKET_URL);

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

const EmployeeDashboard = ({ user }: { user: EmployeeUser }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { theme } = useTheme();
  const { toast } = useToast();

  const isDark: boolean = theme === "dark";

  // Define participants FIRST before using it
  const participants: User[] = users.filter((u) => u.role === "participant");

  // Now filter participants by search term
  const filteredParticipants: User[] = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.participantId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const darkCardClass: string = isDark
    ? "bg-[#02060E]/80 backdrop-blur-sm border-[#9303C5]/30 shadow-xl"
    : "hover:shadow-lg transition-shadow duration-300";
  const darkTableHeaderClass: string = isDark
    ? "bg-gradient-to-r from-[#2a0140]/50 to-transparent text-gray-300"
    : "bg-gradient-to-r from-gray-50 to-white text-gray-600 border-b";
  const darkBorderClass: string = isDark
    ? "border-[#9303C5]/20"
    : "border-gray-100";
  const darkHoverClass: string = isDark
    ? "hover:bg-[#2a0140]/30"
    : "hover:bg-gray-50 transition-colors duration-200";
  const darkTextClass: string = isDark ? "text-white" : "text-gray-800";
  const darkMutedTextClass: string = isDark ? "text-gray-400" : "text-gray-500";
  const darkPriceClass: string = isDark
    ? "text-[#d8b4fe]"
    : "text-purple-700 font-semibold";

  React.useEffect(() => {
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

    socket.on("share:update", (updated: Share) => {
      setShares((prev) =>
        prev.some((s) => s._id === updated._id)
          ? prev.map((s) => (s._id === updated._id ? updated : s))
          : [...prev, updated],
      );
    });
    socket.on("share:add", (newShare: Share) => {
      setShares((prev) => [...prev, newShare]);
      toast({
        title: "📈 New Share Listed",
        description: `${newShare.name} listed at ₹${newShare.price}`,
      });
    });

    socket.on("share:delete", (id: string) => {
      setShares((prev) => prev.filter((s) => s._id !== id));
    });

    socket.on("user:update", (changedUsers: User[]) => {
      setUsers((prev) => {
        const map = new Map(prev.map((u) => [u.participantId, u]));
        changedUsers.forEach((u: User) => map.set(u.participantId, u));
        return Array.from(map.values());
      });
    });

    socket.on("market:status", ({ running }: { running: boolean }) => {
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

  const handleDirectTrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      type: "direct",
      action: formData.get("action"),
      participantId: formData.get("participantId"),
      shareSymbol: formData.get("shareSymbol"),
      quantity: parseInt(formData.get("quantity") as string, 10),
    };

    try {
      await axiosInstance.post("/trade", payload);
      toast({
        title: "Trade Executed",
        description: "Trade completed successfully",
      });
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
    form.reset();
  };

  const handleP2PTrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      type: "p2p",
      buyerParticipantId: formData.get("buyerParticipantId"),
      sellerParticipantId: formData.get("sellerParticipantId"),
      shareSymbol: formData.get("p2pShareSymbol"),
      quantity: parseInt(formData.get("p2pQuantity") as string, 10),
      price: parseFloat(formData.get("p2pPrice") as string),
    };

    try {
      await axiosInstance.post("/trade", payload);
      toast({
        title: "P2P Executed",
        description: "P2P trade completed successfully",
      });
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
    form.reset();
  };

  return React.createElement(
    motion.div,
    {
      variants: container,
      initial: "hidden",
      animate: "show",
      className: "space-y-6",
    },
    // Animated Background Effect for Dark Mode
    isDark &&
      React.createElement("div", {
        key: "bg-effect",
        className: "fixed inset-0 pointer-events-none overflow-hidden",
        children: [
          React.createElement("div", {
            key: "bg1",
            className:
              "absolute top-20 -left-40 w-80 h-80 bg-[#9303C5]/10 rounded-full blur-3xl animate-pulse",
          }),
          React.createElement("div", {
            key: "bg2",
            className:
              "absolute bottom-20 -right-40 w-80 h-80 bg-[#2a0140]/20 rounded-full blur-3xl animate-pulse delay-1000",
          }),
          React.createElement("div", {
            key: "bg3",
            className:
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#9303C5]/5 rounded-full blur-3xl",
          }),
        ],
      }),
    // Market Overview Section
    React.createElement(motion.div, {
      key: "market-overview",
      variants: item,
      children: React.createElement(Card, {
        className: `rounded-2xl border transition-all duration-300 ${darkCardClass}`,
        children: [
          React.createElement(CardHeader, {
            key: "header",
            className: "border-b",
            children: React.createElement("div", {
              className: "flex items-center gap-2",
              children: [
                React.createElement("div", {
                  key: "icon-bg",
                  className: `p-2 rounded-lg ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`,
                  children: React.createElement(Activity, {
                    className: `h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`,
                  }),
                }),
                React.createElement(
                  CardTitle,
                  { key: "title", className: darkTextClass },
                  "Market Overview",
                ),
                isDark
                  ? React.createElement(
                      "span",
                      {
                        key: "live-badge-dark",
                        className:
                          "text-xs px-2 py-0.5 rounded-full bg-[#9303C5]/20 text-[#d8b4fe] animate-pulse",
                      },
                      "● Live",
                    )
                  : React.createElement(
                      "span",
                      {
                        key: "live-badge-light",
                        className:
                          "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600",
                      },
                      "● Live",
                    ),
              ],
            }),
          }),
          React.createElement(CardContent, {
            key: "content",
            className: "p-0",
            children: React.createElement("div", {
              className: "overflow-x-auto",
              children: React.createElement("table", {
                className: "w-full",
                children: [
                  React.createElement("thead", {
                    key: "thead",
                    children: React.createElement("tr", {
                      className: darkTableHeaderClass,
                      children: [
                        React.createElement(
                          "th",
                          {
                            key: "name",
                            className: "p-3 text-left text-sm font-semibold",
                          },
                          "Name",
                        ),
                        React.createElement(
                          "th",
                          {
                            key: "price",
                            className: "p-3 text-right text-sm font-semibold",
                          },
                          "Price",
                        ),
                        React.createElement(
                          "th",
                          {
                            key: "change",
                            className: "p-3 text-right text-sm font-semibold",
                          },
                          "Change %",
                        ),
                      ],
                    }),
                  }),
                  React.createElement("tbody", {
                    key: "tbody",
                    children: shares.map((s, idx) =>
                      React.createElement(motion.tr, {
                        key: s._id,
                        initial: { opacity: 0, x: -20 },
                        animate: { opacity: 1, x: 0 },
                        transition: { delay: idx * 0.02 },
                        className: `border-b transition-all duration-300 ${darkBorderClass} ${darkHoverClass}`,
                        children: [
                          React.createElement(
                            "td",
                            {
                              key: "name",
                              className: `p-3 font-medium ${darkTextClass}`,
                            },
                            s.name,
                          ),
                          React.createElement(
                            "td",
                            {
                              key: "price",
                              className: `p-3 text-right font-bold ${darkPriceClass}`,
                            },
                            `₹${s.price.toFixed(2)}`,
                          ),
                          React.createElement("td", {
                            key: "change",
                            className: "p-3 text-right",
                            children: React.createElement("span", {
                              className: `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                s.change >= 0
                                  ? isDark
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-green-100 text-green-700"
                                  : isDark
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-red-100 text-red-700"
                              }`,
                              children: [
                                s.change >= 0
                                  ? React.createElement(TrendingUp, {
                                      key: "icon",
                                      className: "h-3 w-3",
                                    })
                                  : React.createElement(TrendingDown, {
                                      key: "icon",
                                      className: "h-3 w-3",
                                    }),
                                `${s.change >= 0 ? "+" : ""}${s.change.toFixed(2)}%`,
                              ],
                            }),
                          }),
                        ],
                      }),
                    ),
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    }),
    // Trading Interface Section
    React.createElement(motion.div, {
      key: "trading-interface",
      variants: item,
      children: React.createElement(Card, {
        className: `rounded-2xl border transition-all duration-300 ${darkCardClass}`,
        children: [
          React.createElement(CardHeader, {
            key: "header",
            className: "border-b",
            children: React.createElement("div", {
              className: "flex items-center gap-2",
              children: [
                React.createElement("div", {
                  key: "icon-bg",
                  className: `p-2 rounded-lg ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`,
                  children: React.createElement(Wallet, {
                    className: `h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`,
                  }),
                }),
                React.createElement(
                  CardTitle,
                  { key: "title", className: darkTextClass },
                  "Trading Interface",
                ),
              ],
            }),
          }),
          React.createElement(CardContent, {
            key: "content",
            className: "p-4",
            children: React.createElement(Tabs, {
              defaultValue: "direct",
              children: [
                React.createElement(TabsList, {
                  key: "tabs-list",
                  className: `grid w-full grid-cols-2 p-1 rounded-xl ${isDark ? "bg-[#2a0140]/50" : "bg-gray-100"}`,
                  children: [
                    React.createElement(TabsTrigger, {
                      key: "direct-tab",
                      value: "direct",
                      className: `rounded-lg transition-all duration-200 ${isDark ? "data-[state=active]:bg-[#9303C5] data-[state=active]:text-white data-[state=active]:shadow-lg" : "data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700"}`,
                      children: [
                        React.createElement(Users, {
                          key: "icon",
                          className: "h-4 w-4 mr-2",
                        }),
                        "Trade w/ Exchange",
                      ],
                    }),
                    React.createElement(TabsTrigger, {
                      key: "p2p-tab",
                      value: "p2p",
                      className: `rounded-lg transition-all duration-200 ${isDark ? "data-[state=active]:bg-[#9303C5] data-[state=active]:text-white data-[state=active]:shadow-lg" : "data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-700"}`,
                      children: [
                        React.createElement(ArrowLeftRight, {
                          key: "icon",
                          className: "h-4 w-4 mr-2",
                        }),
                        "P2P Trade",
                      ],
                    }),
                  ],
                }),
                React.createElement(TabsContent, {
                  key: "direct-content",
                  value: "direct",
                  className: "space-y-4 mt-4",
                  children: React.createElement("form", {
                    onSubmit: handleDirectTrade,
                    className: "space-y-4",
                    children: [
                      React.createElement("div", {
                        key: "form-grid",
                        className: "grid md:grid-cols-2 gap-4",
                        children: [
                          React.createElement("div", {
                            key: "participant",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Participant",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "participantId",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "default",
                                      value: "",
                                      className: isDark
                                        ? "bg-[#02060E] text-gray-300"
                                        : "text-gray-400",
                                    },
                                    "Select Participant",
                                  ),
                                  ...participants.map((p) =>
                                    React.createElement(
                                      "option",
                                      {
                                        key: p._id,
                                        value: p.participantId,
                                        className: isDark
                                          ? "bg-[#02060E] text-white"
                                          : "text-gray-800",
                                      },
                                      `${p.name} (${p.participantId})`,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "share",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Share",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "shareSymbol",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "default",
                                      value: "",
                                      className: isDark
                                        ? "bg-[#02060E] text-gray-300"
                                        : "text-gray-400",
                                    },
                                    "Select Share",
                                  ),
                                  ...shares.map((s) =>
                                    React.createElement(
                                      "option",
                                      {
                                        key: s._id,
                                        value: s.name,
                                        className: isDark
                                          ? "bg-[#02060E] text-white"
                                          : "text-gray-800",
                                      },
                                      `${s.name} - ₹${s.price}`,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "quantity",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Quantity",
                              ),
                              React.createElement(Input, {
                                key: "input",
                                name: "quantity",
                                type: "number",
                                min: 1,
                                required: true,
                                className: `transition-all duration-200 focus:ring-2 ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "action",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Action",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "action",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "buy",
                                      value: "buy",
                                      className: isDark
                                        ? "bg-[#02060E] text-green-400"
                                        : "text-green-600",
                                    },
                                    "📈 Buy from Market",
                                  ),
                                  React.createElement(
                                    "option",
                                    {
                                      key: "sell",
                                      value: "sell",
                                      className: isDark
                                        ? "bg-[#02060E] text-red-400"
                                        : "text-red-600",
                                    },
                                    "📉 Sell to Market",
                                  ),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      React.createElement(motion.div, {
                        key: "button-wrapper",
                        whileTap: { scale: 0.98 },
                        whileHover: { scale: 1.02 },
                        children: React.createElement(
                          Button,
                          {
                            className: `w-full h-11 text-base font-semibold transition-all duration-300 ${isDark ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] hover:shadow-lg hover:shadow-[#9303C5]/50" : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30"}`,
                          },
                          "Execute Trade",
                        ),
                      }),
                    ],
                  }),
                }),
                React.createElement(TabsContent, {
                  key: "p2p-content",
                  value: "p2p",
                  className: "space-y-4 mt-4",
                  children: React.createElement("form", {
                    onSubmit: handleP2PTrade,
                    className: "space-y-4",
                    children: [
                      React.createElement("div", {
                        key: "form-grid",
                        className: "grid md:grid-cols-2 gap-4",
                        children: [
                          React.createElement("div", {
                            key: "buyer",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Buyer",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "buyerParticipantId",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "default",
                                      value: "",
                                      className: isDark
                                        ? "bg-[#02060E] text-gray-300"
                                        : "text-gray-400",
                                    },
                                    "Select Buyer",
                                  ),
                                  ...participants.map((p) =>
                                    React.createElement(
                                      "option",
                                      {
                                        key: p._id,
                                        value: p.participantId,
                                        className: isDark
                                          ? "bg-[#02060E] text-white"
                                          : "text-gray-800",
                                      },
                                      `${p.name} (${p.participantId})`,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "seller",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Seller",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "sellerParticipantId",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "default",
                                      value: "",
                                      className: isDark
                                        ? "bg-[#02060E] text-gray-300"
                                        : "text-gray-400",
                                    },
                                    "Select Seller",
                                  ),
                                  ...participants.map((p) =>
                                    React.createElement(
                                      "option",
                                      {
                                        key: p._id,
                                        value: p.participantId,
                                        className: isDark
                                          ? "bg-[#02060E] text-white"
                                          : "text-gray-800",
                                      },
                                      `${p.name} (${p.participantId})`,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "share",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Share",
                              ),
                              React.createElement("select", {
                                key: "select",
                                name: "p2pShareSymbol",
                                className: `w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#9303C5] ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5]" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                                required: true,
                                children: [
                                  React.createElement(
                                    "option",
                                    {
                                      key: "default",
                                      value: "",
                                      className: isDark
                                        ? "bg-[#02060E] text-gray-300"
                                        : "text-gray-400",
                                    },
                                    "Select Share",
                                  ),
                                  ...shares.map((s) =>
                                    React.createElement(
                                      "option",
                                      {
                                        key: s._id,
                                        value: s.name,
                                        className: isDark
                                          ? "bg-[#02060E] text-white"
                                          : "text-gray-800",
                                      },
                                      s.name,
                                    ),
                                  ),
                                ],
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "quantity",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Quantity",
                              ),
                              React.createElement(Input, {
                                key: "input",
                                name: "p2pQuantity",
                                type: "number",
                                min: 1,
                                required: true,
                                className: `transition-all duration-200 focus:ring-2 ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                              }),
                            ],
                          }),
                          React.createElement("div", {
                            key: "price",
                            className: "md:col-span-2",
                            children: [
                              React.createElement(
                                Label,
                                {
                                  key: "label",
                                  className: `text-sm font-medium ${darkTextClass}`,
                                },
                                "Price per Share (₹)",
                              ),
                              React.createElement(Input, {
                                key: "input",
                                name: "p2pPrice",
                                type: "number",
                                step: "0.01",
                                min: 0,
                                required: true,
                                className: `transition-all duration-200 focus:ring-2 ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white focus:border-[#9303C5] focus:ring-[#9303C5] placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-200"}`,
                              }),
                            ],
                          }),
                        ],
                      }),
                      React.createElement(motion.div, {
                        key: "button-wrapper",
                        whileTap: { scale: 0.98 },
                        whileHover: { scale: 1.02 },
                        children: React.createElement(
                          Button,
                          {
                            className: `w-full h-11 text-base font-semibold transition-all duration-300 ${isDark ? "bg-gradient-to-r from-[#9303C5] to-[#6b02b3] hover:shadow-lg hover:shadow-[#9303C5]/50" : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30"}`,
                          },
                          "Execute P2P Trade",
                        ),
                      }),
                    ],
                  }),
                }),
              ],
            }),
          }),
        ],
      }),
    }),
    // Active Participants Section
    React.createElement(motion.div, {
      key: "active-participants",
      variants: item,
      children: React.createElement(Card, {
        className: `rounded-2xl border transition-all duration-300 ${darkCardClass}`,
        children: [
          React.createElement(CardHeader, {
            key: "header",
            className: "border-b",
            children: React.createElement("div", {
              className: "flex items-center justify-between",
              children: [
                React.createElement("div", {
                  key: "title-section",
                  className: "flex items-center gap-2",
                  children: [
                    React.createElement("div", {
                      key: "icon-bg",
                      className: `p-2 rounded-lg ${isDark ? "bg-[#9303C5]/20" : "bg-purple-100"}`,
                      children: React.createElement(Building2, {
                        className: `h-5 w-5 ${isDark ? "text-purple-400" : "text-purple-600"}`,
                      }),
                    }),
                    React.createElement(
                      CardTitle,
                      { key: "title", className: darkTextClass },
                      "Active Participants",
                    ),
                    isDark
                      ? React.createElement(
                          "span",
                          {
                            key: "count-dark",
                            className:
                              "text-xs px-2 py-0.5 rounded-full bg-[#9303C5]/20 text-[#d8b4fe]",
                          },
                          `${participants.length} Active`,
                        )
                      : React.createElement(
                          "span",
                          {
                            key: "count-light",
                            className:
                              "text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700",
                          },
                          `${participants.length} Active`,
                        ),
                  ],
                }),
                React.createElement("div", {
                  key: "search",
                  className: "relative",
                  children: [
                    React.createElement(Search, {
                      key: "icon",
                      className: `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-400"}`,
                    }),
                    React.createElement(Input, {
                      key: "input",
                      placeholder: "Search participants...",
                      value: searchTerm,
                      onChange: (e) => setSearchTerm(e.target.value),
                      className: `pl-9 w-64 text-sm transition-all duration-200 focus:ring-2 ${isDark ? "bg-[#02060E]/80 border-[#9303C5]/30 text-white placeholder:text-gray-500 focus:border-[#9303C5] focus:ring-[#9303C5]" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-200"}`,
                    }),
                  ],
                }),
              ],
            }),
          }),
          React.createElement(CardContent, {
            key: "content",
            className: "p-0",
            children: React.createElement("div", {
              className: "overflow-x-auto",
              children: React.createElement("table", {
                className: "w-full",
                children: [
                  React.createElement("thead", {
                    key: "thead",
                    children: React.createElement("tr", {
                      className: darkTableHeaderClass,
                      children: [
                        React.createElement(
                          "th",
                          {
                            key: "pid",
                            className: "p-3 text-left text-sm font-semibold",
                          },
                          "PID",
                        ),
                        React.createElement(
                          "th",
                          {
                            key: "name",
                            className: "p-3 text-left text-sm font-semibold",
                          },
                          "Name",
                        ),
                        React.createElement(
                          "th",
                          {
                            key: "balance",
                            className: "p-3 text-right text-sm font-semibold",
                          },
                          "Balance",
                        ),
                        React.createElement(
                          "th",
                          {
                            key: "holdings",
                            className: "p-3 text-center text-sm font-semibold",
                          },
                          "Holdings",
                        ),
                      ],
                    }),
                  }),
                  React.createElement("tbody", {
                    key: "tbody",
                    children:
                      filteredParticipants.length === 0
                        ? React.createElement("tr", {
                            key: "empty",
                            children: React.createElement(
                              "td",
                              {
                                colSpan: 4,
                                className: `p-8 text-center ${darkMutedTextClass}`,
                              },
                              "No participants found",
                            ),
                          })
                        : filteredParticipants.map((p, idx) =>
                            React.createElement(motion.tr, {
                              key: p._id,
                              initial: { opacity: 0, x: -20 },
                              animate: { opacity: 1, x: 0 },
                              transition: { delay: idx * 0.02 },
                              className: `border-b transition-all duration-300 ${darkBorderClass} ${darkHoverClass}`,
                              children: [
                                React.createElement(
                                  "td",
                                  {
                                    key: "pid",
                                    className: `p-3 font-mono text-sm font-semibold ${darkPriceClass}`,
                                  },
                                  p.participantId,
                                ),
                                React.createElement(
                                  "td",
                                  {
                                    key: "name",
                                    className: `p-3 font-medium ${darkTextClass}`,
                                  },
                                  p.name,
                                ),
                                React.createElement(
                                  "td",
                                  {
                                    key: "balance",
                                    className: `p-3 text-right font-bold ${darkTextClass}`,
                                  },
                                  `₹${p.balance.toLocaleString()}`,
                                ),
                                React.createElement("td", {
                                  key: "holdings",
                                  className: "p-3 text-center",
                                  children: React.createElement(
                                    "span",
                                    {
                                      className: `inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-[#9303C5]/20 text-[#d8b4fe]" : "bg-purple-100 text-purple-700"}`,
                                    },
                                    `${p.holdings?.length || 0} Assets`,
                                  ),
                                }),
                              ],
                            }),
                          ),
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    }),
  );
};

export default EmployeeDashboard;
