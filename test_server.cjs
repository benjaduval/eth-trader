const http = require('http');
const fs = require('fs');
const path = require('path');

// Test data - simulate our API responses
const testResponses = {
    '/api/health': {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '6.0.0-COMPLETE-RESTORED',
        project: 'eth-trader-v2',
        interface: 'complete'
    },
    '/api/market/ETH': {
        success: true,
        crypto: 'ETH',
        price: 4620.50,
        price_change_24h: 2.45,
        volume_24h: 15800000000,
        market_cap: 556000000000,
        timestamp: new Date().toISOString(),
        status: 'active'
    },
    '/api/market/BTC': {
        success: true,
        crypto: 'BTC',
        price: 94350.75,
        price_change_24h: 1.85,
        volume_24h: 28300000000,
        market_cap: 1875000000000,
        timestamp: new Date().toISOString(),
        status: 'active'
    },
    '/api/predictions/ETH': {
        success: true,
        id: Date.now() + '_ETH',
        crypto: 'ETH',
        current_price: 4620.50,
        predicted_price: 4725.50,
        confidence: 0.78,
        prediction_horizon: '24h',
        model_version: 'TimesFM-v2.1',
        features_analyzed: ['Price momentum', 'Trading volume', 'Market sentiment'],
        analysis: {
            trend: 'bullish',
            volatility: 'moderate',
            key_factors: ['Strong volume momentum', 'Positive sentiment']
        },
        timestamp: new Date().toISOString()
    },
    '/api/predictions/BTC': {
        success: true,
        id: Date.now() + '_BTC',
        crypto: 'BTC',
        current_price: 94350.75,
        predicted_price: 96150.25,
        confidence: 0.82,
        prediction_horizon: '24h',
        model_version: 'TimesFM-v2.1',
        features_analyzed: ['Price momentum', 'Trading volume', 'Network activity'],
        analysis: {
            trend: 'bullish',
            volatility: 'low-moderate',
            key_factors: ['Institutional flows', 'Network stability']
        },
        timestamp: new Date().toISOString()
    }
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    console.log(`${req.method} ${req.url}`);
    
    if (testResponses[req.url]) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(testResponses[req.url]));
        return;
    }
    
    if (req.url === '/' || req.url === '/login' || req.url === '/terminal') {
        // Serve built HTML - in real deployment this would be handled by the main app
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end('<html><body><h1>ETH Trader - API Endpoints Working!</h1><p>Try: /api/health, /api/market/ETH, /api/market/BTC, etc.</p></body></html>');
        return;
    }
    
    res.writeHead(404);
    res.end('Not Found');
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Test server running on http://0.0.0.0:${PORT}`);
    console.log('Available endpoints:');
    Object.keys(testResponses).forEach(endpoint => {
        console.log(`  - http://localhost:${PORT}${endpoint}`);
    });
});
