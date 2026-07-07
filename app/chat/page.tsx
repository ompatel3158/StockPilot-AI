'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  BarChart2
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { label: 'Analyze Portfolio Risk', prompt: 'Analyze my current portfolio holdings and identify the key risks and sector concentrations.', icon: AlertTriangle },
    { label: 'Compare RELIANCE & TCS', prompt: 'Compare the fundamentals, current price trends, and AI recommendations for RELIANCE and TCS.', icon: BarChart2 },
    { label: 'Holdings News Summary', prompt: 'Summarize the latest news affecting my current stock holdings.', icon: TrendingUp },
    { label: 'Explain PE Metric', prompt: 'Explain what the P/E ratio is, how to interpret it, and what a high/low PE represents for Indian stocks.', icon: HelpCircle },
  ];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Map message history to simple prompt format expected by API
      const history = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history
        })
      }).then(r => r.json());

      if (res.reply) {
        setMessages(prev => [...prev, { role: 'model', text: res.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I failed to generate an answer. Please check the logs.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Error communicating with AI agent. Please check if your API key is configured.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-96 bg-indigo-600/5 rounded-full blur-3xl -z-10"></div>

      {/* Chat Header */}
      <div className="p-4 bg-slate-950/60 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
              StockPilot AI Copilot
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">CONTEXT-INJECTED ANALYSIS ENGINE</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-[10px] text-slate-400 hover:text-white transition-all"
        >
          Clear History
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 min-h-[300px]">
        {messages.length === 0 ? (
          /* Empty Chat State with Suggestions */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-xl mx-auto py-8">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold text-white mt-2">Chat with your Investment Intelligence</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Ask me about portfolio asset weights, individual stock evaluations, and real-time market developments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
              {suggestions.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="p-3.5 text-left rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-indigo-500/10 transition-all flex flex-col gap-2 group text-xs text-slate-300 hover:text-white"
                  >
                    <Icon className="h-4.5 w-4.5 text-indigo-400 group-hover:scale-105 transition-transform" />
                    <div>
                      <div className="font-bold">{s.label}</div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{s.prompt}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat Message Log */
          <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${isUser ? 'align-self-end items-end ml-auto' : 'align-self-start items-start mr-auto'}`}
                >
                  <span className="text-[9px] font-mono text-slate-600 mb-1">
                    {isUser ? 'YOU' : 'PILOT AI'}
                  </span>
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-900/20' 
                      : 'glass-card text-slate-200 rounded-tl-none border-white/5'
                  }`}>
                    {/* Render paragraphs cleanly */}
                    {m.text.split('\n').map((para, pIdx) => (
                      <p key={pIdx} className="mb-2 last:mb-0">{para}</p>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* AI Loading state */}
            {loading && (
              <div className="flex flex-col items-start max-w-[85%] mr-auto">
                <span className="text-[9px] font-mono text-slate-600 mb-1">PILOT AI</span>
                <div className="glass-card p-4 rounded-2xl rounded-tl-none border-white/5 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950/60 border-t border-white/5">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }} 
          className="flex items-center gap-3 max-w-3xl mx-auto w-full"
        >
          <input
            type="text"
            required
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask StockPilot AI about your portfolio, watchlists, or market trends..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 focus:border-indigo-500/20 text-xs text-white focus:outline-none placeholder-slate-600 transition-all focus:ring-1 focus:ring-indigo-500/10"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="glow-btn p-3 rounded-xl text-white disabled:opacity-40 transition-all shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
