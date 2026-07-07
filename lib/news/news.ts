import axios from 'axios';
import { supabase } from '../supabase';

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'negative' | 'neutral';
  symbol?: string; // Associated stock symbol
  category: 'holding' | 'watchlist' | 'global';
  published_at: string;
}

/**
 * Ingests news from GNews, NewsAPI, and Finnhub, deduplicates, and caches in Supabase.
 */
export async function ingestNews(
  holdings: Array<{ symbol: string; name: string }>,
  watchlist: string[]
): Promise<{ count: number; articles: NewsArticle[] }> {
  const articlesToCache: NewsArticle[] = [];
  
  // 1. Gather global/general market news from Finnhub
  try {
    const finnhubArticles = await fetchFinnhubGlobalNews();
    articlesToCache.push(...finnhubArticles);
  } catch (error) {
    console.error('Failed to fetch Finnhub global news:', error);
  }

  // 2. Fetch specific news for holdings
  for (const stock of holdings) {
    try {
      const stockNews = await fetchCompanyNews(stock.symbol, stock.name, 'holding');
      articlesToCache.push(...stockNews);
    } catch (error) {
      console.error(`Failed to fetch news for holding ${stock.symbol}:`, error);
    }
  }

  // 3. Fetch specific news for watchlist
  for (const symbol of watchlist) {
    try {
      // Use symbol as company name for search query simplicity
      const stockNews = await fetchCompanyNews(symbol, symbol, 'watchlist');
      articlesToCache.push(...stockNews);
    } catch (error) {
      console.error(`Failed to fetch news for watchlist ${symbol}:`, error);
    }
  }

  // 4. Fallback to mock news if no articles could be fetched (e.g. no keys)
  if (articlesToCache.length === 0) {
    logging('No API keys or connections found. Using high-quality mock news.');
    const mockArticles = getMockNews(holdings.map(h => h.symbol), watchlist);
    articlesToCache.push(...mockArticles);
  }

  // 5. Deduplicate and cache in Supabase
  const dedupedArticles = deduplicateArticles(articlesToCache);
  let savedCount = 0;

  for (const article of dedupedArticles) {
    try {
      // Upsert into Supabase (url is unique constraint)
      const { data, error } = await supabase
        .from('news_cache')
        .upsert(
          {
            title: article.title,
            url: article.url,
            source: article.source,
            summary: article.summary,
            sentiment_score: article.sentiment_score,
            sentiment_label: article.sentiment_label,
            symbol: article.symbol || null,
            category: article.category,
            published_at: article.published_at,
          },
          { onConflict: 'url' }
        )
        .select();

      if (error) {
        // Unique key violation is normal if article already exists
        if (!error.message.includes('duplicate key')) {
          console.error('Error saving article to Supabase:', error);
        }
      } else if (data && data.length > 0) {
        savedCount++;
      }
    } catch (err) {
      console.error('Failed to insert article into DB:', err);
    }
  }

  return {
    count: savedCount,
    articles: dedupedArticles,
  };
}

/**
 * Retrieve cached news from Supabase.
 */
export async function getCachedNews(limit = 30): Promise<NewsArticle[]> {
  try {
    const { data, error } = await supabase
      .from('news_cache')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as NewsArticle[];
  } catch (error) {
    console.error('Error fetching cached news from Supabase:', error);
    // Return empty array or generated mock news as fallback
    return getMockNews(['RELIANCE', 'TCS', 'INFY'], ['HDFCBANK']);
  }
}

/**
 * Heuristic sentiment analysis.
 */
function analyzeSentiment(title: string, summary: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  const text = (title + ' ' + summary).toLowerCase();
  
  const positiveWords = ['growth', 'profit', 'surges', 'win', 'beat', 'growth', 'rise', 'upgrade', 'expansion', 'deal', 'gains', 'high', 'positive', 'outperform', 'buy'];
  const negativeWords = ['fall', 'drop', 'slump', 'loss', 'decline', 'miss', 'downgrade', 'debt', 'risk', 'crisis', 'negative', 'underperform', 'sell', 'cut', 'slashed'];

  let posCount = 0;
  let negCount = 0;

  positiveWords.forEach(w => { if (text.includes(w)) posCount++; });
  negativeWords.forEach(w => { if (text.includes(w)) negCount++; });

  if (posCount > negCount) {
    const score = Math.min(0.1 * (posCount - negCount), 1.0);
    return { score, label: 'positive' };
  } else if (negCount > posCount) {
    const score = Math.max(-0.1 * (negCount - posCount), -1.0);
    return { score, label: 'negative' };
  } else {
    return { score: 0.0, label: 'neutral' };
  }
}

/**
 * Fetch global market news from Finnhub.
 */
async function fetchFinnhubGlobalNews(): Promise<NewsArticle[]> {
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY.startsWith('your_')) return [];
  
  const res = await axios.get('https://finnhub.io/api/v1/news', {
    params: { category: 'general', token: FINNHUB_API_KEY },
    timeout: 8000
  });

  return (res.data || []).slice(0, 10).map((art: any) => {
    const { score, label } = analyzeSentiment(art.headline || '', art.summary || '');
    return {
      title: art.headline,
      url: art.url,
      source: art.source || 'Finnhub',
      summary: art.summary || art.headline,
      sentiment_score: score,
      sentiment_label: label,
      category: 'global' as const,
      published_at: new Date(art.datetime * 1000).toISOString(),
    };
  });
}

/**
 * Fetch specific company news from NewsAPI and GNews.
 */
async function fetchCompanyNews(symbol: string, name: string, category: 'holding' | 'watchlist'): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];
  const query = name ? `${name} stock` : `${symbol} stock`;

  // 1. Fetch from GNews
  if (GNEWS_API_KEY && !GNEWS_API_KEY.startsWith('your_')) {
    try {
      const res = await axios.get('https://gnews.io/api/v4/search', {
        params: { q: query, token: GNEWS_API_KEY, lang: 'en', max: 5 },
        timeout: 8000
      });
      
      const gnewsArticles = (res.data?.articles || []).map((art: any) => {
        const { score, label } = analyzeSentiment(art.title || '', art.description || '');
        return {
          title: art.title,
          url: art.url,
          source: art.source?.name || 'GNews',
          summary: art.description || art.title,
          sentiment_score: score,
          sentiment_label: label,
          symbol: symbol,
          category: category,
          published_at: new Date(art.publishedAt).toISOString(),
        };
      });
      articles.push(...gnewsArticles);
    } catch (err) {
      console.error(`GNews fetch failed for ${symbol}:`, err);
    }
  }

  // 2. Fetch from NewsAPI
  if (NEWSAPI_KEY && !NEWSAPI_KEY.startsWith('your_')) {
    try {
      const res = await axios.get('https://newsapi.org/v2/everything', {
        params: { q: query, apiKey: NEWSAPI_KEY, language: 'en', pageSize: 5, sortBy: 'publishedAt' },
        timeout: 8000
      });
      
      const newsApiArticles = (res.data?.articles || []).map((art: any) => {
        const { score, label } = analyzeSentiment(art.title || '', art.description || '');
        return {
          title: art.title,
          url: art.url,
          source: art.source?.name || 'NewsAPI',
          summary: art.description || art.title,
          sentiment_score: score,
          sentiment_label: label,
          symbol: symbol,
          category: category,
          published_at: new Date(art.publishedAt).toISOString(),
        };
      });
      articles.push(...newsApiArticles);
    } catch (err) {
      console.error(`NewsAPI fetch failed for ${symbol}:`, err);
    }
  }

  return articles;
}

/**
 * Deduplicate articles by title or URL.
 */
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  
  return articles.filter(art => {
    const titleKey = art.title.toLowerCase().trim();
    if (seenUrls.has(art.url) || seenTitles.has(titleKey)) {
      return false;
    }
    seenUrls.add(art.url);
    seenTitles.add(titleKey);
    return true;
  });
}

function logging(msg: string) {
  console.log(`[News Ingester] ${msg}`);
}

/**
 * Generates high-quality mock news.
 */
function getMockNews(holdings: string[], watchlist: string[]): NewsArticle[] {
  const now = new Date();
  const mockArticles: NewsArticle[] = [
    {
      title: "Finnhub Global Index: Indian Markets Show Resilience Amid Global Bond Rate Volatility",
      url: "https://mock.finnhub.io/global-resilience",
      source: "Finnhub",
      summary: "Major Indian indices BSE Sensex and NSE Nifty 50 traded flat but displayed relative outperformance compared to Asian peers as foreign fund outflow slowed down.",
      sentiment_score: 0.1,
      sentiment_label: "positive",
      category: "global",
      published_at: new Date(now.getTime() - 2 * 3600000).toISOString(), // 2 hours ago
    },
    {
      title: "Global Supply Chain Rebound Enhances Outlook for Heavyweights",
      url: "https://mock.finnhub.io/supply-chain-rebound",
      source: "Finnhub",
      summary: "Easing logistics costs and structural freight changes boost prospects for multi-sector industrial conglomerates across emerging markets.",
      sentiment_score: 0.3,
      sentiment_label: "positive",
      category: "global",
      published_at: new Date(now.getTime() - 5 * 3600000).toISOString(),
    }
  ];

  if (holdings.includes("RELIANCE")) {
    mockArticles.push({
      title: "Reliance Retail Plans Massive Scale-up in Tier 2 and Tier 3 Cities, Analysts Bullish",
      url: "https://mock.gnews.io/reliance-retail-expansion",
      source: "GNews",
      summary: "Reliance Industries retail division plans to add 500 new stores focusing on high-margin fashion and consumer brands. Analysts expect a 12% revenue growth next quarter.",
      sentiment_score: 0.6,
      sentiment_label: "positive",
      symbol: "RELIANCE",
      category: "holding",
      published_at: new Date(now.getTime() - 1 * 3600000).toISOString(),
    });
  }

  if (holdings.includes("TCS")) {
    mockArticles.push({
      title: "TCS Secures Multi-Million Dollar Cloud Transformation Deal with European Bank",
      url: "https://mock.newsapi.org/tcs-cloud-deal",
      source: "NewsAPI",
      summary: "Tata Consultancy Services (TCS) announced a 6-year strategic partnership with a leading European banking group to migrate their legacy mainframe structure to a modern hybrid cloud.",
      sentiment_score: 0.7,
      sentiment_label: "positive",
      symbol: "TCS",
      category: "holding",
      published_at: new Date(now.getTime() - 3 * 3600000).toISOString(),
    });
  }

  if (holdings.includes("INFY")) {
    mockArticles.push({
      title: "Infosys Warns of Soft Tech Spending in Q2, Lowering Margins Heuristics",
      url: "https://mock.newsapi.org/infosys-spend-warning",
      source: "NewsAPI",
      summary: "Infosys CEO states that North American client spending remains cautious in IT operations, indicating that corporate tech expenditure will stay flat for another quarter.",
      sentiment_score: -0.4,
      sentiment_label: "negative",
      symbol: "INFY",
      category: "holding",
      published_at: new Date(now.getTime() - 4 * 3600000).toISOString(),
    });
  }

  if (watchlist.includes("HDFCBANK") || holdings.includes("HDFCBANK")) {
    mockArticles.push({
      title: "HDFC Bank Posts 15% YoY Loan Book Growth, Lowering NPA Ratios",
      url: "https://mock.gnews.io/hdfc-bank-loan-growth",
      source: "GNews",
      summary: "HDFC Bank's latest quarterly performance details show robust credit demand in retail and corporate loans. Gross NPA ratios fell to 1.18% from 1.24% quarter-on-quarter.",
      sentiment_score: 0.5,
      sentiment_label: "positive",
      symbol: "HDFCBANK",
      category: "watchlist",
      published_at: new Date(now.getTime() - 6 * 3600000).toISOString(),
    });
  }

  return mockArticles;
}
