import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layouts/Sidebar";
import { Header } from "@/components/layouts/Header";
import { ToasterClient } from "@/components/ToasterClient";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "EpochAI TestBed - Agent Evaluation Platform",
  description: "Test your LangGraph agents with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto bg-gray-50">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
