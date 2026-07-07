'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  BookOpen, 
  MessageSquare,
  ArrowRight,
  Newspaper,
  Compass,
  AlertTriangle,
  Play
} from 'lucide-react';
import { checkHealth } from '@/lib/kotak-neo/client';

export default function Dashboard() {
  // Data States
  const [holdings, setHoldings] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [brief, setBrief] = useState<string>('');
  
  // Loading & Error States
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [ingestingNews, setIngestingNews] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Fetch microservice health
    try {
      const status = await fetch('/api/holdings').then(r => r.json());
      setHoldings(Array.isArray(status) ? status : []);
    } catch (e) {
      console.error('Error fetching holdings:', e);
    } finally {
      setLoadingHoldings(false);
    }

    try {
      const wl = await fetch('/api/watchlist').then(r => r.json());
      setWatchlist(Array.isArray(wl) ? wl : []);
    } catch (e) {
      console.error('Error fetching watchlist:', e);
    } finally {
      setLoadingWatchlist(false);
    }

    try {
      const ns = await fetch('/api/news').then(r => r.json());
      setNews(Array.isArray(ns) ? ns : []);
    } catch (e) {
      console.error('Error fetching news:', e);
    } finally {
      setLoadingNews(false);
    }

    // Check service health
    try {
      const res = await fetch('/api/health').then(r => r.json());
      setHealthStatus(res);
    } catch (e) {
      console.error('Microservice offline:', e);
    }
  };

  const handleGenerateBrief = async () => {
    setLoadingBrief(true);
    try {
      const res = await fetch('/api/brief').then(r => r.json());
      if (res.brief) {
        setBrief(res.brief);
      }
    } catch (e) {
      console.error('Error generating brief:', e);
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleIngestNews = async () => {
    setIngestingNews(true);
    try {
      const res = await fetch('/api/news', { method: 'POST' }).then(r => r.json());
      if (res.success) {
        // Refresh news list
        const ns = await fetch('/api/news').then(r => r.json());
        setNews(Array.isArray(ns) ? ns : []);
        alert(res.message);
      }
    } catch (e) {
      console.error('Error ingesting news:', e);
      alert('News ingestion failed.');
    } finally {
      setIngestingNews(false);
    }
  };

  // Helper values
  const totalValue = holdings.reduce((sum, h) => sum + (h.mktValue || (h.quantity * h.current_price)), 0);
  const totalCost = holdings.reduce((sum, h) => sum + (h.quantity * h.average_price), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  // Day PnL estimation
  const dayPnl = holdings.reduce((sum, h) => {
    const ltp = h.current_price || 0;
    const close = h.close_price || (ltp * 0.99); // Fallback
    return sum + (h.quantity * (ltp - close));
  }, 0);

  // Markdown renderer helper
  const renderBriefMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-400 text-sm">No Morning Brief generated yet. Click "Generate Brief" above to compile today's intelligence report.</p>;
    
    const lines = text.split('\n');
    return (
      <div className="flex flex-col gap-2">
        {lines.map((line, idx) => {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('# ')) {
            return <h2 key={idx} className="text-lg font-bold text-white mt-3 border-b border-white/5 pb-1">{cleanLine.substring(2)}</h2>;
          }
          if (cleanLine.startsWith('## ')) {
            return <h3 key={idx} className="text-md font-semibold text-indigo-400 mt-2">{cleanLine.substring(3)}</h3>;
          }
          if (cleanLine.startsWith('### ')) {
            return <h4 key={idx} className="text-sm font-semibold text-blue-400 mt-2">{cleanLine.substring(4)}</h4>;
          }
          if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
            return <li key={idx} className="ml-4 list-disc text-slate-300 text-xs mb-0.5">{cleanLine.substring(2)}</li>;
          }
          if (cleanLine === '') {
            return <div key={idx} className="h-1"></div>;
          }
          return <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-0.5">{cleanLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Investor Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time market tracking and portfolio diagnostics powered by Gemini
          </p>
        </div>
        <div className="flex items-center gap-3">
          {healthStatus && (
            <div className={`px-2.5 py-1 rounded-full border text-[10px] font-mono flex items-center gap-1.5 ${
              healthStatus.mock_mode 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {healthStatus.mock_mode ? 'KOTAK NEO MOCK' : 'KOTAK NEO LIVE'}
            </div>
          )}
          <button 
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Net Asset Value */}
        <div className="glass-card p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Net Asset Value
            </div>
            <div className="text-2xl font-bold font-sans mt-1 text-white">
              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 font-mono">
            Synced from Kotak Neo holdings
          </div>
        </div>

        {/* Total Returns */}
        <div className="glass-card p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Total returns
            </div>
            <div className={`text-2xl font-bold font-sans mt-1 flex items-center gap-1.5 ${totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
              ₹{totalPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-current/10">
                {totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="text-xs flex items-center gap-1">
            {totalPnl >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-400" />
            )}
            <span className="text-[10px] text-slate-500 font-mono">All-time return profile</span>
          </div>
        </div>

        {/* Estimated Day Return */}
        <div className="glass-card p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Today's returns
            </div>
            <div className={`text-2xl font-bold font-sans mt-1 flex items-center gap-1.5 ${dayPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
              ₹{dayPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-current/10">
                {dayPnl >= 0 ? '+' : ''}{totalValue > 0 ? ((dayPnl / totalValue) * 100).toFixed(2) : '0.00'}%
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Estimated from LTP vs Close
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Brief & News */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Morning Brief panel */}
          <div className="glass-panel p-5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-400" />
                <h2 className="text-md font-bold text-white">Morning Intelligence Brief</h2>
              </div>
              <button
                onClick={handleGenerateBrief}
                disabled={loadingBrief}
                className="glow-btn flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              >
                {loadingBrief ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                {loadingBrief ? 'Generating...' : 'Generate Brief'}
              </button>
            </div>
            <div className="min-h-[160px] max-h-[400px] overflow-y-auto pr-2">
              {loadingBrief ? (
                <div className="flex flex-col items-center justify-center min-h-[160px] gap-2">
                  <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-mono">Gemini is synthesizing holdings and news...</p>
                </div>
              ) : (
                renderBriefMarkdown(brief)
              )}
            </div>
          </div>

          {/* News Feed */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-indigo-400" />
                <h2 className="text-md font-bold text-white">Live News & Sentiment</h2>
              </div>
              <button
                onClick={handleIngestNews}
                disabled={ingestingNews}
                className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all flex items-center gap-1.5"
              >
                {ingestingNews ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {ingestingNews ? 'Ingesting...' : 'Ingest Feed'}
              </button>
            </div>
            
            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2">
              {loadingNews ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">Loading news feed...</div>
              ) : news.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No cached news found. Click "Ingest Feed" to scrape.</div>
              ) : (
                news.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        {item.source}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(item.published_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-200 hover:text-indigo-400 transition-colors line-clamp-2">
                      {item.title}
                    </a>
                    
                    <p className="text-[11px] text-slate-400 line-clamp-2">{item.summary}</p>
                    
                    <div className="flex items-center justify-between mt-1 text-[10px] border-t border-white/[0.02] pt-2">
                      <div className="flex items-center gap-2">
                        {item.symbol && (
                          <Link href={`/stock/${item.symbol}`} className="font-mono font-semibold text-blue-400 hover:underline">
                            {item.symbol}
                          </Link>
                        )}
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          item.sentiment_label === 'positive' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : item.sentiment_label === 'negative' 
                            ? 'bg-rose-500/10 text-rose-400' 
                            : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {item.sentiment_label}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono">
                        Category: {item.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - Holdings & Watchlist quick view */}
        <div className="flex flex-col gap-6">
          
          {/* Portfolio quick view */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="text-md font-bold text-white">Holdings Summary</h2>
              <Link href="/portfolio" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-all">
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="flex flex-col gap-3">
              {loadingHoldings ? (
                <div className="py-4 text-center text-xs text-slate-500 font-mono">Loading portfolio...</div>
              ) : holdings.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No holdings detected.</div>
              ) : (
                holdings.map((h, idx) => (
                  <Link 
                    href={`/stock/${h.symbol}`} 
                    key={idx} 
                    className="p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{h.symbol}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{h.quantity} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-200">
                        ₹{(h.quantity * h.current_price).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl_percentage.toFixed(1)}%
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Watchlist quick view */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="text-md font-bold text-white">Watchlist LTP</h2>
              <Link href="/watchlist" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-all">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="flex flex-col gap-3">
              {loadingWatchlist ? (
                <div className="py-4 text-center text-xs text-slate-500 font-mono">Loading watchlist...</div>
              ) : watchlist.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">Watchlist is empty.</div>
              ) : (
                watchlist.map((item, idx) => (
                  <Link 
                    href={`/stock/${item.symbol}`} 
                    key={idx}
                    className="p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.symbol}</div>
                      <span className="text-[9px] font-mono text-slate-500">LTP</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-200">
                        ₹{item.quote?.lp ? parseFloat(item.quote.lp).toFixed(2) : '---'}
                      </div>
                      {item.quote?.percentChange ? (
                        <div className={`text-[10px] font-semibold mt-0.5 ${parseFloat(item.quote.percentChange) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {parseFloat(item.quote.percentChange) >= 0 ? '+' : ''}{parseFloat(item.quote.percentChange).toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500">Live Quote</div>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/journal" className="glass-card p-4 flex flex-col justify-between hover:border-indigo-500/20 text-slate-300 hover:text-white transition-all">
              <BookOpen className="h-5 w-5 text-indigo-400 mb-4" />
              <div>
                <div className="text-xs font-bold">AI Journal</div>
                <p className="text-[10px] text-slate-500 mt-1">Log & reflect on trades</p>
              </div>
            </Link>
            <Link href="/chat" className="glass-card p-4 flex flex-col justify-between hover:border-indigo-500/20 text-slate-300 hover:text-white transition-all">
              <MessageSquare className="h-5 w-5 text-indigo-400 mb-4" />
              <div>
                <div className="text-xs font-bold">AI Chat</div>
                <p className="text-[10px] text-slate-500 mt-1">Context-injected copilot</p>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
