import type { Metadata } from "next";
import "./globals.css";
import { MatrixSidebar } from "@/components/layouts/MatrixSidebar";
import { MatrixHeader } from "@/components/layouts/MatrixHeader";
import { ToasterClient } from "@/components/ToasterClient";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DAGIVerse - AI-Native Agent Testing",
  description: "Test your LangGraph agents with AI-powered assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black">
        <Providers>
          <div className="flex h-screen bg-black">
            <MatrixSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <MatrixHeader />
              <main className="flex-1 overflow-y-auto bg-black">
                {children}
              </main>
            </div>
          </div>
          <ToasterClient />
        </Providers>
      </body>
    </html>
  );
}
