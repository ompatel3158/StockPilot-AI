import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder') &&
  !!supabaseServiceKey &&
  !supabaseServiceKey.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn(
    'Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing or configured with placeholders. StockPilot AI will run in client-side mock database mode.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// In-memory fallback database for developer testing without Supabase
export const fallbackDb = {
  watchlist: [
    { id: '1', symbol: 'RELIANCE', created_at: new Date().toISOString() },
    { id: '2', symbol: 'TCS', created_at: new Date().toISOString() },
    { id: '3', symbol: 'INFY', created_at: new Date().toISOString() }
  ] as Array<{ id: string; symbol: string; created_at: string }>,
  
  journal: [
    {
      id: '1',
      symbol: 'RELIANCE',
      entry_type: 'LONG',
      entry_price: 2350.00,
      target_price: 2600.00,
      stop_loss: 2200.00,
      thesis: 'Strong refinery margins and Jio subscriber growth.',
      ai_reflections: 'Neutral stance. Ensure stop-loss is strictly trailed.',
      status: 'OPEN',
      created_at: new Date().toISOString()
    }
  ] as Array<{
    id: string;
    symbol: string;
    entry_type: string;
    entry_price: number;
    target_price: number;
    stop_loss: number;
    thesis: string;
    ai_reflections: string;
    status: string;
    created_at: string;
  }>
};
