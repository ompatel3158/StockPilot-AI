import { NextResponse } from 'next/server';
import { fetchHoldings } from '@/lib/kotak-neo/client';
import { supabase } from '@/lib/supabase';

// Static sector lookup table, extensible
const SECTOR_MAPPING: Record<string, string> = {
  RELIANCE: 'Energy / Utilities',
  TCS: 'IT Services',
  INFY: 'IT Services',
  HDFCBANK: 'Banking / Finance',
  ICICIBANK: 'Banking / Finance',
  TATAMOTORS: 'Automotive',
  ITC: 'FMCG',
  BHARTIARTL: 'Telecom',
  SBI: 'Banking / Finance',
  LICI: 'Insurance',
  WIPRO: 'IT Services',
  AXISBANK: 'Banking / Finance',
  MARUTI: 'Automotive',
  LT: 'Construction / Eng'
};

export async function GET() {
  try {
    const holdings = await fetchHoldings();
    
    // Sync to Supabase portfolio_cache
    for (const h of holdings) {
      const sector = SECTOR_MAPPING[h.symbol.toUpperCase()] || 'Other';
      try {
        await supabase.from('portfolio_cache').upsert(
          {
            symbol: h.symbol,
            quantity: h.quantity,
            average_price: h.average_price,
            current_price: h.current_price,
            sector: sector,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'symbol' }
        );
      } catch (dbErr) {
        console.error(`Failed to cache ${h.symbol} in Supabase:`, dbErr);
      }
    }

    return NextResponse.json(holdings);
  } catch (error: any) {
    console.error('Error in /api/holdings API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
