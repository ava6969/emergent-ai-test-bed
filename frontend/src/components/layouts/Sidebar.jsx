import React from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Library,
  PlayCircle,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'AI Chat', href: '#', icon: MessageSquare, active: true },
  { name: 'Library', href: '#', icon: Library },
  { name: 'Simulations', href: '#', icon: PlayCircle },
  { name: 'Analytics', href: '#', icon: BarChart3 },
  { name: 'Settings', href: '#', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-64 border-r bg-muted/40 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">EpochAI</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">TestBed</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = item.active;
          return (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>Version 1.0.0</p>
        <p>Sprint 1: AI Foundation</p>
      </div>
    </div>
  );
}
