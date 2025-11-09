import React, { useState } from "react";
import "@/App.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layouts/AppShell';
import { Personas } from '@/pages/Personas';
import { Goals } from '@/pages/Goals';
import { Products } from '@/pages/Products';
import { Organizations } from '@/pages/Organizations';

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
  const [currentPage, setCurrentPage] = useState('personas');

  const renderPage = () => {
    switch (currentPage) {
      case 'personas':
        return <Personas />;
      case 'goals':
        return <Goals />;
      case 'products':
        return <Products />;
      case 'organizations':
        return <Organizations />;
      default:
        return <Personas />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </AppShell>
    </QueryClientProvider>
  );
}

export default App;