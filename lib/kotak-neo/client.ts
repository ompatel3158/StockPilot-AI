import axios from 'axios';

const KOTAK_SERVICE_URL = process.env.KOTAK_SERVICE_URL || 'http://127.0.0.1:5000';

export interface Holding {
  trading_symbol: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  displaySymbol: string;
  mktValue: number;
  pnl: number;
  pnl_percentage: number;
}

export interface Position {
  trading_symbol: string;
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  displaySymbol: string;
  mktValue: number;
  pnl: number;
  position_type: string;
  pnl_percentage: number;
}

export interface Quote {
  symbol: string;
  lp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  netChange: number;
  percentChange: number;
}

/**
 * Fetch current holdings from Kotak Neo microservice.
 */
export async function fetchHoldings(): Promise<Holding[]> {
  try {
    const res = await axios.get<Holding[]>(`${KOTAK_SERVICE_URL}/holdings`, {
      timeout: 10000 // 10s timeout
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching holdings from Kotak Neo service:', error);
    throw error;
  }
}

/**
 * Fetch active positions from Kotak Neo microservice.
 */
export async function fetchPositions(): Promise<Position[]> {
  try {
    const res = await axios.get<Position[]>(`${KOTAK_SERVICE_URL}/positions`, {
      timeout: 10000
    });
    return res.data;
  } catch (error) {
    console.error('Error fetching positions from Kotak Neo service:', error);
    throw error;
  }
}

/**
 * Fetch live quote (LTP, OHLC) for a symbol from Kotak Neo microservice.
 */
export async function fetchQuote(symbol: string): Promise<Quote> {
  try {
    const res = await axios.get(`${KOTAK_SERVICE_URL}/quote`, {
      params: { symbol },
      timeout: 10000
    });
    
    const data = res.data?.data?.[0];
    if (!data) {
      throw new Error(`No quote data returned for symbol: ${symbol}`);
    }
    
    return {
      symbol: data.symbol,
      lp: parseFloat(data.lp),
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      close: parseFloat(data.close),
      netChange: parseFloat(data.netChange || '0'),
      percentChange: parseFloat(data.percentChange || '0')
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol} from Kotak Neo service:`, error);
    throw error;
  }
}

/**
 * Trigger manual re-login for the Kotak Neo microservice.
 */
export async function triggerReauth(): Promise<{ status: string; message: string; mode: string }> {
  try {
    const res = await axios.post(`${KOTAK_SERVICE_URL}/login`);
    return res.data;
  } catch (error) {
    console.error('Error triggering reauth on Kotak Neo service:', error);
    throw error;
  }
}

/**
 * Check if the Kotak Neo microservice is healthy.
 */
export async function checkHealth(): Promise<{ status: string; logged_in: boolean; mock_mode: boolean; cached_symbols_count: number }> {
  try {
    const res = await axios.get(`${KOTAK_SERVICE_URL}/health`);
    return res.data;
  } catch (error) {
    console.error('Error checking health of Kotak Neo service:', error);
    throw error;
  }
}
