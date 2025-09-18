const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use('/static', express.static('public/static'));
app.use(express.static('public'));

// Serve the main interface with complete Multi-Crypto AI Terminal
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Crypto AI Trader Pro - Neural Network Trading</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .crypto-tab.active {
            background: linear-gradient(135deg, rgb(139 69 199 / 0.5), rgb(59 130 246 / 0.5)) !important;
            border-color: rgb(139 69 199 / 0.8) !important;
            color: rgb(255 255 255) !important;
            box-shadow: 0 0 20px rgb(139 69 199 / 0.3);
            transform: scale(1.05);
        }
        .crypto-tab:hover {
            transform: scale(1.02);
        }
        .predictions-scroll::-webkit-scrollbar {
            width: 6px;
        }
        .predictions-scroll::-webkit-scrollbar-track {
            background: rgb(31 41 55 / 0.5);
            border-radius: 3px;
        }
        .predictions-scroll::-webkit-scrollbar-thumb {
            background: rgb(139 69 199 / 0.5);
            border-radius: 3px;
        }
        .predictions-scroll::-webkit-scrollbar-thumb:hover {
            background: rgb(139 69 199 / 0.8);
        }
    </style>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body class="bg-gray-900 text-white">
    <!-- Loading Screen -->
    <div id="loading" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 class="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">Multi-Crypto AI Trading Terminal</h2>
            <p class="text-gray-400">Initialisation du réseau neuronal...</p>
        </div>
    </div>

    <!-- Neural Network Background -->
    <div class="neural-network-bg"></div>
    <div class="matrix-bg"></div>
    
    <!-- Main Dashboard -->
    <div id="dashboard" class="hidden min-h-screen bg-gradient-to-br from-gray-900/90 via-purple-900/90 to-blue-900/90 backdrop-blur-sm circuit-pattern">
        <!-- Header -->
        <header class="bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-lg border-b border-purple-500/30 glass-morphism-strong">
            <div class="container mx-auto px-6 py-4">
                <div class="flex flex-col md:flex-row justify-between items-center">
                    <div class="flex items-center space-x-4 mb-4 md:mb-0">
                        <div class="text-2xl eth-glow">⚡</div>
                        <div>
                            <h1 class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent holographic-text">
                                Multi-Crypto AI Trading Terminal
                            </h1>
                            <p class="text-purple-300 text-sm">Neural Network Powered Trading System - ETH & BTC</p>
                        </div>
                    </div>
                    
                    <!-- Status Indicator -->
                    <div class="flex items-center space-x-1">
                        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span class="text-xs text-gray-400">Live</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Dashboard Content -->
        <div class="container mx-auto px-6 py-8">
            <!-- Le contenu sera injecté ici par JavaScript -->
        </div>
    </div>

    <!-- Scripts -->
    <script src="/static/ethereum-ai-terminal.js"></script>
    <script>
        // Initialiser l'Ethereum AI Trading Terminal
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 AI Trading Terminal Starting...');
            window.app = new EthereumAITradingTerminal();
            
            // Animation de chargement progressive
            const loadingSteps = [
                { text: 'Initialisation des réseaux neuronaux...', delay: 500 },
                { text: 'Connexion aux flux de données en temps réel...', delay: 1000 },
                { text: 'Chargement des modèles TimesFM...', delay: 1500 },
                { text: 'Configuration du terminal AI...', delay: 2000 }
            ];
            
            const loadingText = document.querySelector('#loading p');
            let currentStep = 0;
            
            const updateLoading = () => {
                if (currentStep < loadingSteps.length) {
                    setTimeout(() => {
                        loadingText.textContent = loadingSteps[currentStep].text;
                        currentStep++;
                        updateLoading();
                    }, loadingSteps[currentStep]?.delay || 500);
                } else {
                    setTimeout(() => {
                        console.log('✨ Futuristic Terminal initialized successfully');
                    }, 500);
                }
            };
            
            updateLoading();
        });
    </script>
</body>
</html>
  `);
});

// API routes for testing
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: true,
      coingecko_api: true
    }
  });
});

// API endpoints for the validated Multi-Crypto AI Terminal
app.get('/api/dashboard', (req, res) => {
  const crypto = req.query.crypto || 'ETH';
  const includeMarket = req.query.include_market === 'true';
  
  const mockData = {
    success: true,
    dashboard: {
      current_price: crypto === 'ETH' ? 3456.78 : 67890.12,
      current_balance: 10000.00,
      active_positions: [
        {
          id: 1,
          symbol: crypto === 'ETH' ? 'ETHUSDT' : 'BTCUSDT',
          side: 'long',
          entry_price: crypto === 'ETH' ? 3400.00 : 65000.00,
          current_price: crypto === 'ETH' ? 3456.78 : 67890.12,
          quantity: crypto === 'ETH' ? 2.5 : 0.15,
          unrealized_pnl: crypto === 'ETH' ? 141.95 : 433.52,
          percentage_change: crypto === 'ETH' ? 1.67 : 4.44
        }
      ],
      metrics: {
        total_trades: 127,
        win_rate: 68.5,
        total_pnl: 2847.32,
        sharpe_ratio: 1.84
      },
      recent_trades: [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          action: 'BUY',
          crypto: crypto,
          price: crypto === 'ETH' ? 3400.00 : 65000.00,
          quantity: crypto === 'ETH' ? 1.0 : 0.1,
          pnl: crypto === 'ETH' ? 56.78 : 1890.12
        }
      ],
      latest_predictions: [
        {
          timestamp: new Date().toISOString(),
          symbol: crypto === 'ETH' ? 'ETHUSDT' : 'BTCUSDT',
          predicted_price: crypto === 'ETH' ? 3567.89 : 69234.56,
          predicted_return: 0.032,
          confidence_score: 0.742,
          horizon_hours: 24,
          quantile_10: crypto === 'ETH' ? 3200.00 : 64000.00,
          quantile_90: crypto === 'ETH' ? 3800.00 : 72000.00
        },
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          symbol: crypto === 'ETH' ? 'ETHUSDT' : 'BTCUSDT', 
          predicted_price: crypto === 'ETH' ? 3489.12 : 68123.45,
          predicted_return: 0.019,
          confidence_score: 0.687,
          horizon_hours: 24,
          quantile_10: crypto === 'ETH' ? 3150.00 : 63500.00,
          quantile_90: crypto === 'ETH' ? 3750.00 : 71000.00
        }
      ],
      market_data: includeMarket ? {
        volume_24h: crypto === 'ETH' ? 15847293847.32 : 28394857239.45,
        market_cap: crypto === 'ETH' ? 415738294728.91 : 1347382947283.74,
        price_change_24h: crypto === 'ETH' ? 2.45 : -1.23,
        volatility: crypto === 'ETH' ? 0.034 : 0.028,
        high_24h: crypto === 'ETH' ? 3512.45 : 69823.12,
        low_24h: crypto === 'ETH' ? 3389.78 : 67234.89
      } : null,
      crypto: crypto.toUpperCase(),
      symbol: crypto === 'ETH' ? 'ETHUSDT' : 'BTCUSDT'
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(mockData);
});

app.get('/api/predictions/latest', (req, res) => {
  const crypto = req.query.crypto || 'ETH';
  const limit = parseInt(req.query.limit || '5');
  
  const predictions = [];
  for (let i = 0; i < limit; i++) {
    predictions.push({
      id: i + 1,
      timestamp: new Date(Date.now() - (i * 3600000)).toISOString(),
      symbol: crypto === 'ETH' ? 'ETHUSDT' : 'BTCUSDT',
      predicted_price: crypto === 'ETH' ? (3400 + Math.random() * 200) : (66000 + Math.random() * 4000),
      predicted_return: (Math.random() - 0.5) * 0.1,
      confidence_score: 0.6 + Math.random() * 0.3,
      horizon_hours: 24,
      quantile_10: crypto === 'ETH' ? (3200 + Math.random() * 100) : (64000 + Math.random() * 2000),
      quantile_90: crypto === 'ETH' ? (3700 + Math.random() * 200) : (70000 + Math.random() * 3000)
    });
  }
  
  res.json({
    success: true,
    predictions: predictions,
    crypto: crypto.toUpperCase(),
    count: predictions.length
  });
});

app.get('/api/predictions/:id/details', (req, res) => {
  const predictionId = req.params.id;
  const crypto = req.query.crypto || 'ETH';
  
  res.json({
    success: true,
    prediction_details: {
      id: predictionId,
      timestamp: new Date().toISOString(),
      predicted_price: crypto === 'ETH' ? 3567.89 : 69234.56,
      predicted_return: 0.032,
      confidence_score: 0.742,
      horizon_hours: 24,
      quantile_10: crypto === 'ETH' ? 3200.00 : 64000.00,
      quantile_90: crypto === 'ETH' ? 3800.00 : 72000.00,
      crypto: crypto.toUpperCase(),
      pattern_analysis: `TimesFM a analysé 318 points de données historiques pour ${crypto}, identifiant des patterns forts et cohérents dans l'évolution des prix. Le modèle neural a détecté des signaux de tendance fiables, résultant en une confiance de 74.2%.`,
      key_factors: [
        `Volatilité récente: ${Math.abs(0.032 * 100).toFixed(1)}%`,
        `Tendance de prix: ${0.032 > 0 ? 'Haussière (+' + (0.032 * 100).toFixed(2) + '%)' : 'Baissière (' + (0.032 * 100).toFixed(2) + '%)'}`,
        `Stabilité des patterns: Très élevée`,
        `Volume d'analyse TimesFM: 318 points de données (optimisé 400+)`,
        `Période d'analyse: 21 jours pour robustesse TimesFM`,
        `Écart de prédiction: $${Math.abs((crypto === 'ETH' ? 3800.00 : 72000.00) - (crypto === 'ETH' ? 3200.00 : 64000.00)).toFixed(0)} (Q90-Q10)`
      ],
      reliability_explanation: `Cette prédiction TimesFM est basée sur l'analyse de séries temporelles avancée. Le niveau de confiance de 74.2% dépasse le seuil de trading automatisé de 59%. Le système considère cette prédiction comme fiable pour les décisions de trading automatiques.`
    },
    crypto: crypto.toUpperCase(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/cryptos/supported', (req, res) => {
  res.json({
    success: true,
    cryptos: [
      { crypto: 'ETH', name: 'Ethereum', symbol: 'ETHUSDT', active: true },
      { crypto: 'BTC', name: 'Bitcoin', symbol: 'BTCUSDT', active: true }
    ],
    count: 2
  });
});

app.get('/api/market/current', (req, res) => {
  const crypto = req.query.crypto || 'ETH';
  
  res.json({
    success: true,
    market_data: {
      crypto: crypto.toUpperCase(),
      current_price: crypto === 'ETH' ? 3456.78 : 67890.12,
      price_change_24h: crypto === 'ETH' ? 2.45 : -1.23,
      volume_24h: crypto === 'ETH' ? 15847293847.32 : 28394857239.45,
      market_cap: crypto === 'ETH' ? 415738294728.91 : 1347382947283.74,
      high_24h: crypto === 'ETH' ? 3512.45 : 69823.12,
      low_24h: crypto === 'ETH' ? 3389.78 : 67234.89,
      volatility: crypto === 'ETH' ? 0.034 : 0.028
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Multi-Crypto AI Trader Pro running on port ${PORT}`);
});
