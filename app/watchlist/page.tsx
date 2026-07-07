'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Search,
  Eye
} from 'lucide-react';

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/watchlist').then(r => r.json());
      if (Array.isArray(res)) {
        setWatchlist(res);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to load watchlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol) return;
    setAdding(true);
    setError('');

    try {
      const symbolUpper = newSymbol.toUpperCase().trim();
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbolUpper }),
      }).then(r => r.json());

      if (res.error) {
        setError(res.error);
      } else {
        setNewSymbol('');
        fetchWatchlist();
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to add symbol.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!confirm(`Are you sure you want to remove ${symbol} from your watchlist?`)) return;
    setError('');
    try {
      const res = await fetch(`/api/watchlist?symbol=${symbol}`, {
        method: 'DELETE',
      }).then(r => r.json());

      if (res.error) {
        setError(res.error);
      } else {
        fetchWatchlist();
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to remove symbol.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Stock Watchlist
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor key stock quotes in real-time and review AI opportunism scores
            </p>
          </div>
        </div>
        <button
          onClick={fetchWatchlist}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Watchlist'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Watchlist Main Panel */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-5">
            <h2 className="text-md font-bold text-white mb-4">Tracked Symbols</h2>
            
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">Loading watchlist data...</div>
            ) : watchlist.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Your watchlist is currently empty. Use the form on the right to track symbols (e.g. RELIANCE, TCS, TATAMOTORS).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchlist.map((item, idx) => {
                  const quote = item.quote;
                  const percentChange = quote ? parseFloat(quote.percentChange) : 0;
                  const isPositive = percentChange >= 0;

                  return (
                    <div 
                      key={idx} 
                      className="p-4 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all flex flex-col justify-between group relative"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <Link href={`/stock/${item.symbol}`} className="font-bold text-white hover:text-indigo-400 text-sm transition-colors block">
                            {item.symbol}
                          </Link>
                          <span className="text-[9px] text-slate-500 font-mono">NSE EQ segment</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSymbol(item.symbol)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mt-4">
                        <div>
                          <div className="text-sm font-bold text-slate-200">
                            {quote?.lp ? `₹${parseFloat(quote.lp).toFixed(2)}` : '---'}
                          </div>
                          {quote && (
                            <div className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${isPositive ? 'text-gain' : 'text-loss'}`}>
                              {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                            </div>
                          )}
                        </div>
                        <Link 
                          href={`/stock/${item.symbol}`} 
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/10 border border-indigo-500/10 text-[10px] text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300 font-semibold transition-all"
                        >
                          Analyze Stock
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add Symbol Sidebar Panel */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-5">
            <h2 className="text-md font-bold text-white mb-4">Add Tracked Stock</h2>
            
            <form onSubmit={handleAddSymbol} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1.5">
                  Stock Symbol
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="e.g. INFY, TCS, MARUTI"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 focus:border-indigo-500/30 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/20 placeholder-slate-600 transition-all"
                  />
                </div>
                <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                  Enter the standard exchange ticker symbol (NSE). We will resolve the token dynamically via Kotak Neo SDK.
                </p>
              </div>

              <button
                type="submit"
                disabled={adding || !newSymbol}
                className="glow-btn w-full py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {adding ? 'Adding...' : 'Add to Watchlist'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
