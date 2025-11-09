'use client';

import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-2xl font-bold">AI-Native Agent Testing</h1>
        <p className="text-sm text-gray-600">
          Test your LangGraph agents with AI-powered assistance
        </p>
      </div>
      
      <Button variant="ghost" size="icon">
        <Moon className="h-5 w-5" />
      </Button>
    </header>
  );
}
