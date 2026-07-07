'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  BookOpen, 
  MessageSquare,
  TrendingDown,
  Terminal,
  Activity
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'Watchlist', path: '/watchlist', icon: TrendingUp },
    { name: 'AI Journal', path: '/journal', icon: BookOpen },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
  ];

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-slate-950/80 border-b md:border-r border-white/5 backdrop-blur-md flex flex-col justify-between shrink-0">
      <div className="p-6 flex flex-col gap-6">
        {/* App Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Activity className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              StockPilot AI
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-wider">
              INVEST INTELLIGENCE
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/10 text-indigo-200 border border-indigo-500/20 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Status / Mode Info Footer */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          <div className="text-xs">
            <div className="text-slate-300 font-medium">Single User (You)</div>
            <div className="text-slate-500 font-mono text-[9px] mt-0.5">NSE/BSE READ-ONLY</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
