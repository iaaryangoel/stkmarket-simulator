import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <img
            src="/Transparent logo.png"
            alt="Logo"
            width={55}
            height={55}
            className="object-contain mr-[-62%]"
          />
          <h1 className="text-xl sm:text-2xl font-semibold tracking-wide">
            FBS Stock Market
          </h1>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:block text-sm text-slate-300 capitalize">
              {currentUser?.role}: {currentUser?.name}
            </span>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-white text-black hover:bg-white hover:text-blue-400 transition"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentUser?.role === "participant" && (
          <ParticipantDashboard user={currentUser} />
        )}
        {currentUser?.role === "employee" && (
          <EmployeeDashboard user={currentUser} />
        )}
        {currentUser?.role === "admin" && <AdminDashboard user={currentUser} />}
      </main>
    </div>
  );
};

export default Index;
