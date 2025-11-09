'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Target,
  Package,
  Building2,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function MatrixSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const { data: threads } = useQuery({
    queryKey: ['simulation-threads'],
    queryFn: () => apiClient.getSimulationThreads(),
    refetchInterval: 5000,
  });

  const navItems = [
    { path: '/personas', label: 'Personas', icon: Users },
    { path: '/goals', label: 'Goals', icon: Target },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/organizations', label: 'Organizations', icon: Building2 },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed ? '60px' : '240px',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-[#0A0A0A] border-r border-[#2A2A2A] flex flex-col relative z-10"
      style={{
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Logo/Brand */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#3A3A3A] to-[#2A2A2A] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-white font-semibold text-lg luminance-glow">
                DAGIVerse
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#3A3A3A] to-[#2A2A2A] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#141414] border border-[#2A2A2A] rounded-full flex items-center justify-center hover:bg-[#1E1E1E] hover:border-[#3A3A3A] transition-all z-10"
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3 text-[#A0A0A0]" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-[#A0A0A0]" />
        )}
      </button>

      {/* New Simulation Button */}
      <div className="p-3 border-b border-[#2A2A2A]">
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full ${
              isCollapsed ? 'p-2' : 'p-2.5'
            } bg-gradient-to-r from-[#2A2A2A] to-[#1E1E1E] border border-[#3A3A3A] rounded flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-start gap-2'
            } hover:from-[#3A3A3A] hover:to-[#2A2A2A] hover:border-[#4A4A4A] transition-all group relative overflow-hidden`}
          >
            <div className="absolute inset-0 animate-shimmer"></div>
            <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform relative z-10" />
            {!isCollapsed && (
              <span className="text-white text-sm font-medium relative z-10">New Simulation</span>
            )}
          </motion.button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <motion.div
              whileHover={{ x: 2 }}
              className={`flex items-center ${
                isCollapsed ? 'justify-center p-2' : 'gap-3 p-2.5'
              } rounded cursor-pointer transition-all ${
                isActive(item.path)
                  ? 'bg-[#1E1E1E] border border-[#3A3A3A]'
                  : 'hover:bg-[#141414]'
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${
                  isActive(item.path) ? 'text-white' : 'text-[#A0A0A0]'
                }`}
              />
              {!isCollapsed && (
                <span
                  className={`text-sm ${
                    isActive(item.path)
                      ? 'text-white font-medium'
                      : 'text-[#A0A0A0]'
                  }`}
                >
                  {item.label}
                </span>
              )}
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Simulation History */}
      <div className="border-t border-[#2A2A2A] p-3 max-h-[300px] overflow-y-auto">
        {!isCollapsed && (
          <div className="mb-2">
            <span className="text-[#A0A0A0] text-xs font-semibold uppercase tracking-wider">
              Simulations
            </span>
          </div>
        )}
        <div className="space-y-1">
          {threads?.threads?.slice(0, 10).map((thread: any) => {
            const personaName = thread.metadata?.persona_name || 'Unknown';
            const goalName = thread.metadata?.goal_name || 'Unnamed Goal';
            const isThreadActive = pathname.includes(thread.thread_id);

            return (
              <Link key={thread.thread_id} href={`/simulation/${thread.thread_id}`}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`${
                    isCollapsed ? 'p-2 flex justify-center' : 'p-2'
                  } rounded cursor-pointer transition-all ${
                    isThreadActive
                      ? 'bg-[#1E1E1E] border border-[#2A2A2A]'
                      : 'hover:bg-[#141414]'
                  }`}
                >
                  {isCollapsed ? (
                    <div className="w-2 h-2 bg-white rounded-full opacity-40"></div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-white text-xs font-medium opacity-90 truncate">
                        {personaName}
                      </div>
                      <div className="text-[#A0A0A0] text-xs opacity-60 truncate">
                        {goalName.substring(0, 25)}
                        {goalName.length > 25 ? '...' : ''}
                      </div>
                    </div>
                  )}
                </motion.div>
              </Link>
            );
          })}
          {(!threads?.threads || threads.threads.length === 0) && !isCollapsed && (
            <div className="text-[#A0A0A0] text-xs opacity-40 text-center py-4">
              No simulations yet
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
