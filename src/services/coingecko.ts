/**
 * Service CoinGecko Pro adapté pour Cloudflare Workers
 * Utilise Fetch API native au lieu d'aiohttp
 */

import type { CoinGeckoResponse } from '../types/cloudflare';

interface CoinGeckoConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit: number;
}

class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;

  constructor(maxCalls: number, timeWindow: number = 60000) {
    this.maxCalls = Math.floor(maxCalls * 0.8); // Buffer de sécurité 80%
    this.timeWindow = timeWindow;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Nettoyer les anciens appels
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);

    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = this.timeWindow - (now - oldestCall) + 1000;
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire();
      }
    }

    this.calls.push(now);
  }
}

export class CoinGeckoService {
  private config: CoinGeckoConfig;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://pro-api.coingecko.com/api/v3',
      rateLimit: 500 // 500 req/min avec Pro API
    };
    
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
  }

  private async makeRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
    await this.rateLimiter.acquire();

    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-cg-pro-api-key': this.config.apiKey,
        'accept': 'application/json'
      }
    });

    if (response.status === 429) {
      // Rate limit hit - wait and retry
      console.warn('CoinGecko rate limit hit, waiting...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return this.makeRequest(endpoint, params);
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getETHPriceData(): Promise<any> {
    const params = {
      ids: 'ethereum',
      vs_currencies: 'usd',
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
      include_last_updated_at: 'true'
    };
    
    return this.makeRequest('simple/price', params);
  }

  async getETHMarketData(): Promise<any> {
    return this.makeRequest('coins/ethereum');
  }

  async getETHOHLCV(days: number = 1): Promise<number[][]> {
    const params = {
      vs_currency: 'usd',
      days: days
    };
    
    return this.makeRequest('coins/ethereum/ohlc', params);
  }

  async getDerivativesData(): Promise<any> {
    try {
      const derivatives = await this.makeRequest('derivatives');
      
      // Filtrer pour ETH
      const ethDerivatives = derivatives.filter((d: any) => 
        d.symbol && d.symbol.toUpperCase().includes('ETH')
      );

      return {
        derivatives: ethDerivatives,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Could not fetch derivatives:', error);
      return {
        derivatives: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  async getFearGreedIndex(): Promise<any> {
    try {
      // Utiliser l'endpoint global market data pour obtenir des métriques de sentiment
      const globalData = await this.makeRequest('global');
      return {
        value: globalData.market_cap_change_percentage_24h_usd || 0,
        classification: this.classifySentiment(globalData.market_cap_change_percentage_24h_usd || 0)
      };
    } catch (error) {
      return {
        value: null,
        classification: 'neutral'
      };
    }
  }

  private classifySentiment(changePercentage: number): string {
    if (changePercentage > 5) return 'extreme_greed';
    if (changePercentage > 2) return 'greed';
    if (changePercentage > -2) return 'neutral';
    if (changePercentage > -5) return 'fear';
    return 'extreme_fear';
  }

  async getTrendingCoins(): Promise<any> {
    return this.makeRequest('search/trending');
  }

  async getEnhancedMarketData(): Promise<CoinGeckoResponse> {
    try {
      console.log('🔄 Fetching enhanced market data from CoinGecko Pro...');
      
      // Exécution séquentielle pour éviter de surcharger l'API
      const priceData = await this.getETHPriceData();
      await new Promise(resolve => setTimeout(resolve, 200)); // Petit délai

      const marketData = await this.getETHMarketData();
      await new Promise(resolve => setTimeout(resolve, 200));

      const derivatives = await this.getDerivativesData();
      await new Promise(resolve => setTimeout(resolve, 200));

      const fearGreed = await this.getFearGreedIndex();
      await new Promise(resolve => setTimeout(resolve, 200));

      const trending = await this.getTrendingCoins();

      console.log('✅ Enhanced market data fetched successfully');

      return {
        price_data: priceData,
        market_data: marketData,
        derivatives: derivatives,
        fear_greed: fearGreed,
        trending: trending,
        timestamp: new Date().toISOString(),
        api_calls_used: 5
      };
    } catch (error) {
      console.error('❌ Enhanced market data fetch failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Méthode simple pour obtenir juste le prix ETH/USD actuel
  async getCurrentETHPrice(): Promise<number> {
    try {
      const data = await this.getETHPriceData();
      return data.ethereum?.usd || 0;
    } catch (error) {
      console.error('Failed to get ETH price:', error);
      return 0;
    }
  }

  // Méthode pour obtenir les données OHLC récentes formatées
  async getLatestCandle(): Promise<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null> {
    try {
      const ohlcData = await this.getETHOHLCV(1); // 1 jour de données
      
      if (!ohlcData || ohlcData.length === 0) {
        return null;
      }

      // Prendre la dernière bougie
      const lastCandle = ohlcData[ohlcData.length - 1];
      
      return {
        timestamp: new Date(lastCandle[0]),
        open: lastCandle[1],
        high: lastCandle[2],
        low: lastCandle[3],
        close: lastCandle[4],
        volume: 0 // CoinGecko OHLC n'inclut pas le volume dans cette réponse
      };
    } catch (error) {
      console.error('Failed to get latest candle:', error);
      return null;
    }
  }
}