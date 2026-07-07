import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, fallbackDb } from '@/lib/supabase';
import { fetchQuote } from '@/lib/kotak-neo/client';

export async function GET() {
  try {
    let watchlist = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('watchlist').select('*');
        if (error) throw error;
        watchlist = data || [];
      } catch (dbError) {
        console.error('Database query failed, falling back to local watchlist:', dbError);
        watchlist = fallbackDb.watchlist;
      }
    } else {
      watchlist = fallbackDb.watchlist;
    }

    // Fetch live quote for each watchlist symbol in parallel
    const watchlistWithQuotes = await Promise.all(
      watchlist.map(async (item) => {
        try {
          const quote = await fetchQuote(item.symbol);
          return { ...item, quote };
        } catch (e) {
          console.error(`Failed to fetch quote for watchlist symbol ${item.symbol}:`, e);
          return { ...item, quote: null };
        }
      })
    );

    return NextResponse.json(watchlistWithQuotes);
  } catch (error: any) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('watchlist')
          .upsert({ symbol: cleanSymbol }, { onConflict: 'symbol' })
          .select();
        if (error) throw error;
        return NextResponse.json(data[0]);
      } catch (dbError) {
        console.error('Database insert failed, using local watchlist:', dbError);
      }
    }
    
    // In-memory fallback
    const exists = fallbackDb.watchlist.find(item => item.symbol === cleanSymbol);
    if (!exists) {
      fallbackDb.watchlist.push({
        id: String(fallbackDb.watchlist.length + 1),
        symbol: cleanSymbol,
        created_at: new Date().toISOString()
      });
    }
    const addedItem = fallbackDb.watchlist.find(item => item.symbol === cleanSymbol);
    return NextResponse.json(addedItem);
  } catch (error: any) {
    console.error('Error adding symbol to watchlist:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('symbol', cleanSymbol);
        if (error) throw error;
        return NextResponse.json({ success: true });
      } catch (dbError) {
        console.error('Database delete failed, using local watchlist:', dbError);
      }
    }
    
    // In-memory fallback
    fallbackDb.watchlist = fallbackDb.watchlist.filter(item => item.symbol !== cleanSymbol);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting symbol from watchlist:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
