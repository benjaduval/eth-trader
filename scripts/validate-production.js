#!/usr/bin/env node

/**
 * Script de validation production pour ETH Trader Pro
 * Teste tous les endpoints critiques après déploiement
 */

const BASE_URL = process.argv[2] || 'https://eth-trader-v2.pages.dev';

const endpoints = [
    '/api/health',
    '/api/market/current?crypto=ETH',
    '/api/market/current?crypto=BTC', 
    '/api/predictions/latest?crypto=ETH&limit=3',
    '/api/predictions/latest?crypto=BTC&limit=3',
    '/api/dashboard?crypto=ETH',
    '/api/dashboard?crypto=BTC',
    '/api/cryptos/supported',
    '/api/cryptos/compare'
];

async function validateEndpoint(url) {
    try {
        console.log(`🔍 Testing: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.success !== false) {
            console.log(`✅ ${url} - OK`);
            return { url, status: 'OK', data: data };
        } else {
            console.log(`❌ ${url} - FAILED (${response.status})`);
            return { url, status: 'FAILED', error: data.error || 'Unknown error' };
        }
    } catch (error) {
        console.log(`❌ ${url} - ERROR: ${error.message}`);
        return { url, status: 'ERROR', error: error.message };
    }
}

async function validateProduction() {
    console.log(`🚀 ETH Trader Pro - Validation Production`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log('================================');
    
    const results = [];
    
    for (const endpoint of endpoints) {
        const fullUrl = `${BASE_URL}${endpoint}`;
        const result = await validateEndpoint(fullUrl);
        results.push(result);
        
        // Pause entre les requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n📊 RÉSULTATS DE VALIDATION');
    console.log('==========================');
    
    const successful = results.filter(r => r.status === 'OK').length;
    const failed = results.length - successful;
    
    console.log(`✅ Succès: ${successful}/${results.length}`);
    console.log(`❌ Échecs: ${failed}/${results.length}`);
    
    if (failed > 0) {
        console.log('\n🔴 ENDPOINTS EN ÉCHEC:');
        results.filter(r => r.status !== 'OK').forEach(r => {
            console.log(`   ${r.url} - ${r.error}`);
        });
    }
    
    // Test spécifique des fonctionnalités critiques
    console.log('\n🎯 TESTS FONCTIONNELS AVANCÉS');
    console.log('============================');
    
    // Test health check
    const healthResult = results.find(r => r.url.includes('/health'));
    if (healthResult && healthResult.data) {
        console.log(`💚 Health Status: ${healthResult.data.status}`);
        console.log(`🔧 Services: DB=${healthResult.data.services?.database}, CoinGecko=${healthResult.data.services?.coingecko_api}`);
        console.log(`💰 Cryptos supportées: ${healthResult.data.supported_cryptos?.join(', ')}`);
    }
    
    // Test prédictions
    const ethPredictions = results.find(r => r.url.includes('/predictions/latest?crypto=ETH'));
    if (ethPredictions && ethPredictions.data) {
        console.log(`📈 ETH Prédictions: ${ethPredictions.data.predictions?.length || 0} disponibles`);
    }
    
    const btcPredictions = results.find(r => r.url.includes('/predictions/latest?crypto=BTC'));
    if (btcPredictions && btcPredictions.data) {
        console.log(`₿ BTC Prédictions: ${btcPredictions.data.predictions?.length || 0} disponibles`);
    }
    
    // Test données de marché
    const ethMarket = results.find(r => r.url.includes('/market/current?crypto=ETH'));
    if (ethMarket && ethMarket.data) {
        console.log(`💎 ETH Market Cap: $${(ethMarket.data.data?.market_data?.market_data?.market_cap?.usd / 1e9).toFixed(1)}B`);
    }
    
    console.log('\n🎉 VALIDATION TERMINÉE');
    
    if (failed === 0) {
        console.log('✅ PRODUCTION READY - Tous les tests passés !');
        process.exit(0);
    } else {
        console.log('❌ PRODUCTION ISSUES - Certains tests ont échoué');
        process.exit(1);
    }
}

// Exécution
validateProduction().catch(error => {
    console.error('💥 Erreur durant la validation:', error);
    process.exit(1);
});