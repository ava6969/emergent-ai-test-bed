import React from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function Header() {
  const [theme, setTheme] = React.useState('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="border-b p-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">AI-Native Agent Testing</h1>
        <p className="text-sm text-muted-foreground">
          Test your LangGraph agents with AI-powered assistance
        </p>
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        {theme === 'light' ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>
    </header>
  );
}
