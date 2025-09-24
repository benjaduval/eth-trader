#!/usr/bin/env node

/**
 * Import par petits lots pour éviter SQLITE_TOOBIG
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour exécuter une commande SQL
function executeSQLCommand(sql) {
  try {
    const command = `wrangler d1 execute eth-trader-production --local --command="${sql.replace(/"/g, '\\"')}"`;
    const result = execSync(command, { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Import par lots
async function importInBatches() {
  console.log('📥 Importing data in small batches...\n');
  
  const dataDir = path.join(__dirname, '../data');
  const cryptos = [
    { name: 'ETH', file: 'eth_historical.json', symbol: 'ETHUSDT' },
    { name: 'BTC', file: 'btc_historical.json', symbol: 'BTCUSDT' }
  ];
  
  // Nettoyer d'abord
  console.log('🗑️  Cleaning existing data...');
  const cleanResult = executeSQLCommand("DELETE FROM market_data WHERE symbol IN ('ETHUSDT', 'BTCUSDT');");
  if (cleanResult.success) {
    console.log('✅ Existing data cleaned');
  } else {
    console.warn('⚠️  Clean failed:', cleanResult.error);
  }
  
  let totalImported = 0;
  
  for (const crypto of cryptos) {
    const filename = path.join(dataDir, crypto.file);
    
    if (!fs.existsSync(filename)) {
      console.warn(`⚠️  File not found: ${filename}`);
      continue;
    }
    
    const fileData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const { data } = fileData;
    
    console.log(`\n📊 Importing ${crypto.name}: ${data.length} points`);
    
    const batchSize = 20; // Très petits lots
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(data.length / batchSize);
      
      const values = batch.map(point => 
        `('${point.timestamp}', '${crypto.symbol}', '1h', ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume || 0})`
      ).join(', ');
      
      const sql = `INSERT INTO market_data (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume) VALUES ${values};`;
      
      process.stdout.write(`\r📦 ${crypto.name} Batch ${batchNum}/${totalBatches} (${batch.length} points)... `);
      
      const result = executeSQLCommand(sql);
      
      if (result.success) {
        imported += batch.length;
        process.stdout.write(`✅`);
      } else {
        process.stdout.write(`❌`);
        console.error(`\n❌ ${crypto.name} Batch ${batchNum} failed:`, result.error);
        break;
      }
      
      // Petite pause entre lots
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`\n✅ ${crypto.name} import completed: ${imported}/${data.length} points`);
    totalImported += imported;
  }
  
  console.log(`\n🎉 Total imported: ${totalImported} points`);
  
  // Vérifier l'import
  console.log('\n🔍 Verifying import...');
  const verifyResult = executeSQLCommand("SELECT symbol, COUNT(*) as count, MIN(timestamp) as oldest, MAX(timestamp) as newest FROM market_data GROUP BY symbol;");
  
  if (verifyResult.success) {
    console.log(verifyResult.result);
  } else {
    console.error('❌ Verification failed:', verifyResult.error);
  }
}

// Script principal
async function main() {
  console.log('📥 Alice Predictions - Batch Import');
  console.log('===================================');
  
  try {
    await importInBatches();
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}