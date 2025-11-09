'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Target, Package, Building2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Personas', href: '/personas', icon: Users },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Simulations', href: '/simulations', icon: PlayCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="text-2xl">⚙️</div>
          <div>
            <div className="font-bold">EpochAI</div>
            <div className="text-xs text-gray-500">TestBed</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
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

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-gray-500">
          <div>Version 1.0.0</div>
          <div>Table-Based UI</div>
        </div>
      </div>
    </div>
  );
}
