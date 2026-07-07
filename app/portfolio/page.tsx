'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Briefcase, 
  DollarSign, 
  Activity,
  PieChart
} from 'lucide-react';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Static sector mapping duplicates the route logic for fast client-side rendering
  const SECTOR_MAPPING: Record<string, string> = {
    RELIANCE: 'Energy / Utilities',
    TCS: 'IT Services',
    INFY: 'IT Services',
    HDFCBANK: 'Banking / Finance',
    ICICIBANK: 'Banking / Finance',
    TATAMOTORS: 'Automotive',
    ITC: 'FMCG',
    BHARTIARTL: 'Telecom',
    SBI: 'Banking / Finance',
    LICI: 'Insurance',
    WIPRO: 'IT Services',
    AXISBANK: 'Banking / Finance',
    MARUTI: 'Automotive',
    LT: 'Construction / Eng'
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  const fetchHoldings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/holdings').then(r => r.json());
      if (Array.isArray(res)) {
        setHoldings(res);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to load portfolio holdings.');
    } finally {
      setLoading(false);
    }
  };

  // Math Calculations
  const totalValue = holdings.reduce((sum, h) => sum + (h.mktValue || (h.quantity * h.current_price)), 0);
  const totalCost = holdings.reduce((sum, h) => sum + (h.quantity * h.average_price), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const dayPnl = holdings.reduce((sum, h) => {
    const ltp = h.current_price || 0;
    const close = h.close_price || (ltp * 0.99); // Fallback
    return sum + (h.quantity * (ltp - close));
  }, 0);

  // Group by sector
  const sectorAllocation = holdings.reduce((acc, h) => {
    const baseSymbol = h.symbol.split('.')[0].toUpperCase();
    const sector = SECTOR_MAPPING[baseSymbol] || 'Other';
    const val = h.mktValue || (h.quantity * h.current_price);
    acc[sector] = (acc[sector] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  const sectorAllocationSorted = (Object.entries(sectorAllocation) as [string, number][])
    .map(([sector, value]) => ({
      sector,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Portfolio Holdings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live equity allocation, returns analysis, and sector distribution
            </p>
          </div>
        </div>
        <button
          onClick={fetchHoldings}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Holdings'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Current Value</span>
          <div className="text-xl font-bold text-white mt-1">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Total Investment</span>
          <div className="text-xl font-bold text-slate-300 mt-1">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Total Returns</span>
          <div className={`text-xl font-bold mt-1 flex items-center gap-1 ${totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
            ₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            <span className="text-[10px] font-semibold bg-current/10 px-1.5 py-0.5 rounded">
              {totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Today's Returns</span>
          <div className={`text-xl font-bold mt-1 flex items-center gap-1 ${dayPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
            ₹{dayPnl.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            <span className="text-[10px] font-semibold bg-current/10 px-1.5 py-0.5 rounded">
              {dayPnl >= 0 ? '+' : ''}{totalValue > 0 ? ((dayPnl / totalValue) * 100).toFixed(2) : '0.00'}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Holdings Table Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-5">
            <h2 className="text-md font-bold text-white border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Equity Holdings
            </h2>
            
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">Loading portfolio data...</div>
            ) : holdings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No holdings detected in your Kotak account.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5 pb-2 font-mono">
                      <th className="py-2.5 font-medium">Scrip</th>
                      <th className="py-2.5 font-medium text-right">Qty</th>
                      <th className="py-2.5 font-medium text-right">Avg Price</th>
                      <th className="py-2.5 font-medium text-right">Current Price</th>
                      <th className="py-2.5 font-medium text-right">Market Value</th>
                      <th className="py-2.5 font-medium text-right">Returns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h, idx) => {
                      const value = h.mktValue || (h.quantity * h.current_price);
                      const baseSymbol = h.symbol.split('.')[0].toUpperCase();
                      const sector = SECTOR_MAPPING[baseSymbol] || 'Other';
                      
                      return (
                        <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                          <td className="py-3">
                            <Link href={`/stock/${h.symbol}`} className="font-bold text-white hover:text-indigo-400 transition-colors block">
                              {h.symbol}
                            </Link>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{sector}</span>
                          </td>
                          <td className="py-3 text-right font-mono text-slate-300">{h.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-300">₹{h.average_price.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono text-slate-200">₹{h.current_price.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono font-semibold text-white">₹{value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</td>
                          <td className={`py-3 text-right font-mono font-bold ${h.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                            <div>₹{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
                            <div className="text-[9px] font-semibold mt-0.5">{h.pnl >= 0 ? '+' : ''}{h.pnl_percentage.toFixed(1)}%</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sector Allocation Column */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-5">
            <h2 className="text-md font-bold text-white border-b border-white/5 pb-3 mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-400" />
              Sector Allocation
            </h2>
            
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading allocation...</div>
            ) : sectorAllocationSorted.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No sector data to display.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {sectorAllocationSorted.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">{item.sector}</span>
                      <span className="text-slate-400 font-mono">
                        ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    {/* CSS Custom Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
