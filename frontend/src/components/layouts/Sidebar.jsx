import React from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  Target,
  Building2,
  Sparkles,
} from 'lucide-react';

const navigation = [
  { name: 'Personas', page: 'personas', icon: Users },
  { name: 'Goals', page: 'goals', icon: Target },
  { name: 'Organizations', page: 'organizations', icon: Building2 },
];

export function Sidebar({ currentPage, onNavigate }) {
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
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.page)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>Version 1.0.0</p>
        <p>Table-Based UI</p>
      </div>
    </div>
  );
}
