import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';

export const metadata: Metadata = {
  title: 'StockPilot AI — Personal Investment Intelligence',
  description: 'AI-powered investment intelligence and coaching for NSE/BSE stock portfolios',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <meta name="theme-color" content="#060813" />
      </head>
      <body className="h-full min-h-screen bg-[#060813] text-slate-100 flex flex-col md:flex-row antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
