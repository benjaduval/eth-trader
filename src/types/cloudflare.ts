/**
 * Types TypeScript pour l'environnement Cloudflare Workers
 * Définit les bindings pour D1, KV, secrets, etc.
 */

export interface CloudflareBindings {
  // Base de données D1
  DB: D1Database;
  
  // Secrets/Variables d'environnement
  COINGECKO_API_KEY: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  EMAIL_USER?: string;
  EMAIL_PASSWORD?: string;
  NOTIFICATION_EMAIL?: string;
  
  // Configuration trading
  TRADING_MODE?: string; // 'paper' ou 'live'
  INITIAL_BALANCE?: string; // '10000'
  FEES_BPS_PER_SIDE?: string; // '8'
  VOLATILITY_TARGET?: string; // '0.30'
}

export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap?: number;
  fear_greed?: number;
}

export interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  timestamp: Date;
  predicted_return?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface PaperTrade {
  id?: number;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  status: 'open' | 'closed' | 'cancelled';
  gross_pnl?: number;
  fees: number;
  net_pnl?: number;
  opened_at: Date;
  closed_at?: Date;
  exit_reason?: string;
}

export interface PerformanceMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  net_pnl: number;
  sharpe_ratio?: number;
  max_drawdown: number;
  profit_factor: number;
}

export interface CoinGeckoResponse {
  price_data?: any;
  market_data?: any;
  derivatives?: any;
  fear_greed?: any;
  trending?: any;
  timestamp: string;
  api_calls_used?: number;
  error?: string;
}

export interface TimesFMPrediction {
  symbol: string;
  timestamp: Date;
  predicted_price: number;
  predicted_return: number;
  confidence_score: number;
  horizon_hours: number;
  quantile_10?: number;
  quantile_90?: number;
}