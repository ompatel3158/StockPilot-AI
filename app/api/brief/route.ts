import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateMorningBrief } from '@/lib/ai/gemini';

export async function GET() {
  try {
    // 1. Fetch current holdings
    const { data: holdings } = await supabase.from('portfolio_cache').select('*');
    
    // 2. Fetch watchlist
    const { data: watchlist } = await supabase.from('watchlist').select('symbol');
    const watchlistSymbols = (watchlist || []).map((w) => w.symbol);

    // 3. Fetch top news articles from the last 16 hours (with overall fallback)
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();
    
    let { data: topNews } = await supabase
      .from('news_cache')
      .select('*')
      .gt('published_at', sixteenHoursAgo)
      .order('published_at', { ascending: false })
      .limit(12);

    if (!topNews || topNews.length === 0) {
      // Fallback: get last 10 articles regardless of age if no fresh news
      const { data: fallbackNews } = await supabase
        .from('news_cache')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(10);
      topNews = fallbackNews || [];
    }

    // 4. Trigger Gemini brief generation
    const brief = await generateMorningBrief(holdings || [], watchlistSymbols, topNews);

    return NextResponse.json({ brief });
  } catch (error: any) {
    console.error('Error in /api/brief API route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
