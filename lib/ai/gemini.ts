import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your_')) {
  console.warn('Warning: GEMINI_API_KEY is not configured. AI features will run with fallback mock analyses.');
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || 'placeholder'
});

export interface AITakeResponse {
  opportunity_score: number;
  risk_score: number;
  momentum: string;
  stance: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  confidence: number;
}

/**
 * Generates stock opportunity score, risk score, momentum, and BUY/SELL/HOLD stance.
 */
export async function generateStockAnalysis(
  symbol: string,
  priceInfo: any,
  fundamentals: string,
  news: any[]
): Promise<AITakeResponse> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your_')) {
    return getMockAnalysis(symbol);
  }

  const newsStr = news
    .map((art, idx) => `[News ${idx + 1}] Source: ${art.source}, Title: ${art.title}, Summary: ${art.summary}`)
    .join('\n\n');

  const prompt = `
Analyze the Indian stock market ticker "${symbol}" based on the following inputs:
- Live Price Info: ${JSON.stringify(priceInfo)}
- Fundamentals (PE, PB, ROE, etc.): ${fundamentals}
- Recent News Context:
${newsStr || 'No recent news available.'}

Provide an opportunity score (0-100), risk score (0-100), market momentum label (e.g. "Strong Bullish", "Neutral", "Bearish"), and an explicit BUY / SELL / HOLD stance (for personal investment reference only). Add 2-3 sentences of core reasoning and a confidence percentage (0-100%).

You MUST return a JSON object with the following schema:
{
  "opportunity_score": number,
  "risk_score": number,
  "momentum": string,
  "stance": "BUY" | "SELL" | "HOLD",
  "reasoning": string,
  "confidence": number
}
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text?.trim() || '{}';
    return JSON.parse(text) as AITakeResponse;
  } catch (error) {
    console.error(`Gemini analysis failed for ${symbol}:`, error);
    return getMockAnalysis(symbol);
  }
}

/**
 * Generates the Morning Brief summarizing market, portfolio, and stocks to watch.
 */
export async function generateMorningBrief(
  portfolio: any[],
  watchlist: string[],
  topNews: any[]
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your_')) {
    return getMockMorningBrief(portfolio, watchlist);
  }

  const portfolioStr = portfolio
    .map(p => `Symbol: ${p.symbol}, Qty: ${p.quantity}, Avg Price: ${p.average_price}, LTP: ${p.current_price}, P&L: ${p.pnl}`)
    .join('\n');

  const newsStr = topNews
    .map((art, idx) => `[${idx + 1}] ${art.title} (${art.source}) - ${art.summary}`)
    .join('\n');

  const prompt = `
Generate a concise, professional Morning Brief for an Indian investor (NSE/BSE).
Current Portfolio:
${portfolioStr || 'No positions held.'}

Watchlist: ${watchlist.join(', ') || 'No symbols watchlisted.'}

Top Recent News:
${newsStr || 'No recent news.'}

Provide the brief in markdown. It must contain:
1. **Market Pulse** (1-2 sentences summarizing global/NSE sentiment)
2. **Portfolio Health** (1-2 sentences on recent gains/risks)
3. **Stocks to Watch** (2-3 specific symbols from holdings/watchlist to track today, with brief triggers)
4. **Key Risk Alert** (One primary risk or negative trigger to monitor)
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    return response.text || 'Unable to generate morning brief.';
  } catch (error) {
    console.error('Gemini Morning Brief generation failed:', error);
    return getMockMorningBrief(portfolio, watchlist);
  }
}

/**
 * Generates AI Coach reflection on closed journal entries.
 */
export async function generateJournalReflection(
  entry: any,
  actualExitPrice: number,
  priceHistoryInfo: string
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your_')) {
    return `Reflecting on ${entry.symbol}: Your entry thesis was based on '${entry.entry_reason}' expecting '${entry.expected_outcome}' with ${entry.confidence_score}% confidence. You purchased at Rs ${entry.purchase_price} and exited at Rs ${actualExitPrice} (gain/loss: ${(((actualExitPrice - entry.purchase_price) / entry.purchase_price) * 100).toFixed(2)}%). Thesis holds: yes, price momentum validated your exit.`;
  }

  const prompt = `
You are an AI Investment Coach. Reflect on the investor's completed trade.
Trade Info:
- Stock: ${entry.symbol}
- Purchase Price: Rs ${entry.purchase_price}
- Sell/Exit Price: Rs ${actualExitPrice}
- Quantity: ${entry.quantity}
- User's Stated Entry Reason: "${entry.entry_reason}"
- User's Expected Outcome: "${entry.expected_outcome}"
- Confidence: ${entry.confidence_score}%
- Actual Price Trend during trade: ${priceHistoryInfo}

Write a 2-3 sentence reflection analyzing if the user's initial thesis was correct, if their expectations were realistic, and what lessons they can draw from the outcome.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    return response.text || 'Unable to generate journal reflection.';
  } catch (error) {
    console.error('Gemini Journal Reflection failed:', error);
    return `Thesis analysis complete. Exit at ${actualExitPrice} relative to purchase at ${entry.purchase_price} suggests reasonable execution. Continue monitoring sector momentum.`;
  }
}

/**
 * Chat with context injected about portfolio, watchlist, and news.
 */
export async function chatWithContext(
  message: string,
  chatHistory: Array<{ role: 'user' | 'model'; text: string }>,
  portfolio: any[],
  watchlist: string[],
  recentNews: any[],
  searchResponse?: string
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('your_')) {
    return `[Mock AI Chat] I received your message: "${message}". I can see you hold ${portfolio.length} stocks (including ${portfolio.map(p => p.symbol).join(', ')}) and have ${watchlist.length} stocks in your watchlist. How can I help you analyze these further?`;
  }

  const portfolioStr = portfolio
    .map(p => `- ${p.symbol}: Qty ${p.quantity}, Avg Price ${p.average_price}, Current Price ${p.current_price}, P&L ${p.pnl.toFixed(2)}`)
    .join('\n');

  const newsStr = recentNews
    .map(art => `- [${art.symbol || 'Global'}] ${art.title} (${art.source})`)
    .join('\n');

  const formattedHistory = chatHistory.map(h => ({
    role: h.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: h.text }]
  }));

  const systemInstructions = `
You are StockPilot AI, a personalized investment assistant for an Indian retail stock market investor.
You have access to the user's live portfolio and watchlist:
Current Portfolio:
${portfolioStr || 'None'}

Watchlist: ${watchlist.join(', ') || 'None'}

Recent Relevant News:
${newsStr || 'None'}

${searchResponse ? `Web Search Fallback Context:\n${searchResponse}\n` : ''}

Use this context to answer the user's question. Be direct, concise, and prioritize their holding companies. Refrain from offering formal financial advice; add a standard personal-use-only disclaimer.
`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { role: 'user', parts: [{ text: systemInstructions }] },
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ]
    });
    return response.text || 'I could not process that request.';
  } catch (error) {
    console.error('Gemini Chat failed:', error);
    return 'Sorry, I encountered an error communicating with the AI. Please try again.';
  }
}

/**
 * Returns mock analyses for demonstration.
 */
function getMockAnalysis(symbol: string): AITakeResponse {
  const symbolUpper = symbol.toUpperCase();
  if (symbolUpper.includes('RELIANCE')) {
    return {
      opportunity_score: 78,
      risk_score: 22,
      momentum: "Mild Bullish",
      stance: "BUY",
      reasoning: "Reliance Retail's expansion plans combined with strong petrochemical margins provide a solid floor. The technical chart shows a breakout from the consolidation range.",
      confidence: 85
    };
  }
  if (symbolUpper.includes('TCS')) {
    return {
      opportunity_score: 65,
      risk_score: 15,
      momentum: "Neutral",
      stance: "HOLD",
      reasoning: "TCS continues to win large cloud transformation contracts, reinforcing steady long-term cash flow. However, near-term IT expenditure slowdown limits upside.",
      confidence: 90
    };
  }
  if (symbolUpper.includes('INFY')) {
    return {
      opportunity_score: 45,
      risk_score: 35,
      momentum: "Mild Bearish",
      stance: "HOLD",
      reasoning: "North American client caution could strain operating margins. Suggest waiting for next quarter's commentary before increasing allocation.",
      confidence: 80
    };
  }
  return {
    opportunity_score: 55,
    risk_score: 40,
    momentum: "Neutral",
    stance: "HOLD",
    reasoning: "Trading at fair valuations. Wait for clear volume support or breakout signals before initiating new positions.",
    confidence: 70
  };
}

function getMockMorningBrief(portfolio: any[], watchlist: string[]): string {
  return `
# Morning Brief

### **Market Pulse**
NSE Nifty 50 and BSE Sensex are expected to open on a flat to positive note. Global markets are stable, though FIIs remain net sellers in the cash segment.

### **Portfolio Health**
Your portfolio is up **+1.2%** overall, driven by strong gains in **RELIANCE** and **TCS**. **INFY** is showing minor weakness due to cautious IT sector reports.

### **Stocks to Watch**
- **RELIANCE**: Currently at Rs 2,420. Watch for a breakout above 2,450.
- **TCS**: Major new cloud deal announcement may trigger early volume.
- **HDFCBANK**: Watchlist stock showing positive loan growth numbers.

### **Key Risk Alert**
Rising dollar index could accelerate FII outflows from emerging markets, impacting high-beta financial stocks.
`;
}
