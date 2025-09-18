#!/usr/bin/env node

/**
 * Script de déploiement production pour ETH Trader Pro
 * Compatible avec les monitors UptimeRobot existants
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Déploiement production ETH Trader Pro');
console.log('Target URL: https://eth-trader-v2.pages.dev\n');

try {
  // 1. Vérifier la configuration
  console.log('📋 Vérification de la configuration...');
  
  if (!fs.existsSync('wrangler.toml')) {
    throw new Error('Fichier wrangler.toml manquant');
  }
  
  if (!fs.existsSync('dist')) {
    console.log('📦 Build du projet...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // 2. Vérifier les variables d'environnement nécessaires
  const requiredEnvVars = ['COINGECKO_API_KEY'];
  
  console.log('🔐 Vérification des variables d\'environnement...');
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn('⚠️  Variable manquante: ' + envVar + ' (sera configurée manuellement)');
    }
  }

  // 3. Instructions pour le déploiement manuel
  console.log('\n📝 Instructions de déploiement:');
  console.log('1. Aller sur https://dash.cloudflare.com/');
  console.log('2. Sélectionner "Pages" dans la sidebar');
  console.log('3. Cliquer "Connect to Git" ou utiliser le projet existant "eth-trader-v2"');
  console.log('4. Connecter le repository: https://github.com/benjaduval/eth-trader');
  console.log('5. Configuration:');
  console.log('   - Framework: None (Custom)');
  console.log('   - Build command: npm run build');
  console.log('   - Build output directory: dist');
  console.log('6. Variables d\'environnement à ajouter:');
  console.log('   - COINGECKO_API_KEY: [votre clé]');
  console.log('   - TRADING_MODE: paper');
  console.log('   - NODE_ENV: production');

  // 4. Créer un fichier d'information pour le déploiement
  const deployInfo = {
    timestamp: new Date().toISOString(),
    targetUrl: 'https://eth-trader-v2.pages.dev',
    repository: 'https://github.com/benjaduval/eth-trader',
    branch: 'main',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    environmentVariables: {
      COINGECKO_API_KEY: 'À configurer',
      TRADING_MODE: 'paper',
      NODE_ENV: 'production'
    },
    uptimeRobotCompatible: true,
    endpoints: [
      '/api/market/ETH',
      '/api/market/BTC', 
      '/api/predictions/ETH',
      '/api/predictions/BTC',
      '/api/portfolio',
      '/api/health'
    ]
  };

  fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));
  console.log('\n✅ Fichier deployment-info.json créé');

  console.log('\n🎯 Le déploiement sera accessible sur: https://eth-trader-v2.pages.dev');
  console.log('🔍 Compatible avec vos 3 monitors UptimeRobot existants');
  
} catch (error) {
  console.error('❌ Erreur lors du déploiement:', error.message);
  process.exit(1);
}