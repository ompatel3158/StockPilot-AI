'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  HelpCircle,
  Award,
  BookOpenCheck,
  Calendar,
  X
} from 'lucide-react';

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [positionType, setPositionType] = useState('LONG');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(70);
  
  // Close Form State
  const [closingEntry, setClosingEntry] = useState<any | null>(null);
  const [sellPrice, setSellPrice] = useState('');
  const [actualOutcome, setActualOutcome] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/journal').then(r => r.json());
      if (Array.isArray(res)) {
        setEntries(res);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to fetch journal logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          position_type: positionType,
          quantity: parseFloat(quantity),
          purchase_price: parseFloat(purchasePrice),
          entry_reason: entryReason,
          expected_outcome: expectedOutcome,
          confidence_score: confidenceScore
        })
      }).then(r => r.json());

      if (res.error) {
        setError(res.error);
      } else {
        // Reset form
        setSymbol('');
        setPositionType('LONG');
        setQuantity('');
        setPurchasePrice('');
        setEntryReason('');
        setExpectedOutcome('');
        setConfidenceScore(70);
        setShowAddForm(false);
        fetchEntries();
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to log journal entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingEntry) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: closingEntry.id,
          sell_price: parseFloat(sellPrice),
          actual_outcome: actualOutcome
        })
      }).then(r => r.json());

      if (res.error) {
        setError(res.error);
      } else {
        setClosingEntry(null);
        setSellPrice('');
        setActualOutcome('');
        fetchEntries();
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to close trade entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEntries = entries.filter(e => e.status === 'OPEN');
  const closedEntries = entries.filter(e => e.status === 'CLOSED');

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              AI Investment Coach & Journal
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Log trading rationale, expectations, and review AI coaching critiques upon exits
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="glow-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Log New Position
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <TrendingDown className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Open Entries Section */}
      <div className="glass-panel p-5">
        <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
          Active Trade Journals ({openEntries.length})
        </h2>
        
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">Loading entries...</div>
        ) : openEntries.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No open trade logs. Create a log when buying a stock to track your reasoning.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openEntries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-4 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{entry.symbol}</span>
                    <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${entry.position_type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {entry.position_type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-slate-400">
                    <div>Qty: <span className="text-slate-200">{entry.quantity}</span></div>
                    <div>Price: <span className="text-slate-200">₹{entry.purchase_price}</span></div>
                    <div>Confidence: <span className="text-slate-200">{entry.confidence_score}%</span></div>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5 border-t border-white/[0.03] pt-2.5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400">My Entry Thesis</div>
                    <p className="text-xs text-slate-200 italic">"{entry.entry_reason}"</p>
                  </div>

                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-blue-400">Expected Outcome</div>
                    <p className="text-xs text-slate-300">"{entry.expected_outcome}"</p>
                  </div>
                </div>

                <button
                  onClick={() => setClosingEntry(entry)}
                  className="w-full py-2 rounded-lg bg-indigo-600/10 border border-indigo-500/10 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/20 hover:text-indigo-200 transition-all text-center mt-2"
                >
                  Close Position & Critique
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Closed Entries Section (Includes AI Coach Reflection) */}
      <div className="glass-panel p-5">
        <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
          <BookOpenCheck className="h-4.5 w-4.5 text-indigo-400" />
          Closed Trade Critiques ({closedEntries.length})
        </h2>
        
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">Loading entries...</div>
        ) : closedEntries.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No completed critiques yet. Close active positions to trigger reflection.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {closedEntries.map((entry) => {
              const diff = (entry.sell_price - entry.purchase_price) * entry.quantity;
              const diffPct = ((entry.sell_price - entry.purchase_price) / entry.purchase_price) * 100;
              const isProfit = diff >= 0;

              return (
                <div key={entry.id} className="p-5 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/[0.01] rounded-full blur-2xl -z-10"></div>
                  
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-white text-sm">{entry.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.entry_date).toLocaleDateString('en-IN')} - {new Date(entry.exit_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${isProfit ? 'text-gain' : 'text-loss'}`}>
                        ₹{diff.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${isProfit ? 'text-gain' : 'text-loss'}`}>
                        {isProfit ? '+' : ''}{diffPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Thesis vs Outcome info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">My Initial Thesis ({entry.confidence_score}% Conf)</div>
                      <p className="text-slate-300 leading-relaxed italic">"{entry.entry_reason}"</p>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mt-2.5 mb-1">Expectation</div>
                      <p className="text-slate-400 leading-relaxed">"{entry.expected_outcome}"</p>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">Actual Exit & Outcome</div>
                      <p className="text-slate-300 leading-relaxed font-sans">
                        Bought at ₹{entry.purchase_price} | Sold at ₹{entry.sell_price}
                      </p>
                      <p className="text-slate-400 mt-1.5">"{entry.actual_outcome || 'Position closed.'}"</p>
                    </div>
                  </div>

                  {/* AI Coach Reflection Block */}
                  <div className="p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 flex flex-col gap-2 relative">
                    <div className="absolute top-3 right-3 opacity-10">
                      <Award className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 flex items-center gap-1.5 font-bold">
                      <Award className="h-3.5 w-3.5" />
                      AI Coach Diagnostic Reflection
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed italic">"{entry.reflection}"</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Popup Modal: Log New Position */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 relative flex flex-col gap-4">
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                <BookOpen className="h-5 w-5 text-indigo-400" />
                Log Position Thesis
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Write your active thesis. Gemini will reflect on this later.</p>
            </div>

            <form onSubmit={handleAddEntry} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Symbol</label>
                  <input
                    type="text"
                    required
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. RELIANCE"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Position Type</label>
                  <select
                    value={positionType}
                    onChange={(e) => setPositionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0e1222] border border-white/5 text-white focus:outline-none"
                  >
                    <option value="LONG">LONG (BUY)</option>
                    <option value="SHORT">SHORT (SELL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Purchase Price (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="e.g. 2420.50"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Confidence Score: {confidenceScore}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Entry Reason (Why did you buy?)</label>
                <textarea
                  required
                  rows={2}
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  placeholder="e.g. Strong Q3 margins beat expectations. Retesting 50-day DMA support level."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Expected Outcome (What is your price target/horizon?)</label>
                <textarea
                  required
                  rows={2}
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  placeholder="e.g. Targets Rs 2600 in 3 months. Exit if it breaches Rs 2300 stop loss."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="glow-btn w-full py-2.5 rounded-xl text-xs font-semibold text-white mt-2 disabled:opacity-50"
              >
                {submitting ? 'Logging...' : 'Save Log Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Popup Modal: Close Position */}
      {closingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4">
            <button 
              onClick={() => setClosingEntry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                Close Trade Critique
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Complete trade for {closingEntry.symbol}. Gemini will write a critique.</p>
            </div>

            <form onSubmit={handleCloseEntry} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Actual Exit Sell Price (Rs)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="e.g. 2480.00"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Exit Rationale & Outcome</label>
                <textarea
                  required
                  rows={3}
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  placeholder="e.g. Hit target. Exited as sector tailwinds began shifting. Satisfactory execution."
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="glow-btn w-full py-2.5 rounded-xl text-xs font-semibold text-white mt-2 disabled:opacity-50"
              >
                {submitting ? 'Generating Critique...' : 'Complete & Run AI Critique'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
