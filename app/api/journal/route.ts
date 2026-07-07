import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, fallbackDb } from '@/lib/supabase';
import { fetchQuote } from '@/lib/kotak-neo/client';
import { generateJournalReflection } from '@/lib/ai/gemini';

export async function GET() {
  try {
    let entries = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        entries = data || [];
      } catch (dbError) {
        console.error('Database query failed, falling back to local journal:', dbError);
        entries = fallbackDb.journal;
      }
    } else {
      entries = fallbackDb.journal;
    }
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      symbol,
      position_type,
      quantity,
      purchase_price,
      entry_reason,
      expected_outcome,
      confidence_score
    } = body;

    if (!symbol || !quantity || !purchase_price || !entry_reason || !expected_outcome) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let addedEntry;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            symbol: symbol.toUpperCase().trim(),
            position_type: position_type || 'LONG',
            quantity: parseFloat(quantity),
            purchase_price: parseFloat(purchase_price),
            entry_reason,
            expected_outcome,
            confidence_score: parseInt(confidence_score) || 50,
            status: 'OPEN'
          })
          .select();

        if (error) throw error;
        addedEntry = data[0];
      } catch (dbError) {
        console.error('Database insert failed, using local journal:', dbError);
      }
    }

    if (!addedEntry) {
      // In-memory fallback
      const newEntry = {
        id: String(fallbackDb.journal.length + 1),
        symbol: symbol.toUpperCase().trim(),
        position_type: position_type || 'LONG',
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchase_price),
        entry_reason,
        expected_outcome,
        confidence_score: parseInt(confidence_score) || 50,
        status: 'OPEN',
        sell_price: null,
        actual_outcome: null,
        exit_date: null,
        reflection: null,
        created_at: new Date().toISOString()
      };
      fallbackDb.journal.push(newEntry as any);
      addedEntry = newEntry;
    }

    return NextResponse.json(addedEntry);
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, sell_price, actual_outcome } = body;

    if (!id || !sell_price) {
      return NextResponse.json({ error: 'Entry ID and exit price are required' }, { status: 400 });
    }

    // 1. Fetch the existing open entry
    let entry;
    if (isSupabaseConfigured) {
      try {
        const { data: entries, error: fetchErr } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('id', id);

        if (fetchErr) throw fetchErr;
        if (entries && entries.length > 0) {
          entry = entries[0];
        }
      } catch (dbError) {
        console.error('Database fetch failed, using local journal:', dbError);
      }
    }

    if (!entry) {
      entry = fallbackDb.journal.find(item => item.id === String(id));
    }

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    if (entry.status === 'CLOSED') {
      return NextResponse.json({ error: 'Journal entry is already closed' }, { status: 400 });
    }

    // 2. Fetch live quote to get actual final details or use the provided sell_price
    let priceHistoryInfo = `Exited stock at Rs ${sell_price}. `;
    try {
      const quote = await fetchQuote(entry.symbol);
      priceHistoryInfo += `At the time of exit, the live market quote was Rs ${quote.lp} (high: Rs ${quote.high}, low: Rs ${quote.low}, previous close: Rs ${quote.close}).`;
    } catch (e) {
      console.warn('Could not fetch exit quote for reflection, using provided exit price:', e);
    }

    // 3. Generate AI Coach reflection comparing thesis to outcome
    let reflection = 'Exited position.';
    try {
      reflection = await generateJournalReflection(entry, parseFloat(sell_price), priceHistoryInfo);
    } catch (aiErr: any) {
      console.error('Failed to generate AI reflection:', aiErr);
      reflection = `Thesis vs Outcome reflection failed: ${aiErr.message || 'Unknown AI error'}`;
    }

    // 4. Update the entry
    let updatedEntry;
    if (isSupabaseConfigured) {
      try {
        const { data: updated, error: updateErr } = await supabase
          .from('journal_entries')
          .update({
            sell_price: parseFloat(sell_price),
            actual_outcome: actual_outcome || 'Exited position.',
            exit_date: new Date().toISOString(),
            reflection,
            status: 'CLOSED'
          })
          .eq('id', id)
          .select();

        if (updateErr) throw updateErr;
        updatedEntry = updated[0];
      } catch (dbError) {
        console.error('Database update failed, using local journal:', dbError);
      }
    }

    if (!updatedEntry) {
      // In-memory fallback
      const idx = fallbackDb.journal.findIndex(item => item.id === String(id));
      if (idx !== -1) {
        fallbackDb.journal[idx] = {
          ...fallbackDb.journal[idx],
          sell_price: parseFloat(sell_price),
          actual_outcome: actual_outcome || 'Exited position.',
          exit_date: new Date().toISOString(),
          reflection,
          status: 'CLOSED'
        };
        updatedEntry = fallbackDb.journal[idx];
      }
    }

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error('Error closing journal entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
