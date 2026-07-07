'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  LineChart, 
  Activity,
  Award
} from 'lucide-react';

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (symbol) {
      fetchStockDetails();
    }
  }, [symbol]);

  const fetchStockDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stock?symbol=${symbol}`).then(r => r.json());
      if (res.error) {
        setError(res.error);
      } else {
        setData(res);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to fetch stock intelligence.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono">Running Kotak API & Gemini diagnostics for {symbol}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex flex-col gap-1">
          <div className="font-bold">Error compiling stock metrics</div>
          <p>{error || 'Stock symbol not found or broker offline.'}</p>
        </div>
      </div>
    );
  }

  const { quote, fundamentals, news, aiTake } = data;
  const percentChange = quote ? parseFloat(quote.percentChange) : 0;
  const isPositive = percentChange >= 0;

  // Stance Colors
  const stanceColors = {
    BUY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-950/20',
    SELL: 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-950/20',
    HOLD: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-yellow-950/20'
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back button and refresh */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={fetchStockDetails}
          className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white transition-all"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stock Quote Header */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>
        
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{quote.symbol}</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
              NSE Segment
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live market quote feed from Kotak Neo API</p>
        </div>

        <div className="flex flex-row md:flex-col items-baseline md:items-end justify-between gap-2 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
          <div className="text-3xl font-extrabold text-white font-sans">
            ₹{quote.lp.toFixed(2)}
          </div>
          <div className={`text-sm font-semibold flex items-center gap-1 ${isPositive ? 'text-gain' : 'text-loss'}`}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {isPositive ? '+' : ''}{quote.netChange.toFixed(2)} ({isPositive ? '+' : ''}{percentChange.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Grid: AI Take (Top / Left) and Quote Details (Top / Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gemini AI Intelligence Card */}
        <div className="lg:col-span-2 glass-panel p-6 border-indigo-500/20 relative overflow-hidden shadow-2xl">
          {/* Subtle sparkles background */}
          <div className="absolute top-0 right-0 p-4 opacity-15">
            <Sparkles className="h-16 w-16 text-indigo-400 animate-pulse" />
          </div>

          <div className="flex items-center gap-2 text-indigo-400 border-b border-indigo-500/10 pb-4 mb-5">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-md font-bold text-white uppercase tracking-wider font-mono">Gemini AI Take</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Score 1: Opportunity */}
            <div className="p-4 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider">Opportunity Score</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-white">{aiTake.opportunity_score}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full" style={{ width: `${aiTake.opportunity_score}%` }}></div>
              </div>
            </div>

            {/* Score 2: Risk */}
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-rose-300 uppercase tracking-wider">Risk Score</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-white">{aiTake.risk_score}</span>
                <span className="text-xs text-slate-500">/100</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full" style={{ width: `${aiTake.risk_score}%` }}></div>
              </div>
            </div>

            {/* Stance Recommendation */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between shadow-inner ${stanceColors[aiTake.stance as keyof typeof stanceColors] || stanceColors.HOLD}`}>
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">AI Recommendation Stance</span>
              <div className="text-3xl font-black tracking-wider mt-1">{aiTake.stance}</div>
              <span className="text-[10px] opacity-70 font-mono mt-2">Confidence: {aiTake.confidence}%</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-indigo-400" />
              Core Thesis & Reasoning
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">{aiTake.reasoning}</p>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-[9px] text-yellow-400/80 font-mono flex items-start gap-2">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>DISCLAIMER: This analysis represents personalized, AI-generated reasoning for personal, read-only monitoring and reference. It is not professional financial advice.</span>
          </div>
        </div>

        {/* Live Quote details card */}
        <div className="glass-panel p-5 flex flex-col gap-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
            Session Price Metrics
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
              <span className="text-[9px] text-slate-500 font-mono">OPEN</span>
              <div className="text-sm font-semibold text-slate-200 mt-1">₹{quote.open.toFixed(2)}</div>
            </div>
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
              <span className="text-[9px] text-slate-500 font-mono">PREV CLOSE</span>
              <div className="text-sm font-semibold text-slate-200 mt-1">₹{quote.close.toFixed(2)}</div>
            </div>
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
              <span className="text-[9px] text-slate-500 font-mono">HIGH</span>
              <div className="text-sm font-semibold text-emerald-400 mt-1">₹{quote.high.toFixed(2)}</div>
            </div>
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
              <span className="text-[9px] text-slate-500 font-mono">LOW</span>
              <div className="text-sm font-semibold text-rose-400 mt-1">₹{quote.low.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5 text-[10px]">
            <div className="flex items-center justify-between text-slate-500">
              <span>Momentum trend</span>
              <span className="font-semibold text-indigo-400 uppercase font-mono">{aiTake.momentum}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fundamentals & News sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Fundamentals Section (Scraped / Fallback web search) */}
        <div className="lg:col-span-1 glass-panel p-5">
          <h2 className="text-md font-bold text-white border-b border-white/5 pb-3 mb-4 flex items-center gap-1.5">
            <LineChart className="h-4 w-4 text-indigo-400" />
            Stock Fundamentals
          </h2>
          <div className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.01] border border-white/5 rounded-xl p-4 overflow-y-auto max-h-[300px]">
            {fundamentals.split('\n').map((para: string, idx: number) => (
              <p key={idx} className="mb-2 last:mb-0">{para}</p>
            ))}
          </div>
          <span className="text-[9px] text-slate-500 font-mono mt-3 block">
            Data sourced via Tavily Search API. Cached for 12 hours.
          </span>
        </div>

        {/* Stock Specific News */}
        <div className="lg:col-span-2 glass-panel p-5">
          <h2 className="text-md font-bold text-white border-b border-white/5 pb-3 mb-4 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-indigo-400" />
            Recent Stock Specific News
          </h2>
          
          <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
            {news.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No cached news found for {symbol}. Try triggering ingestion from the dashboard.</div>
            ) : (
              news.map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                      {item.source}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-200 hover:text-indigo-400 transition-colors line-clamp-1">
                    {item.title}
                  </a>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{item.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
