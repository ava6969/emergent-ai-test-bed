import React from 'react';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';

export function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
