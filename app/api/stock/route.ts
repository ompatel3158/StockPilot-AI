import { NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/kotak-neo/client';
import { searchWeb } from '@/lib/search/search';
import { generateStockAnalysis } from '@/lib/ai/gemini';
import { supabase } from '@/lib/supabase';

// In-memory cache for stock fundamentals (persists during runtime)
const fundamentalsCache: Record<string, { data: string; timestamp: number }> = {};
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours cache TTL

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    // Strip suffixes like .NS / .BO for clean searching
    const baseSymbol = cleanSymbol.split('.')[0];

    // 1. Fetch live quote from Kotak Neo microservice
    const quote = await fetchQuote(cleanSymbol);

    // 2. Fetch stock fundamentals (try cache first, then fall back to web search)
    let fundamentals = '';
    const now = Date.now();
    const cached = fundamentalsCache[cleanSymbol];
    
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      fundamentals = cached.data;
    } else {
      console.log(`Cache miss for ${cleanSymbol} fundamentals. Querying web search...`);
      const searchRes = await searchWeb(`${baseSymbol} stock key financial metrics PE ratio PB ratio ROE ROCE fundamentals`);
      fundamentals = searchRes.answer || 
                     searchRes.results.map(r => r.content).join('\n') || 
                     `Fundamentals search did not return results for ${cleanSymbol}.`;
      
      // Store in cache
      fundamentalsCache[cleanSymbol] = {
        data: fundamentals,
        timestamp: now
      };
    }

    // 3. Fetch recent cached news from Supabase related to this symbol
    const { data: dbNews } = await supabase
      .from('news_cache')
      .select('*')
      .or(`symbol.eq.${cleanSymbol},symbol.eq.${baseSymbol}`)
      .order('published_at', { ascending: false })
      .limit(5);

    // 4. Generate AI Take using Gemini
    const aiTake = await generateStockAnalysis(cleanSymbol, quote, fundamentals, dbNews || []);

    return NextResponse.json({
      symbol: cleanSymbol,
      quote,
      fundamentals,
      news: dbNews || [],
      aiTake
    });
  } catch (error: any) {
    console.error(`Error in /api/stock API route for symbol:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to aggregate stock details' },
      { status: 500 }
    );
  }
}
