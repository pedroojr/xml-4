import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/ui/navbar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";

import NotFound from "./pages/NotFound";
import NotasEmAberto from "./pages/NotasEmAberto";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Layout base que inclui o Navbar
const BaseLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
};

const App = () => {

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <BaseLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/notas-em-aberto" element={<NotasEmAberto />} />
                <Route path="/notas-em-aberto/:id" element={<NotasEmAberto />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BaseLayout>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
