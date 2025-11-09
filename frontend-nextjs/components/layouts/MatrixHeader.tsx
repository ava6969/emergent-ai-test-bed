'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function MatrixHeader() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // In a real app, this would toggle between Matrix and light theme
    // For now, we'll keep it Matrix-themed
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 border-b border-[#00FF41] border-opacity-20 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-between px-6"
    >
      {/* Title */}
      <div>
        <h1 className="text-[#00FF41] text-xl font-bold matrix-glow">
          AI-Native Agent Testing
        </h1>
        <p className="text-[#00FF41] text-xs opacity-60">
          Test your LangGraph agents with AI-powered assistance
        </p>
      </div>

      {/* Theme Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full bg-[#00FF41] bg-opacity-10 border border-[#00FF41] border-opacity-30 flex items-center justify-center hover:bg-opacity-20 transition-all"
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-[#00FF41]" />
        ) : (
          <Sun className="w-5 h-5 text-[#00FF41]" />
        )}
      </motion.button>
    </motion.header>
  );
}
