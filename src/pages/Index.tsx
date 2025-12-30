
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LoginForm from '@/components/LoginForm';
import ParticipantDashboard from '@/components/ParticipantDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';
import AdminDashboard from '@/components/AdminDashboard';

const Index = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  
  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setShowLogin(false);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLogin(false);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    localStorage.removeItem('currentUser');
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Stock Market Simulator</h1>
          <div className="flex items-center gap-4">
            <span className="capitalize">{currentUser?.role}: {currentUser?.name}</span>
            <Button onClick={handleLogout} variant="outline" className="text-black border-white hover:bg-gray hover:text-gray-500">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {currentUser?.role === 'participant' && <ParticipantDashboard user={currentUser} />}
        {currentUser?.role === 'employee' && <EmployeeDashboard user={currentUser} />}
        {currentUser?.role === 'admin' && <AdminDashboard user={currentUser} />}
      </main>
    </div>
  );
};

export default Index;
