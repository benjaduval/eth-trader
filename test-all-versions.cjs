const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Serve static files
app.use('/static', express.static('public/static'));
app.use(express.static('public'));

// Route pour lister toutes les versions disponibles
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
        <title>Toutes les Versions - Multi-Crypto AI Trader</title>
        <style>
            body { font-family: Arial, sans-serif; background: #1a1a2e; color: white; padding: 20px; }
            .version { margin: 20px 0; padding: 20px; background: #16213e; border-radius: 10px; }
            .version h3 { color: #64ffda; }
            .url { background: #0f3460; padding: 10px; border-radius: 5px; margin: 10px 0; }
            a { color: #64ffda; text-decoration: none; }
            a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>🚀 Toutes les Versions - Multi-Crypto AI Trader</h1>
        
        <div class="version">
            <h3>1. VERSION COMPLÈTE VALIDÉE (avec historique trades + popup prédictions)</h3>
            <p>✅ Historique complet des trades</p>
            <p>✅ Popup détaillé des prédictions avec analyse TimesFM</p>
            <p>✅ Navigation ETH/BTC</p>
            <p>✅ Positions actives</p>
            <div class="url">
                <a href="/validated-complete" target="_blank">
                    /validated-complete - Interface complète avec toutes les fonctionnalités
                </a>
            </div>
        </div>
        
        <div class="version">
            <h3>2. ETHEREUM AI TERMINAL STANDALONE</h3>
            <p>Interface standalone complète dans un seul fichier HTML</p>
            <div class="url">
                <a href="/ethereum-terminal-standalone.html" target="_blank">
                    /ethereum-terminal-standalone.html - Version standalone
                </a>
            </div>
        </div>
        
        <div class="version">
            <h3>3. INTERFACE SIMPLE INDEX</h3>
            <p>Version simple avec index.html</p>
            <div class="url">
                <a href="/index.html" target="_blank">
                    /index.html - Version index simple
                </a>
            </div>
        </div>
        
        <div class="version">
            <h3>4. VERSIONS JAVASCRIPT SEPARÉES</h3>
            <p>Différentes versions du JavaScript pour tests:</p>
            <div class="url">
                <a href="/test-js/ethereum-ai-terminal" target="_blank">
                    /test-js/ethereum-ai-terminal - Version principale avec popup
                </a>
            </div>
            <div class="url">
                <a href="/test-js/app-multi-crypto" target="_blank">
                    /test-js/app-multi-crypto - Version multi-crypto alternative
                </a>
            </div>
            <div class="url">
                <a href="/test-js/app-simple" target="_blank">
                    /test-js/app-simple - Version simplifiée
                </a>
            </div>
        </div>
        
        <h2>🎯 Version recommandée pour vous:</h2>
        <div class="version" style="border: 2px solid #64ffda;">
            <h3>VERSION VALIDÉE COMPLÈTE</h3>
            <div class="url">
                <a href="/validated-complete" target="_blank" style="font-size: 18px; font-weight: bold;">
                    👆 CLIQUEZ ICI - Version avec historique trades + popup prédictions
                </a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Route pour la version complète validée (celle avec historique + popup)
app.get('/validated-complete', (req, res) => {
  res.send(\`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Crypto AI Trader Pro - VERSION VALIDÉE</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="/static/style.css">
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
    </style>
</head>
<body class="bg-gray-900 text-white">
    <!-- Loading Screen -->
    <div id="loading" class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <h2 class="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">Multi-Crypto AI Trading Terminal</h2>
            <p class="text-gray-400">VERSION VALIDÉE - Avec historique trades + popup prédictions</p>
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
                                Multi-Crypto AI Trading Terminal - VALIDÉE
                            </h1>
                            <p class="text-purple-300 text-sm">Neural Network + Historique Trades + Popup Prédictions</p>
                        </div>
                    </div>
                    
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
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 Loading VALIDATED Multi-Crypto AI Terminal with Trade History + Prediction Popups');
            window.app = new EthereumAITradingTerminal();
            
            const loadingSteps = [
                { text: 'Chargement de la version VALIDÉE...', delay: 500 },
                { text: 'Initialisation historique des trades...', delay: 1000 },
                { text: 'Configuration popup prédictions...', delay: 1500 },
                { text: 'Activation navigation ETH/BTC...', delay: 2000 }
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
                        console.log('✨ VERSION VALIDÉE chargée avec succès!');
                    }, 500);
                }
            };
            
            updateLoading();
        });
    </script>
</body>
</html>
  \`);
});

// Routes pour tester les différentes versions JS
app.get('/test-js/:version', (req, res) => {
  const version = req.params.version;
  const jsFile = version + '.js';
  
  res.send(\`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Version: \${version}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/static/style.css">
    </head>
    <body class="bg-gray-900 text-white">
        <div class="container mx-auto p-6">
            <h1 class="text-2xl font-bold mb-4">Test Version: \${version}</h1>
            <div id="dashboard">Chargement...</div>
        </div>
        <script src="/static/\${jsFile}"></script>
        <script>
            console.log('Loading version: \${version}');
        </script>
    </body>
    </html>
  \`);
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🚀 Test Server running on port \${PORT}\`);
  console.log(\`📋 Toutes les versions disponibles à tester\`);
});