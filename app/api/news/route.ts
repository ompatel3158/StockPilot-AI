import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, fallbackDb } from '@/lib/supabase';
import { ingestNews, getCachedNews } from '@/lib/news/news';

// Static company names mapping for better news search query matching
const COMPANY_NAME_MAPPING: Record<string, string> = {
  RELIANCE: 'Reliance Industries',
  TCS: 'Tata Consultancy Services',
  INFY: 'Infosys',
  HDFCBANK: 'HDFC Bank',
  ICICIBANK: 'ICICI Bank',
  TATAMOTORS: 'Tata Motors',
  ITC: 'ITC Limited',
  BHARTIARTL: 'Bharti Airtel',
  SBI: 'State Bank of India',
  LICI: 'LIC India'
};

export async function GET() {
  try {
    const news = await getCachedNews(40);
    return NextResponse.json(news);
  } catch (error: any) {
    console.error('Error fetching news cache:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    let holdingsList: Array<{ symbol: string; name: string }> = [];
    let watchlistList: string[] = [];

    if (isSupabaseConfigured) {
      try {
        // 1. Get holdings from portfolio cache
        const { data: holdings } = await supabase.from('portfolio_cache').select('symbol');
        holdingsList = (holdings || []).map((h) => {
          // Strip exchange suffixes like .NS if present for search query
          const baseSymbol = h.symbol.split('.')[0].toUpperCase();
          return {
            symbol: h.symbol,
            name: COMPANY_NAME_MAPPING[baseSymbol] || baseSymbol
          };
        });

        // 2. Get watchlist from database
        const { data: watchlist } = await supabase.from('watchlist').select('symbol');
        watchlistList = (watchlist || []).map((w) => w.symbol);
      } catch (dbError) {
        console.error('Database query failed in news POST, using fallbacks:', dbError);
        holdingsList = [
          { symbol: 'RELIANCE', name: 'Reliance Industries' },
          { symbol: 'TCS', name: 'Tata Consultancy Services' },
          { symbol: 'INFY', name: 'Infosys' }
        ];
        watchlistList = ['HDFCBANK'];
      }
    } else {
      // In-memory fallback
      holdingsList = [
        { symbol: 'RELIANCE', name: 'Reliance Industries' },
        { symbol: 'TCS', name: 'Tata Consultancy Services' },
        { symbol: 'INFY', name: 'Infosys' }
      ];
      watchlistList = fallbackDb.watchlist.map((w) => w.symbol);
    }

    // 3. Trigger the ingestion pipeline
    const result = await ingestNews(holdingsList, watchlistList);

    return NextResponse.json({
      success: true,
      message: `News ingestion completed. Saved ${result.count} new articles.`,
      articles_count: result.articles.length
    });
  } catch (error: any) {
    console.error('Error triggering news ingestion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
