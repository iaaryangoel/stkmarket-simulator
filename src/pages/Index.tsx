import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import LoginForm from "@/components/LoginForm";
import ParticipantDashboard from "@/components/ParticipantDashboard";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import AdminDashboard from "@/components/AdminDashboard";

const Index = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setShowLogin(false);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    localStorage.removeItem("currentUser");
  };

  if (showLogin) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-900 flex items-center justify-center overflow-hidden">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-md text-white shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + Title */}
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <motion.img
              src="/Transparent logo.png"
              alt="Logo"
              className="h-12 w-12 drop-shadow-[0_0_10px_rgba(167,139,250,0.7)]"
              whileHover={{ scale: 1.08, rotate: -2 }}
              transition={{ type: "spring", stiffness: 200 }}
            />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-wide">
              FOSTIIMA Stock Exchange
            </h1>
          </motion.div>

          {/* User Info */}
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <span className="hidden sm:inline-block text-sm px-3 py-1 rounded-full bg-white/10 backdrop-blur text-slate-200 capitalize">
              {currentUser?.role}: {currentUser?.name}
            </span>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white text-black bg-white hover:bg-slate-200 transition"
              >
                Logout
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>
      <motion.main
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-7xl mx-auto px-4 py-6"
      >
        {currentUser?.role === "participant" && (
          <ParticipantDashboard user={currentUser} />
        )}
        {currentUser?.role === "employee" && (
          <EmployeeDashboard user={currentUser} />
        )}
        {currentUser?.role === "admin" && <AdminDashboard user={currentUser} />}
      </motion.main>
    </div>
  );
};

export default Index;