#!/usr/bin/env node

/**
 * Script utilisant market_chart pour créer des données OHLCV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COINGECKO_API_KEY = 'CG-bsLZ4jVKKU72L2Jmn2jSgioV';
const BASE_URL = 'https://pro-api.coingecko.com/api/v3';

// Fonction pour faire un appel API
async function makeRequest(endpoint, params = {}) {
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

  console.log(`🔄 Calling: ${endpoint}`);
  
  const response = await fetch(url.toString(), { headers });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ Success: ${endpoint}`);
  
  // Pause pour respecter rate limit
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return data;
}

// Fonction pour convertir market_chart en OHLCV
function convertToOHLCV(prices, volumes) {
  const hourlyData = [];
  
  // Grouper par heure
  const hourlyGroups = {};
  
  prices.forEach(([timestamp, price]) => {
    const hourKey = Math.floor(timestamp / 3600000) * 3600000; // Arrondir à l'heure
    
    if (!hourlyGroups[hourKey]) {
      hourlyGroups[hourKey] = {
        timestamp: hourKey,
        prices: [],
        volumes: []
      };
    }
    
    hourlyGroups[hourKey].prices.push(price);
  });
  
  // Ajouter les volumes
  volumes.forEach(([timestamp, volume]) => {
    const hourKey = Math.floor(timestamp / 3600000) * 3600000;
    
    if (hourlyGroups[hourKey]) {
      hourlyGroups[hourKey].volumes.push(volume);
    }
  });
  
  // Créer les OHLCV
  Object.values(hourlyGroups).forEach(group => {
    if (group.prices.length > 0) {
      const open = group.prices[0];
      const close = group.prices[group.prices.length - 1];
      const high = Math.max(...group.prices);
      const low = Math.min(...group.prices);
      const volume = group.volumes.reduce((sum, v) => sum + v, 0) / group.volumes.length || 0;
      
      hourlyData.push({
        timestamp: new Date(group.timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
    }
  });
  
  // Trier par timestamp
  return hourlyData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Fonction pour récupérer les données d'une crypto
async function fetchCryptoData(crypto, coinGeckoId, days = 30) {
  console.log(`\n🚀 Fetching ${crypto} market chart data (${days} days)...`);
  
  try {
    const data = await makeRequest(`coins/${coinGeckoId}/market_chart`, {
      vs_currency: 'usd',
      days: days
    });
    
    if (!data.prices || !data.total_volumes) {
      throw new Error('Invalid market chart data received');
    }
    
    console.log(`📊 ${crypto}: ${data.prices.length} price points, ${data.total_volumes.length} volume points`);
    
    // Convertir en OHLCV horaire
    const ohlcvData = convertToOHLCV(data.prices, data.total_volumes);
    
    console.log(`✅ ${crypto}: ${ohlcvData.length} hourly OHLCV points created`);
    console.log(`📅 Range: ${ohlcvData[0]?.timestamp} → ${ohlcvData[ohlcvData.length - 1]?.timestamp}`);
    
    return ohlcvData;
    
  } catch (error) {
    console.error(`❌ Failed to fetch ${crypto} data:`, error.message);
    return [];
  }
}

// Script principal
async function main() {
  console.log('🚀 Alice Predictions - Market Chart to OHLCV Init');
  console.log('=================================================');
  
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
    
    let totalPoints = 0;
    
    for (const crypto of cryptos) {
      // Récupérer les données (30 jours pour avoir 450+ points)
      const data = await fetchCryptoData(crypto.name, crypto.coinGeckoId, 30);
      
      if (data.length > 0) {
        totalPoints += data.length;
        
        // Sauvegarder
        const filename = path.join(dataDir, `${crypto.name.toLowerCase()}_historical.json`);
        const fileData = {
          crypto: crypto.name,
          symbol: crypto.symbol,
          count: data.length,
          oldest: data[0]?.timestamp,
          newest: data[data.length - 1]?.timestamp,
          generated_at: new Date().toISOString(),
          source: 'market_chart_converted_to_ohlcv',
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log('\n🎉 Market chart initialization completed!');
    console.log('=========================================');
    console.log(`📊 Total points: ${totalPoints}`);
    console.log(`⏱️  Time: ${Math.round(totalTime / 1000)}s`);
    
    // Vérifier les fichiers créés
    const ethFile = path.join(dataDir, 'eth_historical.json');
    const btcFile = path.join(dataDir, 'btc_historical.json');
    
    if (fs.existsSync(ethFile)) {
      const ethData = JSON.parse(fs.readFileSync(ethFile, 'utf8'));
      console.log(`📊 ETH: ${ethData.count} points (${ethData.oldest} → ${ethData.newest})`);
    }
    
    if (fs.existsSync(btcFile)) {
      const btcData = JSON.parse(fs.readFileSync(btcFile, 'utf8'));
      console.log(`📊 BTC: ${btcData.count} points (${btcData.oldest} → ${btcData.newest})`);
    }
    
    console.log('\n💡 Next steps:');
    console.log('1. Import to database: node scripts/import-to-db.js');
    console.log('2. Test TimesFM predictions with new data');
    
  } catch (error) {
    console.error('\n❌ Market chart initialization failed:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}