'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, Target, Package, Building2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';

const navigation = [
  { name: 'Personas', href: '/personas', icon: Users },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  // Fetch simulation threads (ChatGPT-style conversation history)
  const { data: threads = [] } = useQuery({
    queryKey: ['simulation-threads'],
    queryFn: () => apiClient.getSimulationThreads(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl">⚙️</div>
          <div>
            <div className="font-bold">EpochAI</div>
            <div className="text-xs text-gray-500">TestBed</div>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Thick Separator */}
      <div className="mx-3 border-t-2 border-gray-300"></div>

      {/* Simulation Threads (ChatGPT-style) */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="text-xs font-semibold text-gray-500 px-3 mb-2">
          SIMULATION HISTORY
        </div>
        <div className="space-y-1">
          {threads.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              No simulations yet
            </div>
          ) : (
            threads.map((thread: any) => {
              const isActive = pathname === `/simulation/${thread.thread_id}`;
              const personaName = thread.metadata?.persona_name || 'Unknown';
              const goalName = thread.metadata?.goal_name || 'Unknown';
              const startedAt = thread.metadata?.started_at
                ? new Date(thread.metadata.started_at).toLocaleDateString()
                : '';

              return (
                <Link
                  key={thread.thread_id}
                  href={`/simulation/${thread.thread_id}`}
                  className={cn(
                    'flex items-start gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {personaName} → {goalName}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {startedAt}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
