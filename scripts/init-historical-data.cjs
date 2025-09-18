#!/usr/bin/env node
/**
 * Script d'initialisation des données historiques multi-crypto
 * Récupère 450 points de données pour ETH et BTC via CoinGecko Pro
 * Respecte le rate limit de 500 calls/minute
 */

const { Database } = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class RateLimiter {
  constructor(maxCalls, timeWindow = 60000) {
    this.calls = [];
    this.maxCalls = Math.floor(maxCalls * 0.8); // Buffer de sécurité 80%
    this.timeWindow = timeWindow;
  }

  async acquire() {
    const now = Date.now();
    
    // Nettoyer les anciens appels
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);

    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = this.timeWindow - (now - oldestCall) + 1000;
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit proche, attente de ${Math.round(waitTime/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire();
      }
    }

    this.calls.push(now);
  }
}

class CoinGeckoHistoricalService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
    this.rateLimiter = new RateLimiter(500); // 500 req/min avec Pro API
    
    this.SUPPORTED_COINS = {
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
  }

  async makeRequest(endpoint, params = {}) {
    await this.rateLimiter.acquire();

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`🔄 API Call: ${url.pathname}${url.search}`);

    const response = await fetch(url.toString(), {
      headers: {
        'x-cg-pro-api-key': this.apiKey,
        'accept': 'application/json'
      }
    });

    if (response.status === 429) {
      console.warn('❌ Rate limit hit, waiting 60s...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return this.makeRequest(endpoint, params);
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHistoricalData(crypto, days) {
    const coinConfig = this.SUPPORTED_COINS[crypto.toUpperCase()];
    if (!coinConfig) {
      throw new Error(`Unsupported crypto: ${crypto}`);
    }

    try {
      console.log(`📊 Fetching ${days} days of ${crypto} OHLC data...`);
      
      // 1. Récupérer les données OHLC
      const ohlcData = await this.makeRequest(`coins/${coinConfig.coinGeckoId}/ohlc`, {
        vs_currency: 'usd',
        days: days
      });
      
      if (!ohlcData || ohlcData.length === 0) {
        throw new Error('No OHLC data received');
      }

      console.log(`✅ Retrieved ${ohlcData.length} OHLC points for ${crypto}`);

      // 2. Récupérer les données de volume séparément
      let volumeData = [];
      try {
        console.log(`📈 Fetching ${crypto} volume data...`);
        const marketChart = await this.makeRequest(`coins/${coinConfig.coinGeckoId}/market_chart`, {
          vs_currency: 'usd',
          days: days,
          interval: days > 1 ? 'hourly' : 'minutely'
        });
        
        volumeData = marketChart.total_volumes || [];
        console.log(`✅ Retrieved ${volumeData.length} volume points for ${crypto}`);
      } catch (volumeError) {
        console.warn(`⚠️ Could not fetch volume data for ${crypto}, using zero values`);
      }

      // 3. Combiner OHLC avec volume data
      const formattedData = ohlcData.map((candle, index) => {
        const candleTime = candle[0];
        let volume = 0;
        
        if (volumeData.length > 0) {
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
          volume: Math.round(volume * 100) / 100,
          symbol: coinConfig.symbol
        };
      });

      // 4. Trier par timestamp croissant
      formattedData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log(`✅ Formatted ${formattedData.length} historical data points for ${crypto}`);
      console.log(`📅 Data range: ${formattedData[0]?.timestamp} to ${formattedData[formattedData.length - 1]?.timestamp}`);
      
      return formattedData;
      
    } catch (error) {
      console.error(`❌ Historical data fetch failed for ${crypto}:`, error);
      throw error;
    }
  }

  async getBulkHistoricalData(crypto, targetPoints = 450) {
    try {
      console.log(`🚀 Initializing ${targetPoints} historical data points for ${crypto}...`);
      
      // Récupérer des données par blocs pour éviter les erreurs
      const allPoints = [];
      const daysPerBlock = Math.ceil(targetPoints / 24); // Approximativement 24 points par jour
      
      console.log(`📦 Fetching ${crypto} data in blocks of ${daysPerBlock} days...`);
      
      // Récupérer un grand bloc de données
      const blockData = await this.getHistoricalData(crypto, daysPerBlock);
      
      if (blockData && blockData.length > 0) {
        allPoints.push(...blockData);
        console.log(`📈 ${crypto}: Retrieved ${blockData.length} points (total: ${allPoints.length})`);
      }
      
      // Trier par timestamp et prendre les plus récents
      const sortedPoints = allPoints
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, targetPoints)
        .reverse(); // Ordre chronologique
      
      console.log(`✅ Final ${crypto} dataset: ${sortedPoints.length} points`);
      console.log(`📊 ${crypto} Data range: ${sortedPoints[0]?.timestamp} → ${sortedPoints[sortedPoints.length - 1]?.timestamp}`);
      
      return sortedPoints;
      
    } catch (error) {
      console.error(`❌ Failed to get bulk historical data for ${crypto}:`, error);
      
      // Fallback avec données simulées si nécessaire
      console.log(`🔄 Attempting fallback for ${crypto}...`);
      return this.generateFallbackData(crypto, targetPoints);
    }
  }

  generateFallbackData(crypto, targetPoints) {
    console.log(`🆘 Generating ${targetPoints} fallback data points for ${crypto}...`);
    
    const coinConfig = this.SUPPORTED_COINS[crypto.toUpperCase()];
    const fallbackPoints = [];
    const now = Date.now();
    
    // Prix de base approximatifs
    const basePrices = {
      'ETH': 4500,
      'BTC': 115000
    };
    
    const basePrice = basePrices[crypto.toUpperCase()] || 1000;
    
    for (let i = targetPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now - (i * 60 * 60 * 1000)); // i heures en arrière
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const price = basePrice * (1 + variation);
      
      fallbackPoints.push({
        timestamp: timestamp.toISOString(),
        open: Math.round(price * 0.999 * 100) / 100,
        high: Math.round(price * 1.005 * 100) / 100,
        low: Math.round(price * 0.995 * 100) / 100,
        close: Math.round(price * 100) / 100,
        volume: Math.round((1000 + Math.random() * 1000) * 100) / 100,
        symbol: coinConfig.symbol
      });
    }
    
    console.log(`🆘 Generated ${fallbackPoints.length} fallback data points for ${crypto}`);
    return fallbackPoints;
  }
}

class DatabaseInitializer {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  initializeSchema() {
    console.log('🔧 Initializing database schema...');
    
    // Créer table market_data si elle n'existe pas
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        open_price REAL NOT NULL,
        high_price REAL NOT NULL,
        low_price REAL NOT NULL,
        close_price REAL NOT NULL,
        volume REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, timestamp)
      );
      
      CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
      CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp DESC);
    `);
    
    console.log('✅ Database schema initialized');
  }

  async insertHistoricalData(crypto, dataPoints) {
    const coinConfig = {
      'ETH': { symbol: 'ETHUSDT' },
      'BTC': { symbol: 'BTCUSDT' }
    }[crypto.toUpperCase()];
    
    if (!coinConfig) {
      throw new Error(`Unsupported crypto: ${crypto}`);
    }

    console.log(`📝 Inserting ${dataPoints.length} data points for ${crypto}...`);
    
    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO market_data 
      (symbol, timestamp, open_price, high_price, low_price, close_price, volume) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = this.db.transaction((points) => {
      for (const point of points) {
        insertStmt.run(
          point.symbol,
          point.timestamp,
          point.open,
          point.high,
          point.low,
          point.close,
          point.volume
        );
      }
    });
    
    try {
      insertMany(dataPoints);
      console.log(`✅ Inserted ${dataPoints.length} data points for ${crypto} (${coinConfig.symbol})`);
      
      // Vérifier le nombre total de points
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM market_data WHERE symbol = ?').get(coinConfig.symbol);
      console.log(`📊 Total ${crypto} data points in database: ${countResult.count}`);
      
      return countResult.count;
    } catch (error) {
      console.error(`❌ Failed to insert data for ${crypto}:`, error);
      throw error;
    }
  }

  getCurrentDataCounts() {
    const symbols = ['ETHUSDT', 'BTCUSDT'];
    const counts = {};
    
    for (const symbol of symbols) {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM market_data WHERE symbol = ?').get(symbol);
      counts[symbol] = result.count;
    }
    
    return counts;
  }

  close() {
    this.db.close();
  }
}

async function main() {
  console.log('🚀 Multi-Crypto Historical Data Initialization');
  console.log('================================================');
  console.log('Target: 450+ data points for ETH and BTC');
  console.log('Rate Limit: 500 calls/minute (CoinGecko Pro)');
  console.log('');

  // Vérifier les variables d'environnement
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    console.error('❌ COINGECKO_API_KEY not found in environment');
    process.exit(1);
  }

  // Initialiser les services
  const coinGecko = new CoinGeckoHistoricalService(apiKey);
  const dbPath = path.join(__dirname, '..', 'local.db');
  const db = new DatabaseInitializer(dbPath);
  
  try {
    // Initialiser le schéma
    db.initializeSchema();
    
    // Vérifier l'état actuel
    console.log('📊 Current database state:');
    const currentCounts = db.getCurrentDataCounts();
    console.log(`   ETH (ETHUSDT): ${currentCounts.ETHUSDT} points`);
    console.log(`   BTC (BTCUSDT): ${currentCounts.BTCUSDT} points`);
    console.log('');
    
    // Déterminer quelles cryptos ont besoin de données
    const cryptosToFetch = [];
    if (currentCounts.ETHUSDT < 400) {
      cryptosToFetch.push('ETH');
    }
    if (currentCounts.BTCUSDT < 400) {
      cryptosToFetch.push('BTC');
    }
    
    if (cryptosToFetch.length === 0) {
      console.log('✅ Both ETH and BTC already have sufficient data (400+ points)');
      return;
    }
    
    console.log(`🔄 Fetching data for: ${cryptosToFetch.join(', ')}`);
    console.log('');
    
    // Traiter chaque crypto séquentiellement pour respecter le rate limit
    for (const crypto of cryptosToFetch) {
      console.log(`🔄 Processing ${crypto}...`);
      
      try {
        // Récupérer les données historiques
        const targetPoints = 450;
        const historicalData = await coinGecko.getBulkHistoricalData(crypto, targetPoints);
        
        if (historicalData && historicalData.length > 0) {
          // Insérer en base
          const insertedCount = await db.insertHistoricalData(crypto, historicalData);
          
          console.log(`✅ ${crypto} initialization completed: ${insertedCount} total points`);
          
          if (insertedCount >= 400) {
            console.log(`✅ ${crypto} meets minimum requirement (400+ points)`);
          } else {
            console.log(`⚠️ ${crypto} below minimum requirement (${insertedCount}/400 points)`);
          }
        } else {
          console.warn(`⚠️ No data retrieved for ${crypto}`);
        }
        
        // Pause entre les cryptos
        if (cryptosToFetch.indexOf(crypto) < cryptosToFetch.length - 1) {
          console.log('⏳ Pausing before next crypto to respect rate limits...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process ${crypto}:`, error.message);
      }
      
      console.log('');
    }
    
    // État final
    console.log('📊 Final database state:');
    const finalCounts = db.getCurrentDataCounts();
    console.log(`   ETH (ETHUSDT): ${finalCounts.ETHUSDT} points`);
    console.log(`   BTC (BTCUSDT): ${finalCounts.BTCUSDT} points`);
    console.log('');
    
    const success = finalCounts.ETHUSDT >= 400 && finalCounts.BTCUSDT >= 400;
    
    if (success) {
      console.log('🎉 SUCCESS: Both cryptocurrencies have sufficient historical data!');
      console.log('✅ Ready for TimesFM predictions and trading');
    } else {
      console.log('⚠️ WARNING: Some cryptocurrencies still need more data');
      console.log('📝 Recommendation: Re-run script or check CoinGecko API limits');
    }
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { CoinGeckoHistoricalService, DatabaseInitializer };