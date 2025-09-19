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

// Configuration des cryptomonnaies supportées
interface CoinConfig {
  coinGeckoId: string;  // ID CoinGecko (ex: 'ethereum', 'bitcoin')
  symbol: string;       // Symbol trading (ex: 'ETHUSDT', 'BTCUSDT') 
  displayName: string;  // Nom d'affichage
}

const SUPPORTED_COINS: Record<string, CoinConfig> = {
  'ETH': {
    coinGeckoId: 'ethereum',
    symbol: 'ETHUSDT',
    displayName: 'Ethereum'
  },
  'BTC': {
    coinGeckoId: 'bitcoin',
    symbol: 'BTCUSDT', 
    displayName: 'Bitcoin'
  }
};

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

  // Méthode utilitaire pour obtenir la config d'une crypto
  private getCoinConfig(crypto: string): CoinConfig {
    const coinConfig = SUPPORTED_COINS[crypto.toUpperCase()];
    if (!coinConfig) {
      throw new Error(`Unsupported cryptocurrency: ${crypto}. Supported: ${Object.keys(SUPPORTED_COINS).join(', ')}`);
    }
    return coinConfig;
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

    // Construire headers avec fallback pour API gratuite
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'User-Agent': 'Multi-Crypto-AI-Trader/3.1.0'
    };

    // Ajouter clé API seulement si disponible et non demo
    if (this.config.apiKey && this.config.apiKey !== 'demo' && this.config.apiKey !== 'undefined') {
      headers['x-cg-pro-api-key'] = this.config.apiKey;
    }

    let response = await fetch(url.toString(), { headers });

    // Si 401 Unauthorized avec Pro API, essayer l'API publique gratuite
    if (response.status === 401 && this.config.baseUrl.includes('pro-api')) {
      console.warn('🔄 CoinGecko Pro API unauthorized, falling back to free API...');
      const freeUrl = url.toString().replace('pro-api.coingecko.com/api/v3', 'api.coingecko.com/api/v3');
      delete headers['x-cg-pro-api-key'];
      
      response = await fetch(freeUrl, { headers });
      
      if (response.ok) {
        console.log('✅ Successfully using CoinGecko free API');
      }
    }

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

  async getCryptoPriceData(crypto: string = 'ETH'): Promise<any> {
    const coinConfig = this.getCoinConfig(crypto);
    const params = {
      ids: coinConfig.coinGeckoId,
      vs_currencies: 'usd',
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
      include_last_updated_at: 'true'
    };
    
    return this.makeRequest('simple/price', params);
  }

  // Méthode de compatibilité (alias pour ETH)
  async getETHPriceData(): Promise<any> {
    return this.getCryptoPriceData('ETH');
  }

  async getCryptoMarketData(crypto: string = 'ETH'): Promise<any> {
    const coinConfig = this.getCoinConfig(crypto);
    return this.makeRequest(`coins/${coinConfig.coinGeckoId}`);
  }

  // Méthode de compatibilité (alias pour ETH)
  async getETHMarketData(): Promise<any> {
    return this.getCryptoMarketData('ETH');
  }

  async getCryptoOHLCV(crypto: string = 'ETH', days: number = 1): Promise<number[][]> {
    const coinConfig = this.getCoinConfig(crypto);
    const params = {
      vs_currency: 'usd',
      days: days
    };
    
    return this.makeRequest(`coins/${coinConfig.coinGeckoId}/ohlc`, params);
  }

  // Méthode de compatibilité (alias pour ETH)
  async getETHOHLCV(days: number = 1): Promise<number[][]> {
    return this.getCryptoOHLCV('ETH', days);
  }

  async getDerivativesData(crypto: string = 'ETH'): Promise<any> {
    try {
      const derivatives = await this.makeRequest('derivatives');
      
      // Filtrer pour la crypto demandée
      const cryptoDerivatives = derivatives.filter((d: any) => 
        d.symbol && d.symbol.toUpperCase().includes(crypto.toUpperCase())
      );

      return {
        derivatives: cryptoDerivatives,
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

  async getEnhancedMarketData(crypto: string = 'ETH'): Promise<CoinGeckoResponse> {
    try {
      console.log(`🔄 Fetching enhanced market data for ${crypto} from CoinGecko Pro...`);
      
      // Exécution séquentielle pour éviter de surcharger l'API
      const priceData = await this.getCryptoPriceData(crypto);
      await new Promise(resolve => setTimeout(resolve, 200)); // Petit délai

      const marketData = await this.getCryptoMarketData(crypto);
      await new Promise(resolve => setTimeout(resolve, 200));

      const derivatives = await this.getDerivativesData(crypto);
      await new Promise(resolve => setTimeout(resolve, 200));

      const fearGreed = await this.getFearGreedIndex();
      await new Promise(resolve => setTimeout(resolve, 200));

      const trending = await this.getTrendingCoins();

      console.log(`✅ Enhanced market data for ${crypto} fetched successfully`);

      return {
        price_data: priceData,
        market_data: marketData,
        derivatives: derivatives,
        fear_greed: fearGreed,
        trending: trending,
        timestamp: new Date().toISOString(),
        api_calls_used: 5,
        crypto: crypto
      };
    } catch (error) {
      console.error(`❌ Enhanced market data fetch failed for ${crypto}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        crypto: crypto
      };
    }
  }

  // Méthode générique pour obtenir le prix actuel d'une crypto
  async getCurrentCryptoPrice(crypto: string = 'ETH'): Promise<number> {
    try {
      const coinConfig = this.getCoinConfig(crypto);
      const data = await this.getCryptoPriceData(crypto);
      return data[coinConfig.coinGeckoId]?.usd || 0;
    } catch (error) {
      console.error(`Failed to get ${crypto} price:`, error);
      return 0;
    }
  }

  // Méthode de compatibilité (alias pour ETH)
  async getCurrentETHPrice(): Promise<number> {
    return this.getCurrentCryptoPrice('ETH');
  }

  // Nouvelle méthode pour BTC
  async getCurrentBTCPrice(): Promise<number> {
    return this.getCurrentCryptoPrice('BTC');
  }

  // Méthode générique pour obtenir les données OHLC récentes formatées
  async getLatestCandle(crypto: string = 'ETH'): Promise<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null> {
    try {
      const ohlcData = await this.getCryptoOHLCV(crypto, 1); // 1 jour de données
      
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
      console.error(`Failed to get latest candle for ${crypto}:`, error);
      return null;
    }
  }

  // Méthode avancée pour récupérer des données historiques réelles avec prix et volume
  async getRealHistoricalData(crypto: string = 'ETH', days: number = 7): Promise<Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      console.log(`🔄 Fetching REAL ${days} days of historical market data for ${crypto} from CoinGecko Pro...`);
      
      const coinConfig = this.getCoinConfig(crypto);
      
      // 1. Récupérer les données OHLC (prix)
      const ohlcData = await this.getCryptoOHLCV(crypto, days);
      
      if (!ohlcData || ohlcData.length === 0) {
        throw new Error('No OHLC data received');
      }

      // 2. Récupérer les données de volume séparément avec market_chart
      let volumeData: number[][] = [];
      try {
        const marketChart = await this.makeRequest(`coins/${coinConfig.coinGeckoId}/market_chart`, {
          vs_currency: 'usd',
          days: days,
          interval: days > 1 ? 'hourly' : 'minutely'
        });
        
        volumeData = marketChart.total_volumes || [];
        console.log(`📊 Retrieved ${volumeData.length} volume data points for ${crypto}`);
      } catch (volumeError) {
        console.warn(`Could not fetch volume data for ${crypto}, using zero values`);
      }

      // 3. Combiner OHLC avec volume data
      const formattedData = ohlcData.map((candle: number[], index: number) => {
        // Trouver le volume correspondant basé sur timestamp
        const candleTime = candle[0];
        let volume = 0;
        
        if (volumeData.length > 0) {
          // Chercher le volume le plus proche temporellement
          const volumeEntry = volumeData.find(([timestamp, vol]) => 
            Math.abs(timestamp - candleTime) < 3600000 // ±1 heure de tolérance
          );
          volume = volumeEntry ? volumeEntry[1] : 0;
        }

        return {
          timestamp: new Date(candleTime).toISOString(),
          open: Math.round(candle[1] * 100) / 100,
          high: Math.round(candle[2] * 100) / 100,
          low: Math.round(candle[3] * 100) / 100,
          close: Math.round(candle[4] * 100) / 100,
          volume: Math.round(volume * 100) / 100
        };
      });

      // 4. Trier par timestamp croissant et prendre les plus récents
      formattedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log(`✅ Successfully formatted ${formattedData.length} real historical data points for ${crypto}`);
      console.log(`📅 Data range: ${formattedData[0]?.timestamp} to ${formattedData[formattedData.length - 1]?.timestamp}`);
      
      return formattedData;
      
    } catch (error) {
      console.error(`❌ Real historical data fetch failed for ${crypto}:`, error);
      throw new Error(`Real historical data fetch failed for ${crypto}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthode pour récupérer uniquement les dernières données (dernières heures)
  async getLatestRealData(crypto: string = 'ETH', hours: number = 72): Promise<Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      // Récupérer plusieurs jours pour avoir assez de données récentes
      const days = Math.max(1, Math.ceil(hours / 24));
      const allData = await this.getRealHistoricalData(crypto, days);
      
      // Filtrer pour garder seulement les dernières heures
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      const recentData = allData.filter(candle => 
        new Date(candle.timestamp).getTime() >= cutoffTime
      );
      
      console.log(`🕒 Filtered to ${recentData.length} data points from last ${hours} hours for ${crypto}`);
      return recentData;
      
    } catch (error) {
      console.error(`Failed to get latest real data for ${crypto}:`, error);
      throw error;
    }
  }

  // Méthode optimisée pour initialisation massive (450 points max)
  async initializeMassiveHistoricalData(crypto: string = 'ETH', targetPoints: number = 450): Promise<Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      console.log(`🚀 Initializing ${targetPoints} historical data points for ${crypto} with alternative approach...`);
      
      // Approche alternative : récupérer les données par blocs pour éviter l'erreur 400
      const allPoints: any[] = [];
      const blocksNeeded = Math.ceil(targetPoints / 48); // Blocs de 2 jours (48h)
      
      console.log(`📦 Fetching ${blocksNeeded} blocks of 2-day data to reach ${targetPoints} points for ${crypto}`);
      
      for (let i = 0; i < blocksNeeded && allPoints.length < targetPoints; i++) {
        try {
          console.log(`📊 Fetching ${crypto} block ${i + 1}/${blocksNeeded}...`);
          
          // Récupérer 2 jours de données à la fois (approche plus stable)
          const blockData = await this.getRealHistoricalData(crypto, 2);
          
          if (blockData && blockData.length > 0) {
            // Éviter les doublons en filtrant par timestamp
            const newPoints = blockData.filter(point => 
              !allPoints.some(existing => existing.timestamp === point.timestamp)
            );
            
            allPoints.push(...newPoints);
            console.log(`📈 ${crypto} Block ${i + 1}: +${newPoints.length} points (total: ${allPoints.length})`);
          }
          
          // Petite pause entre blocs pour respecter rate limit
          if (i < blocksNeeded - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s pause
          }
          
        } catch (blockError) {
          console.warn(`⚠️ ${crypto} Block ${i + 1} failed, continuing:`, blockError);
          // Continuer avec les autres blocs
        }
      }
      
      // Trier par timestamp et prendre les plus récents
      const sortedPoints = allPoints
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, targetPoints)
        .reverse(); // Ordre chronologique
      
      console.log(`✅ Retrieved ${sortedPoints.length} points for ${crypto} initialization`);
      console.log(`📊 ${crypto} Data range: ${sortedPoints[0]?.timestamp} → ${sortedPoints[sortedPoints.length - 1]?.timestamp}`);
      
      return sortedPoints;
      
    } catch (error) {
      console.error(`❌ Failed to initialize massive historical data for ${crypto}:`, error);
      
      // Fallback : utiliser données actuelles existantes
      console.log(`🔄 Attempting fallback to current ${crypto} data...`);
      try {
        const currentPrice = await this.getCurrentCryptoPrice(crypto);
        if (currentPrice) {
          console.log(`📊 Generating basic data points from current ${crypto} price as emergency fallback`);
          
          const fallbackPoints = [];
          const now = Date.now();
          
          for (let i = targetPoints - 1; i >= 0; i--) {
            const timestamp = new Date(now - (i * 60 * 60 * 1000)); // i heures en arrière
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
            const price = currentPrice * (1 + variation);
            
            fallbackPoints.push({
              timestamp: timestamp.toISOString(),
              open: price,
              high: price * 1.005,
              low: price * 0.995,
              close: price,
              volume: 1000 + Math.random() * 1000
            });
          }
          
          console.log(`🆘 Fallback generated ${fallbackPoints.length} basic data points for ${crypto}`);
          return fallbackPoints;
        }
      } catch (fallbackError) {
        console.error(`❌ ${crypto} Fallback also failed:`, fallbackError);
      }
      
      throw new Error(`All ${crypto} initialization methods failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthode pour updates incrémentaux (nouveaux points seulement)
  async getIncrementalData(crypto: string = 'ETH', sinceTimestamp: string): Promise<Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      const sinceDate = new Date(sinceTimestamp);
      const now = Date.now();
      const hoursSince = Math.ceil((now - sinceDate.getTime()) / (1000 * 60 * 60));
      
      console.log(`🔄 Getting incremental ${crypto} data since ${sinceTimestamp} (${hoursSince} hours ago)`);
      
      if (hoursSince <= 0) {
        console.log(`⏭️ No new ${crypto} data needed - already up to date`);
        return [];
      }
      
      // Récupérer seulement les données depuis le dernier timestamp
      const recentData = await this.getLatestRealData(crypto, Math.min(hoursSince + 2, 72)); // +2h de buffer
      
      // Filtrer pour garder seulement les nouveaux points (après sinceTimestamp)
      const newPoints = recentData.filter(point => 
        new Date(point.timestamp).getTime() > sinceDate.getTime()
      );
      
      console.log(`📈 Found ${newPoints.length} new incremental ${crypto} points`);
      
      return newPoints;
      
    } catch (error) {
      console.error(`Failed to get incremental ${crypto} data:`, error);
      throw new Error(`Incremental ${crypto} data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Méthode pour vérifier le status de synchronisation
  async getDataSyncStatus(): Promise<{
    last_api_call: Date;
    calls_remaining_estimate: number;
    recommended_delay_ms: number;
  }> {
    // Estimation basée sur notre rate limiter interne
    const callsInLastMinute = this.rateLimiter.calls.length;
    const callsRemaining = Math.max(0, 450 - callsInLastMinute); // Buffer de 50 calls
    const recommendedDelay = callsRemaining < 50 ? 60000 : 0; // 1min d'attente si proche limite
    
    return {
      last_api_call: new Date(),
      calls_remaining_estimate: callsRemaining,
      recommended_delay_ms: recommendedDelay
    };
  }

  // Méthode utilitaire pour obtenir les cryptos supportées
  static getSupportedCryptos(): string[] {
    return Object.keys(SUPPORTED_COINS);
  }

  // Méthode utilitaire pour obtenir les infos d'une crypto
  static getCryptoInfo(crypto: string): CoinConfig | null {
    return SUPPORTED_COINS[crypto.toUpperCase()] || null;
  }
}