import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { chatWithContext } from '@/lib/ai/gemini';
import { searchWeb } from '@/lib/search/search';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Fetch current portfolio holdings cache
    const { data: holdings } = await supabase.from('portfolio_cache').select('*');
    
    // 2. Fetch watchlist
    const { data: watchlist } = await supabase.from('watchlist').select('symbol');
    const watchlistSymbols = (watchlist || []).map((w) => w.symbol);

    // 3. Fetch recent news
    const { data: news } = await supabase
      .from('news_cache')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(10);

    // 4. Determine if we should perform web search
    let searchResponse = '';
    const lowerMessage = message.toLowerCase();
    
    // Trigger Tavily web search for informational queries or explicit search/web requests
    const shouldSearch = 
      lowerMessage.includes('search') || 
      lowerMessage.includes('web') || 
      lowerMessage.includes('latest news') ||
      lowerMessage.includes('why is') ||
      lowerMessage.includes('what is the') ||
      lowerMessage.includes('pe ratio') ||
      lowerMessage.includes('fundamentals') ||
      lowerMessage.includes('dividend');
      
    if (shouldSearch) {
      console.log(`Running on-demand search query: "${message}"`);
      try {
        const searchRes = await searchWeb(message);
        searchResponse = searchRes.answer || 
                         searchRes.results.map((r) => `${r.title}: ${r.content}`).join('\n\n');
      } catch (searchErr) {
        console.error('On-demand search failed:', searchErr);
      }
    }

    // 5. Query Gemini chat engine with complete context
    const reply = await chatWithContext(
      message,
      history || [],
      holdings || [],
      watchlistSymbols,
      news || [],
      searchResponse
    );

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat' },
      { status: 500 }
    );
  }
}
