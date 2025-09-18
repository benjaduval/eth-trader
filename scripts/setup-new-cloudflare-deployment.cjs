#!/usr/bin/env node

/**
 * Script de configuration pour nouveau déploiement Cloudflare Pages
 * Projet: Multi-Crypto AI Trader Pro
 */

const deploymentConfig = {
  // Configuration Cloudflare Pages
  projectName: "multi-crypto-ai-trader",
  productionURL: "https://multi-crypto-ai-trader.pages.dev",
  repository: "https://github.com/benjaduval/eth-trader",
  branch: "main",
  
  // Configuration Build
  buildSettings: {
    framework: "None (Custom)",
    buildCommand: "npm run build",
    buildOutputDirectory: "dist",
    rootDirectory: "",
    compatibilityDate: "2025-09-18",
    compatibilityFlags: ["nodejs_compat"]
  },
  
  // Variables d'environnement requises
  environmentVariables: {
    NODE_ENV: "production",
    TRADING_MODE: "paper", 
    INITIAL_BALANCE: "10000",
    FEES_BPS_PER_SIDE: "8",
    VOLATILITY_TARGET: "0.30",
    // À configurer manuellement:
    COINGECKO_API_KEY: "À_CONFIGURER_MANUELLEMENT"
  },
  
  // Configuration D1 Database
  d1Database: {
    binding: "DB",
    databaseName: "multi-crypto-ai-trader-prod",
    // L'ID sera généré lors de la création
    databaseId: "À_GÉNÉRER_LORS_CRÉATION"
  },
  
  // Endpoints à tester après déploiement
  testEndpoints: [
    "/api/health",
    "/api/dashboard?crypto=ETH", 
    "/api/dashboard?crypto=BTC",
    "/api/predictions/latest?crypto=ETH&limit=3",
    "/api/market/current?crypto=ETH",
    "/api/cryptos/supported"
  ]
};

console.log("🚀 Configuration Nouveau Déploiement Cloudflare Pages");
console.log("=" .repeat(60));
console.log();

console.log("📋 INFORMATIONS DU PROJET");
console.log(`Nom du projet: ${deploymentConfig.projectName}`);
console.log(`URL de production: ${deploymentConfig.productionURL}`);
console.log(`Repository: ${deploymentConfig.repository}`);
console.log(`Branch: ${deploymentConfig.branch}`);
console.log();

console.log("🔧 CONFIGURATION BUILD");
Object.entries(deploymentConfig.buildSettings).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
console.log();

console.log("🔐 VARIABLES D'ENVIRONNEMENT");
Object.entries(deploymentConfig.environmentVariables).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});
console.log();

console.log("🗄️ CONFIGURATION D1 DATABASE");
Object.entries(deploymentConfig.d1Database).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
console.log();

console.log("🎯 INSTRUCTIONS DE DÉPLOIEMENT");
console.log("1. Aller sur https://dash.cloudflare.com/");
console.log("2. Naviguer vers 'Pages' dans la sidebar");
console.log("3. Cliquer 'Connect to Git'");
console.log("4. Sélectionner GitHub et autoriser l'accès");
console.log("5. Choisir le repository 'benjaduval/eth-trader'");
console.log("6. Configurer le projet:");
console.log(`   - Nom: ${deploymentConfig.projectName}`);
console.log(`   - Framework: ${deploymentConfig.buildSettings.framework}`);
console.log(`   - Build command: ${deploymentConfig.buildSettings.buildCommand}`);
console.log(`   - Build output: ${deploymentConfig.buildSettings.buildOutputDirectory}`);
console.log("7. Ajouter les variables d'environnement listées ci-dessus");
console.log("8. Créer une D1 Database et configurer le binding");
console.log("9. Déployer le projet");
console.log();

console.log("✅ VÉRIFICATIONS POST-DÉPLOIEMENT");
deploymentConfig.testEndpoints.forEach((endpoint, index) => {
  console.log(`${index + 1}. Tester: ${deploymentConfig.productionURL}${endpoint}`);
});
console.log();

console.log("🎉 RÉSULTAT ATTENDU");
console.log("✅ Interface Multi-Crypto AI Trader Pro fonctionnelle");
console.log("✅ Navigation ETH/BTC opérationnelle");
console.log("✅ API endpoints répondant correctement"); 
console.log("✅ Prédictions TimesFM actives");
console.log("✅ Dashboard temps réel fonctionnel");
console.log();

// Sauvegarder la configuration dans un fichier JSON
const fs = require('fs');
const configFilePath = './deployment-config.json';

try {
  fs.writeFileSync(configFilePath, JSON.stringify(deploymentConfig, null, 2));
  console.log(`💾 Configuration sauvegardée dans: ${configFilePath}`);
} catch (error) {
  console.log(`❌ Erreur sauvegarde: ${error.message}`);
}

console.log();
console.log("🚀 Prêt pour le nouveau déploiement!");