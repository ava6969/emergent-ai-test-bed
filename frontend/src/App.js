import React from "react";
import "@/App.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layouts/AppShell';
import { ChatInterface } from '@/components/chat/ChatInterface';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <ChatInterface />
      </AppShell>
    </QueryClientProvider>
  );
}

export default App;