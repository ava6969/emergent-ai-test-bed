'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function MatrixHeader() {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 border-b border-[#2A2A2A] bg-[#0A0A0A] backdrop-blur-sm flex items-center justify-between px-6 relative z-10"
      style={{
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-white text-xl font-bold luminance-glow">
          AI-Native Agent Testing
        </h1>
        <p className="text-[#A0A0A0] text-xs">
          Test your LangGraph agents with AI-powered assistance
        </p>
      </div>

      {/* Theme Toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full bg-[#1E1E1E] border border-[#2A2A2A] flex items-center justify-center hover:bg-[#2A2A2A] hover:border-[#3A3A3A] transition-all"
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-[#E5E5E5]" />
        ) : (
          <Sun className="w-5 h-5 text-[#E5E5E5]" />
        )}
      </motion.button>
    </motion.header>
  );
}
