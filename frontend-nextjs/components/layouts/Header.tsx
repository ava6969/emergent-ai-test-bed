'use client';

import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-end px-6">
      <Button variant="ghost" size="icon">
        <Moon className="h-5 w-5" />
      </Button>
    </header>
  );
}
