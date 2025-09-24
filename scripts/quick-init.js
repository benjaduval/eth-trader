#!/usr/bin/env node

/**
 * Script simple pour initialiser rapidement les données historiques
 * Version robuste avec CoinGecko Pro
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COINGECKO_API_KEY = 'CG-bsLZ4jVKKU72L2Jmn2jSgioV';
const BASE_URL = 'https://pro-api.coingecko.com/api/v3';

// Fonction pour faire un appel API avec retry
async function makeRequest(endpoint, params = {}, retries = 3) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const headers = {
    'accept': 'application/json',
    'User-Agent': 'Alice-Predictions/1.0.0',
    'x-cg-pro-api-key': COINGECKO_API_KEY
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 API call: ${endpoint} (attempt ${attempt}/${retries})`);
      
      const response = await fetch(url.toString(), { headers });
      
      if (response.status === 429) {
        console.warn('⏳ Rate limit hit, waiting 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API call successful: ${endpoint}`);
      
      // Pause entre appels pour respecter rate limit
      await new Promise(resolve => setTimeout(resolve, 150)); // ~400 calls/min
      
      return data;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Attendre avant de retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

// Fonction pour récupérer les données d'une crypto
async function fetchCryptoData(crypto, coinGeckoId, targetDays = 20) {
  console.log(`\n🚀 Fetching ${crypto} data (${targetDays} days)...`);
  
  try {
    // Récupérer OHLC
    console.log(`📊 Getting OHLC data for ${crypto}...`);
    const ohlcData = await makeRequest(`coins/${coinGeckoId}/ohlc`, {
      vs_currency: 'usd',
      days: targetDays
    });
    
    // Récupérer données de marché pour le volume
    console.log(`📈 Getting market chart data for ${crypto}...`);
    const marketData = await makeRequest(`coins/${coinGeckoId}/market_chart`, {
      vs_currency: 'usd',
      days: targetDays,
      interval: 'hourly'
    });
    
    // Combiner les données
    const combinedData = ohlcData.map((candle, index) => {
      const timestamp = new Date(candle[0]).toISOString();
      const volume = marketData.total_volumes?.[index]?.[1] || 0;
      
      return {
        timestamp,
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume
      };
    });
    
    console.log(`✅ ${crypto}: ${combinedData.length} points collected`);
    console.log(`📅 Range: ${combinedData[0]?.timestamp} → ${combinedData[combinedData.length - 1]?.timestamp}`);
    
    return combinedData;
    
  } catch (error) {
    console.error(`❌ Failed to fetch ${crypto} data:`, error.message);
    return [];
  }
}

// Script principal
async function main() {
  console.log('🚀 Alice Predictions - Quick Historical Data Init');
  console.log('================================================');
  
  const startTime = Date.now();
  
  try {
    // Créer le dossier data
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Configuration des cryptos
    const cryptos = [
      { name: 'ETH', coinGeckoId: 'ethereum', symbol: 'ETHUSDT' },
      { name: 'BTC', coinGeckoId: 'bitcoin', symbol: 'BTCUSDT' }
    ];
    
    for (const crypto of cryptos) {
      // Récupérer les données (20 jours = ~480 points hourly)
      const data = await fetchCryptoData(crypto.name, crypto.coinGeckoId, 20);
      
      if (data.length > 0) {
        // Sauvegarder
        const filename = path.join(dataDir, `${crypto.name.toLowerCase()}_historical.json`);
        const fileData = {
          crypto: crypto.name,
          symbol: crypto.symbol,
          count: data.length,
          oldest: data[0]?.timestamp,
          newest: data[data.length - 1]?.timestamp,
          generated_at: new Date().toISOString(),
          data
        };
        
        fs.writeFileSync(filename, JSON.stringify(fileData, null, 2));
        console.log(`💾 ${crypto.name} data saved to ${filename}`);
      } else {
        console.error(`❌ No data collected for ${crypto.name}`);
      }
      
      // Pause entre cryptos
      if (crypto !== cryptos[cryptos.length - 1]) {
        console.log('⏸️  Pausing between cryptocurrencies...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 Quick initialization completed!');
    console.log('==================================');
    console.log(`⏱️  Time: ${Math.round(totalTime / 1000)}s`);
    
    // Vérifier les fichiers créés
    const ethFile = path.join(dataDir, 'eth_historical.json');
    const btcFile = path.join(dataDir, 'btc_historical.json');
    
    if (fs.existsSync(ethFile)) {
      const ethData = JSON.parse(fs.readFileSync(ethFile, 'utf8'));
      console.log(`📊 ETH: ${ethData.count} points`);
    }
    
    if (fs.existsSync(btcFile)) {
      const btcData = JSON.parse(fs.readFileSync(btcFile, 'utf8'));
      console.log(`📊 BTC: ${btcData.count} points`);
    }
    
    console.log('\n💡 Next steps:');
    console.log('1. Import to database: node scripts/import-to-db.js');
    console.log('2. Test automation endpoints');
    
  } catch (error) {
    console.error('\n❌ Quick initialization failed:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}