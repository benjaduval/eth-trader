#!/usr/bin/env node

/**
 * Script simple pour importer les données JSON dans D1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour générer les commandes SQL d'import
function generateImportSQL() {
  console.log('📥 Generating SQL import commands...\n');
  
  const dataDir = path.join(__dirname, '../data');
  const cryptos = ['eth', 'btc'];
  const sqlCommands = [];
  
  // Nettoyer les données existantes
  sqlCommands.push('-- Cleaning existing data');
  sqlCommands.push("DELETE FROM market_data WHERE symbol IN ('ETHUSDT', 'BTCUSDT');");
  sqlCommands.push('');
  
  for (const crypto of cryptos) {
    const filename = path.join(dataDir, `${crypto}_historical.json`);
    
    if (!fs.existsSync(filename)) {
      console.warn(`⚠️  File not found: ${filename}`);
      continue;
    }
    
    const fileData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const { data, symbol } = fileData;
    
    console.log(`📊 ${crypto.toUpperCase()}: ${data.length} points to import`);
    
    sqlCommands.push(`-- ${crypto.toUpperCase()} data (${data.length} points)`);
    
    // Insérer par lots de 50
    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const values = batch.map(point => 
        `('${point.timestamp}', '${symbol}', '1h', ${point.open}, ${point.high}, ${point.low}, ${point.close}, ${point.volume || 0})`
      ).join(',\\n    ');
      
      const sql = `INSERT INTO market_data (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume) VALUES\\n    ${values};`;
      
      sqlCommands.push(sql);
      sqlCommands.push('');
    }
  }
  
  // Sauvegarder le fichier SQL
  const outputFile = path.join(__dirname, '../import_data.sql');
  fs.writeFileSync(outputFile, sqlCommands.join('\\n'));
  
  console.log(`\\n💾 SQL commands saved to: ${outputFile}`);
  console.log(`📏 Total commands: ${sqlCommands.filter(cmd => cmd.startsWith('INSERT')).length}`);
  
  return outputFile;
}

// Fonction pour afficher les instructions
function showInstructions(sqlFile) {
  console.log('\\n💡 Manual Import Instructions:');
  console.log('==============================');
  console.log('Run these commands to import the data:\\n');
  
  console.log('# Import to local D1 database:');
  console.log(`wrangler d1 execute eth-trader-production --local --file="${sqlFile}"`);
  console.log('');
  
  console.log('# Import to production D1 database (when ready):');  
  console.log(`wrangler d1 execute eth-trader-production --file="${sqlFile}"`);
  console.log('');
  
  console.log('# Verify import:');
  console.log('wrangler d1 execute eth-trader-production --local --command="SELECT symbol, COUNT(*) as count, MIN(timestamp) as oldest, MAX(timestamp) as newest FROM market_data GROUP BY symbol;"');
}

// Script principal
async function main() {
  console.log('📥 Alice Predictions - Simple Data Import');
  console.log('==========================================\\n');
  
  try {
    const sqlFile = generateImportSQL();
    showInstructions(sqlFile);
    
  } catch (error) {
    console.error('❌ Import preparation failed:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}