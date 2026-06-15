// src/pages/Index.tsx - Enhanced Version
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, User, Briefcase, Shield } from "lucide-react";

const Index = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const { theme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setShowLogin(false);

      // Show welcome back toast
      toast({
        title: "Welcome Back!",
        description: `Logged in as ${JSON.parse(savedUser).name}`,
      });
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    localStorage.setItem("currentUser", JSON.stringify(user));

    toast({
      title: "Login Successful",
      description: `Welcome, ${user.name}!`,
    });
  };

  const handleLogout = () => {
    const userName = currentUser?.name;
    setCurrentUser(null);
    setShowLogin(true);
    localStorage.removeItem("currentUser");

    toast({
      title: "Logged Out",
      description: `Goodbye, ${userName}!`,
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3 mr-1" />;
      case "employee":
        return <Briefcase className="h-3 w-3 mr-1" />;
      default:
        return <User className="h-3 w-3 mr-1" />;
    }
  };

  if (showLogin) {
    return (
      <div className={`min-h-screen w-full ${theme === "dark" ? "dark" : ""}`}>
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark" : ""}`}>
      <div
        className={`min-h-screen transition-all duration-500 ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#02060E] via-[#2a0140] to-[#9303C5]"
            : "bg-gradient-to-br from-slate-50 via-white to-slate-100"
        }`}
      >
        <motion.header
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`sticky top-0 z-50 backdrop-blur-md text-white shadow-lg ${
            theme === "dark"
              ? "bg-gradient-to-r from-[#02060E] via-[#2a0140] to-[#9303C5]"
              : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo + Title */}
            <motion.div
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <motion.img
                src="/Transparent logo.png"
                alt="FOSTIIMA Logo"
                className="h-12 w-12 drop-shadow-[0_0_10px_rgba(147,3,197,0.7)]"
                whileHover={{ scale: 1.08, rotate: -2 }}
                transition={{ type: "spring", stiffness: 200 }}
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-wide">
                  FOSTIIMA Stock Exchange
                </h1>
                <p
                  className={`text-xs hidden sm:block ${theme === "dark" ? "text-gray-300" : "text-gray-300"}`}
                >
                  Virtual Trading Platform
                </p>
              </div>
            </motion.div>

            {/* User Info + Theme Toggle */}
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 sm:gap-4"
            >
              <ThemeToggle />

              <motion.div
                className={`hidden sm:flex items-center gap-2 text-sm px-3 py-1 rounded-full backdrop-blur capitalize ${
                  theme === "dark"
                    ? "bg-white/10 text-white"
                    : "bg-white/10 text-slate-200"
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {getRoleIcon(currentUser?.role)}
                {currentUser?.role}: {currentUser?.name}
              </motion.div>

              <motion.div
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className={`flex items-center gap-2 transition-all duration-300 ${
                    theme === "dark"
                      ? "border-[#9303C5] text-white bg-white/10 hover:bg-white/20 hover:border-[#b503f0]"
                      : "border-white text-black bg-white hover:bg-slate-200"
                  }`}
                >
                  <LogOut className="h-4 w-4" />
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
          {/* Role indicator badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4 flex justify-end"
          >
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                theme === "dark"
                  ? "bg-[#2a0140]/50 text-[#d8b4fe] border border-[#9303C5]/30"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {getRoleIcon(currentUser?.role)}
              Logged in as{" "}
              <span className="font-bold">{currentUser?.name}</span>
            </div>
          </motion.div>

          {currentUser?.role === "participant" && (
            <ParticipantDashboard user={currentUser} />
          )}
          {currentUser?.role === "employee" && (
            <EmployeeDashboard user={currentUser} />
          )}
          {currentUser?.role === "admin" && (
            <AdminDashboard user={currentUser} />
          )}
        </motion.main>
      </div>
    </div>
  );
};

export default Index;
