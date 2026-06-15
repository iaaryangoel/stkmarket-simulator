// src/components/ThemeToggle.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.div
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.08 }}
      className="relative"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
    >
      {/* Outer ring glow */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
          theme === 'light' 
            ? 'bg-amber-400/30 group-hover:bg-amber-400/50' 
            : 'bg-[#9303C5]/30 group-hover:bg-[#9303C5]/50'
        }`}
      />
      
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        className="group relative overflow-hidden rounded-full p-2 w-12 h-12 transition-all duration-500 ease-in-out cursor-pointer"
        style={{
          background: theme === 'light' 
            ? 'linear-gradient(135deg, #fbbf24, #f97316, #ea580c)'
            : 'linear-gradient(135deg, #9303C5, #6b02b3, #4a0163)',
          boxShadow: theme === 'light'
            ? '0 0 20px rgba(251, 191, 36, 0.4)'
            : '0 0 20px rgba(147, 3, 197, 0.5)',
        }}
      >
        {/* Animated background shimmer */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        </div>
        
        {/* Inner glow on hover */}
        <div className={`absolute inset-1 rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20' 
            : 'bg-gradient-to-r from-[#9303C5]/20 to-[#6b02b3]/20'
        }`} />
        
        {/* Icon with rotation and scale animation */}
        <motion.div 
          className="relative z-10"
          animate={{ 
            rotate: theme === 'light' ? 0 : 180,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 0.5, type: "spring", stiffness: 200 },
            scale: { duration: 0.3, delay: 0.1 }
          }}
        >
          {theme === 'light' ? (
            <Moon className="h-6 w-6 text-white drop-shadow-md" />
          ) : (
            <Sun className="h-6 w-6 text-yellow-300 drop-shadow-md" />
          )}
        </motion.div>

        {/* Small sparkle dots around the button */}
        <div className="absolute -top-1 -right-1 w-2 h-2">
          <div className={`w-full h-full rounded-full animate-ping ${
            theme === 'light' ? 'bg-amber-400' : 'bg-purple-400'
          } opacity-60`} />
        </div>
        <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5">
          <div className={`w-full h-full rounded-full animate-pulse ${
            theme === 'light' ? 'bg-orange-400' : 'bg-pink-400'
          } opacity-60`} />
        </div>
      </Button>

      {/* Tooltip on hover */}
      <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none ${
        theme === 'light' 
          ? 'bg-gray-800 text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        {theme === 'light' ? 'Switch to Dark Mode 🌙' : 'Switch to Light Mode ☀️'}
      </span>
    </motion.div>
  );
};