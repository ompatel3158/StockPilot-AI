-- Supabase PostgreSQL Schema for StockPilot AI

-- 1. Portfolio Cache (for Kotak Neo holdings)
CREATE TABLE IF NOT EXISTS portfolio_cache (
    symbol TEXT PRIMARY KEY,
    quantity NUMERIC NOT NULL DEFAULT 0,
    average_price NUMERIC NOT NULL DEFAULT 0,
    current_price NUMERIC NOT NULL DEFAULT 0,
    sector TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - since it is single user, we can keep it simple or enable and write a simple policy.
-- To keep it simple for a personal MVP, we will allow service-key level access or simple bypass for local use.
ALTER TABLE portfolio_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read/write with service key" ON portfolio_cache USING (true) WITH CHECK (true);

-- 2. Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read/write with service key" ON watchlist USING (true) WITH CHECK (true);

-- 3. News Cache (deduplicated index & company news)
CREATE TABLE IF NOT EXISTS news_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    summary TEXT,
    sentiment_score NUMERIC, -- -1.0 to 1.0
    sentiment_label TEXT, -- positive, negative, neutral
    symbol TEXT, -- Associated stock symbol if applicable, otherwise NULL for general news
    category TEXT NOT NULL, -- 'holding', 'watchlist', 'global'
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_cache(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_symbol ON news_cache(symbol);

ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read/write with service key" ON news_cache USING (true) WITH CHECK (true);

-- 4. Journal Entries (for AI reflection and coach log)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    position_type TEXT NOT NULL DEFAULT 'LONG', -- 'LONG' or 'SHORT'
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    quantity NUMERIC NOT NULL,
    purchase_price NUMERIC NOT NULL,
    sell_price NUMERIC,
    entry_reason TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    actual_outcome TEXT,
    reflection TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN' or 'CLOSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal_entries(symbol);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read/write with service key" ON journal_entries USING (true) WITH CHECK (true);
