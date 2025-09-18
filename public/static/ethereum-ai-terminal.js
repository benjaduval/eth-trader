/**
 * Ethereum AI Trading Terminal - Ultra-Futuristic Interface
 * Interface spécialisée pour le trading ETH avec TimesFM Neural Network
 */

class EthereumAITradingTerminal {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 secondes
        this.priceChart = null;
        this.isAutoRefreshEnabled = true;
        this.currentCrypto = 'ETH'; // Crypto par défaut, mais peut changer vers BTC
        this.supportedCryptos = ['ETH', 'BTC'];
        
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation Ethereum AI Trading Terminal...');
        
        try {
            await this.checkHealth();
            await this.loadSupportedCryptos();
            await this.loadEthereumAITerminal();
            this.setupAutoRefresh();
            this.setupEventListeners();
            
            console.log('✅ Ethereum AI Trading Terminal initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showError('Erreur de connexion au serveur');
        }
    }

    async checkHealth() {
        const response = await fetch(`${this.apiBase}/health`);
        const data = await response.json();
        
        if (!data.status === 'healthy') {
            throw new Error('Service indisponible');
        }
        
        console.log('✅ Service healthy:', data);
        
        // Vérifier les cryptos supportées depuis le health check
        if (data.supported_cryptos) {
            this.supportedCryptos = data.supported_cryptos;
            console.log('💰 Cryptos supportées:', this.supportedCryptos);
        }
    }

    async loadSupportedCryptos() {
        try {
            const response = await fetch(`${this.apiBase}/cryptos/supported`);
            const data = await response.json();
            
            if (data.success && data.cryptos) {
                this.supportedCryptos = data.cryptos.map(c => c.crypto);
                console.log('💰 Cryptos disponibles:', this.supportedCryptos);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger les cryptos supportées:', error);
        }
    }

    async loadEthereumAITerminal() {
        const loading = document.getElementById('loading');
        const dashboard = document.getElementById('dashboard');
        
        try {
            // Récupérer plus de prédictions pour la liste complète
            const [dashboardResponse, predictionsResponse] = await Promise.all([
                fetch(`${this.apiBase}/dashboard?include_market=true&crypto=${this.currentCrypto}`),
                fetch(`${this.apiBase}/predictions/latest?limit=10&crypto=${this.currentCrypto}`)
            ]);
            const [dashboardResult, predictionsResult] = await Promise.all([
                dashboardResponse.json(),
                predictionsResponse.json()
            ]);
            
            if (!dashboardResult.success) {
                throw new Error(dashboardResult.error || 'Erreur dashboard');
            }
            
            // Ajouter la liste complète des prédictions au dashboard
            const enhancedDashboard = {
                ...dashboardResult.dashboard,
                complete_predictions: predictionsResult.success ? predictionsResult.predictions : []
            };
            
            this.renderEthereumAITerminal(enhancedDashboard);
            
            // Forcer la transition après rendu
            setTimeout(() => {
                loading.style.display = 'none';
                dashboard.classList.remove('hidden');
                dashboard.style.display = 'block';
                console.log('🎯 Interface complète affichée - onglets ETH/BTC visibles');
            }, 100);
            
        } catch (error) {
            console.error('Erreur chargement terminal:', error);
            loading.innerHTML = `
                <i class="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                <p class="mt-2 text-red-400">Erreur: ${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-purple-600 rounded hover:bg-purple-700">
                    Réessayer
                </button>
            `;
        }
    }

    renderEthereumAITerminal(dashboard) {
        const container = document.querySelector('#dashboard .container');
        if (!container) {
            console.error('❌ Container principal non trouvé');
            return;
        }
        
        // Structure spécifique du terminal Ethereum AI
        console.log('🎨 Rendu du terminal Ethereum AI Trading...');
        
        const terminalHTML = this.generateEthereumAITerminalHTML(dashboard);
        container.innerHTML = terminalHTML;
        
        // Initialiser les composants spécialisés
        this.initializeEthereumAIComponents(dashboard);
        
        // Vérifier que les onglets sont visibles
        setTimeout(() => {
            const ethTab = document.getElementById('eth-tab');
            const btcTab = document.getElementById('btc-tab');
            if (ethTab && btcTab) {
                console.log('✅ Onglets ETH/BTC intégrés et visibles dans le rendu JavaScript');
                console.log(`📍 Onglet actif: ${this.currentCrypto} - ETH visible: ${ethTab.offsetParent !== null}, BTC visible: ${btcTab.offsetParent !== null}`);
                
                // Vérifier que les événements sont bien attachés
                console.log('🎯 Événements onclick:', {
                    eth: ethTab.onclick ? 'OK' : 'MANQUANT',
                    btc: btcTab.onclick ? 'OK' : 'MANQUANT'
                });
            } else {
                console.error('❌ Onglets ETH/BTC manquants après intégration JavaScript !');
                console.log('🔍 Elements trouvés:', {
                    ethTab: !!ethTab,
                    btcTab: !!btcTab,
                    container: !!document.querySelector('#dashboard .container')
                });
            }
        }, 200);
    }
    
    generateEthereumAITerminalHTML(dashboard) {
        return `
            <!-- ETH/BTC Navigation Tabs (Integrated into JavaScript Render) -->
            <div class="crypto-navigation-header mb-6">
                <div class="flex items-center justify-between bg-gradient-to-r from-gray-900/50 to-purple-900/30 backdrop-blur-lg rounded-xl p-4 border border-purple-500/20">
                    <div class="flex items-center space-x-2">
                        <button onclick="app.switchCrypto('ETH')" id="eth-tab" 
                            class="crypto-tab ${this.currentCrypto === 'ETH' ? 'active bg-gradient-to-r from-purple-500/30 to-blue-500/30 border-purple-500/50 text-purple-200' : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400'} backdrop-blur-sm px-6 py-3 rounded-xl border text-lg font-bold hover:border-purple-400 transition-all shadow-lg">
                            ⚡ ETHEREUM
                        </button>
                        <button onclick="app.switchCrypto('BTC')" id="btc-tab" 
                            class="crypto-tab ${this.currentCrypto === 'BTC' ? 'active bg-gradient-to-r from-purple-500/30 to-blue-500/30 border-purple-500/50 text-purple-200' : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400'} backdrop-blur-sm px-6 py-3 rounded-xl border text-lg font-bold hover:border-purple-400 transition-all shadow-lg">
                            ₿ BITCOIN
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span class="text-xs text-green-300">Live ${this.currentCrypto} Data</span>
                    </div>
                </div>
            </div>

            <!-- Ethereum AI Trading Terminal Header -->
            <div class="ethereum-ai-header mb-8">
                <div class="flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                            ${this.currentCrypto === 'ETH' ? '⚡' : '₿'}
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                ${this.currentCrypto === 'ETH' ? 'Ethereum' : 'Bitcoin'} AI Trading Terminal
                            </h1>
                            <p class="text-purple-300">Neural Network Powered Trading System - ${this.currentCrypto}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="ai-status-indicator">
                            <div class="flex items-center space-x-2 bg-green-500/20 px-4 py-2 rounded-lg">
                                <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                <span class="text-green-300 text-sm font-medium">AI System Online</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-white">$${dashboard.current_price?.toLocaleString() || 'N/A'}</div>
                            <div class="text-sm text-purple-300">${this.currentCrypto}/USD</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Terminal Grid -->
            <div class="ethereum-ai-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column: Market Analysis -->
                <div class="lg:col-span-2 space-y-6">
                    ${this.generateETHMarketAnalysisSection(dashboard)}
                    ${this.generateTimesFMNeuralSection(dashboard)}
                </div>
                
                <!-- Right Column: Portfolio & Controls -->
                <div class="space-y-6">
                    ${this.generatePortfolioSection(dashboard)}
                    ${this.generateAIStatusSection(dashboard)}
                    ${this.generateControlPanelSection(dashboard)}
                </div>
            </div>
            
            <!-- Bottom Section: System Logs & Analytics -->
            <div class="mt-8">
                ${this.generateSystemExplanationSection(dashboard)}
            </div>
        `;
    }
    
    generateETHMarketAnalysisSection(dashboard) {
        const cryptoName = this.currentCrypto === 'ETH' ? 'Ethereum' : 'Bitcoin';
        const cryptoIcon = this.currentCrypto === 'ETH' ? '📈' : '📊';
        
        return `
            <div class="ethereum-market-analysis bg-gradient-to-br from-gray-900/80 to-purple-900/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center">
                        <span class="mr-3">${cryptoIcon}</span>
                        ${this.currentCrypto} Market Analysis
                    </h2>
                    <div class="text-sm text-purple-300">Live ${cryptoName} Data</div>
                </div>
                
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div class="metric-card bg-purple-900/30 p-4 rounded-lg border border-purple-500/20">
                        <div class="text-purple-300 text-sm">Current Price</div>
                        <div class="text-2xl font-bold text-white">$${dashboard.current_price?.toLocaleString() || 'N/A'}</div>
                        <div class="text-green-400 text-xs">+2.4%</div>
                    </div>
                    <div class="metric-card bg-blue-900/30 p-4 rounded-lg border border-blue-500/20">
                        <div class="text-blue-300 text-sm">24h Volume</div>
                        <div class="text-xl font-bold text-white">${dashboard.market_data?.volume_24h ? '$' + (dashboard.market_data.volume_24h / 1e9).toFixed(2) + 'B' : 'N/A'}</div>
                        <div class="text-blue-400 text-xs">High Activity</div>
                    </div>
                    <div class="metric-card bg-green-900/30 p-4 rounded-lg border border-green-500/20">
                        <div class="text-green-300 text-sm">Market Cap</div>
                        <div class="text-xl font-bold text-white">${dashboard.market_data?.market_cap ? '$' + (dashboard.market_data.market_cap / 1e9).toFixed(0) + 'B' : 'N/A'}</div>
                        <div class="text-green-400 text-xs">Rank #2</div>
                    </div>
                    <div class="metric-card bg-orange-900/30 p-4 rounded-lg border border-orange-500/20">
                        <div class="text-orange-300 text-sm">Volatility</div>
                        <div class="text-xl font-bold text-white">${dashboard.market_data?.price_change_percentage_24h ? Math.abs(dashboard.market_data.price_change_percentage_24h).toFixed(1) + '%' : 'N/A'}</div>
                        <div class="text-orange-400 text-xs">Moderate</div>
                    </div>
                </div>
                
                <!-- Price Chart Placeholder -->
                <div class="chart-container bg-black/30 rounded-lg p-4 h-64 flex items-center justify-center border border-gray-600/30">
                    <canvas id="cryptoPriceChart" class="w-full h-full"></canvas>
                </div>
            </div>
        `;
    }
    
    generateTimesFMNeuralSection(dashboard) {
        const latestPrediction = dashboard.latest_predictions?.[0];
        
        return `
            <div class="timesfm-neural bg-gradient-to-br from-gray-900/80 to-blue-900/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center">
                        <span class="mr-3">🧠</span>
                        TimesFM Neural Predictions
                    </h2>
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span class="text-blue-300 text-sm">AI Computing</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="prediction-card bg-blue-900/40 p-4 rounded-lg border border-blue-400/30">
                        <div class="text-blue-300 text-sm mb-2">24h Prediction</div>
                        <div class="text-2xl font-bold text-white mb-1">
                            $${latestPrediction?.predicted_price?.toLocaleString() || 'Computing...'}
                        </div>
                        <div class="text-xs text-blue-400">
                            Confidence: ${latestPrediction?.confidence_score ? (latestPrediction.confidence_score * 100).toFixed(1) + '%' : 'N/A'} ${latestPrediction?.confidence_score > 0.59 ? '✅' : '⚠️'}
                        </div>
                    </div>
                    
                    <div class="prediction-card bg-green-900/40 p-4 rounded-lg border border-green-400/30">
                        <div class="text-green-300 text-sm mb-2">Expected Return</div>
                        <div class="text-2xl font-bold ${latestPrediction?.predicted_return && latestPrediction.predicted_return > 0 ? 'text-green-400' : 'text-red-400'} mb-1">
                            ${latestPrediction?.predicted_return ? (latestPrediction.predicted_return * 100).toFixed(2) + '%' : 'N/A'}
                        </div>
                        <div class="text-xs text-green-400">24h Horizon</div>
                    </div>
                    
                    <div class="prediction-card bg-purple-900/40 p-4 rounded-lg border border-purple-400/30">
                        <div class="text-purple-300 text-sm mb-2">Risk Range</div>
                        <div class="text-sm font-bold text-white mb-1">
                            ${latestPrediction?.quantile_10 ? '$' + latestPrediction.quantile_10.toLocaleString() : 'N/A'} - ${latestPrediction?.quantile_90 ? '$' + latestPrediction.quantile_90.toLocaleString() : 'N/A'}
                        </div>
                        <div class="text-xs text-purple-400">90% Confidence</div>
                    </div>
                </div>
                
                <!-- Neural Network Activity -->
                <div class="mt-4 p-4 bg-black/30 rounded-lg border border-gray-600/30">
                    <div class="text-sm text-gray-300 mb-2">Neural Network Activity:</div>
                    <div class="flex items-center space-x-4 text-xs">
                        <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-green-300">Pattern Recognition</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span class="text-blue-300">Time Series Analysis</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <span class="text-purple-300">Market Sentiment</span>
                        </div>
                    </div>
                </div>
                
                <!-- Liste complète des prédictions TimesFM -->
                ${this.generateCompletePredictionsList(dashboard)}
            </div>
        `;
    }
    
    generateCompletePredictionsList(dashboard) {
        const predictions = dashboard.complete_predictions || dashboard.latest_predictions || [];
        
        if (!predictions || predictions.length === 0) {
            return `
                <div class="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                    <div class="text-center text-gray-400">
                        <span class="text-2xl">🤖</span>
                        <div class="mt-2">Génération de nouvelles prédictions en cours...</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="mt-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-white flex items-center">
                        <span class="mr-2">📊</span>
                        Complete TimesFM Results (${predictions.length})
                    </h3>
                    <div class="text-xs text-gray-400">
                        Seuil Trading: Confidence > 59% ✅ | Actuel: ${predictions.length > 0 ? (predictions[0].confidence_score * 100).toFixed(1) + '%' : 'N/A'}
                    </div>
                </div>
                
                <div class="max-h-80 overflow-y-auto space-y-2 predictions-scroll">
                    ${predictions.map((pred, index) => {
                        const isHighConfidence = pred.confidence_score > 0.59;
                        const confidenceIcon = isHighConfidence ? '✅' : '⚠️';
                        const borderColor = isHighConfidence ? 'border-green-500/50' : 'border-yellow-500/50';
                        const bgColor = isHighConfidence ? 'bg-green-900/20' : 'bg-yellow-900/20';
                        
                        return `
                            <div class="prediction-item flex items-center justify-between p-3 ${bgColor} rounded-lg border ${borderColor} hover:border-blue-500/50 transition-all cursor-pointer" 
                                 onclick="app.showPredictionDetails('${pred.id || pred.timestamp}', '${this.currentCrypto}')">
                                <div class="flex items-center space-x-4">
                                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                        ${index + 1}
                                    </div>
                                    <div>
                                        <div class="text-white font-medium">$${pred.predicted_price?.toFixed(2) || 'N/A'}</div>
                                        <div class="text-xs text-gray-400">${new Date(pred.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="flex items-center space-x-2">
                                        <div class="text-sm ${(pred.predicted_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                                            ${pred.predicted_return ? ((pred.predicted_return * 100).toFixed(2) + '%') : 'N/A'}
                                        </div>
                                        <span class="text-lg">${confidenceIcon}</span>
                                    </div>
                                    <div class="text-xs text-purple-300">
                                        ${pred.confidence_score ? ((pred.confidence_score * 100).toFixed(1) + '%') : 'N/A'} conf.
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        Range: $${pred.quantile_10?.toFixed(0) || 'N/A'} - $${pred.quantile_90?.toFixed(0) || 'N/A'}
                                    </div>
                                    <div class="text-xs text-blue-400 mt-1">
                                        📋 Cliquez pour détails complets
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    generatePortfolioSection(dashboard) {
        return `
            <div class="portfolio-section bg-gradient-to-br from-gray-900/80 to-green-900/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
                <h2 class="text-xl font-bold text-white flex items-center mb-6">
                    <span class="mr-3">💼</span>
                    Portfolio
                </h2>
                
                <div class="space-y-4">
                    <div class="balance-card bg-green-900/30 p-4 rounded-lg border border-green-500/20">
                        <div class="text-green-300 text-sm">Total Balance</div>
                        <div class="text-2xl font-bold text-white">
                            $${dashboard.current_balance?.toLocaleString() || '10,000'}
                        </div>
                        <div class="text-green-400 text-xs">USD</div>
                    </div>
                    
                    <div class="positions-summary">
                        <div class="text-sm text-gray-300 mb-2">Active Positions:</div>
                        <div class="space-y-2">
                            ${dashboard.active_positions?.length ? dashboard.active_positions.map(position => `
                                <div class="position-item bg-gray-800/50 p-3 rounded-lg border border-gray-600/30">
                                    <div class="flex justify-between items-center">
                                        <div class="text-white font-medium">${position.type?.toUpperCase() || 'N/A'}</div>
                                        <div class="${position.pnl && position.pnl > 0 ? 'text-green-400' : 'text-red-400'}">
                                            ${position.pnl ? (position.pnl > 0 ? '+' : '') + position.pnl.toFixed(2) + '%' : 'N/A'}
                                        </div>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-1">
                                        Entry: $${position.entry_price?.toLocaleString() || 'N/A'}
                                    </div>
                                </div>
                            `).join('') : '<div class="text-gray-500 text-center py-4">No Active Positions</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateAIStatusSection(dashboard) {
        return `
            <div class="ai-status-section bg-gradient-to-br from-gray-900/80 to-cyan-900/20 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
                <h2 class="text-xl font-bold text-white flex items-center mb-6">
                    <span class="mr-3">🤖</span>
                    AI Status
                </h2>
                
                <div class="space-y-3">
                    <div class="status-item flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <span class="text-gray-300 text-sm">TimesFM Model</span>
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-green-300 text-sm">Active</span>
                        </div>
                    </div>
                    
                    <div class="status-item flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <span class="text-gray-300 text-sm">Market Data Feed</span>
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-green-300 text-sm">Connected</span>
                        </div>
                    </div>
                    
                    <div class="status-item flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <span class="text-gray-300 text-sm">Auto Trading</span>
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            <span class="text-yellow-300 text-sm">Monitoring</span>
                        </div>
                    </div>
                    
                    <div class="status-item flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                        <span class="text-gray-300 text-sm">Risk Management</span>
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-green-300 text-sm">Enabled</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateControlPanelSection(dashboard) {
        return `
            <div class="control-panel bg-gradient-to-br from-gray-900/80 to-red-900/20 backdrop-blur-lg rounded-2xl p-6 border border-red-500/30">
                <h2 class="text-xl font-bold text-white flex items-center mb-6">
                    <span class="mr-3">🎛️</span>
                    Control Panel
                </h2>
                
                <div class="space-y-3">
                    <button id="generatePrediction" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                        🧠 Generate Prediction
                    </button>
                    
                    <button id="executeTradeSignal" class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                        📈 Execute Trade Signal
                    </button>
                    
                    <button id="updateMarketData" class="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                        📊 Update Market Data
                    </button>
                    
                    <button id="refreshDashboard" class="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
                        🔄 Refresh Dashboard
                    </button>
                </div>
                
                <!-- Auto-refresh Toggle -->
                <div class="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-300 text-sm">Auto Refresh</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="autoRefreshToggle" class="sr-only peer" ${this.isAutoRefreshEnabled ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    <div class="text-xs text-gray-400 mt-2">Updates every 30 seconds</div>
                </div>
            </div>
        `;
    }
    
    generateSystemExplanationSection(dashboard) {
        return `
            <div class="system-explanation bg-gradient-to-br from-gray-900/80 to-indigo-900/20 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
                <h2 class="text-xl font-bold text-white flex items-center mb-6">
                    <span class="mr-3">📚</span>
                    System Intelligence & Logs
                </h2>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- System Explanation -->
                    <div class="explanation-panel">
                        <h3 class="text-lg font-semibold text-indigo-300 mb-4">How It Works</h3>
                        <div class="space-y-3 text-sm text-gray-300">
                            <div class="flex items-start space-x-3">
                                <div class="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <div class="font-medium text-white">TimesFM Neural Network</div>
                                    <div>Advanced time series forecasting model that analyzes historical price patterns and market dynamics to predict future price movements with quantified confidence intervals.</div>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <div class="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <div class="font-medium text-white">Real-time Market Integration</div>
                                    <div>CoinGecko Pro API provides live market data, order book depth, and sentiment indicators that feed into our AI decision-making process.</div>
                                </div>
                            </div>
                            
                            <div class="flex items-start space-x-3">
                                <div class="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                    <div class="font-medium text-white">Automated Risk Management</div>
                                    <div>Dynamic stop-loss and take-profit calculations based on volatility analysis and position sizing algorithms to protect capital.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activity Logs -->
                    <div class="activity-logs">
                        <h3 class="text-lg font-semibold text-indigo-300 mb-4">Recent Activity</h3>
                        <div class="space-y-2 max-h-48 overflow-y-auto">
                            <div class="log-entry flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                                <div class="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                                <div class="flex-1">
                                    <div class="text-white text-sm">TimesFM prediction generated</div>
                                    <div class="text-gray-400 text-xs">${new Date().toLocaleTimeString()}</div>
                                </div>
                            </div>
                            
                            <div class="log-entry flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                                <div class="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                                <div class="flex-1">
                                    <div class="text-white text-sm">Market data synchronized</div>
                                    <div class="text-gray-400 text-xs">${new Date(Date.now() - 60000).toLocaleTimeString()}</div>
                                </div>
                            </div>
                            
                            <div class="log-entry flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                                <div class="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                                <div class="flex-1">
                                    <div class="text-white text-sm">Risk parameters updated</div>
                                    <div class="text-gray-400 text-xs">${new Date(Date.now() - 120000).toLocaleTimeString()}</div>
                                </div>
                            </div>
                            
                            <div class="log-entry flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg">
                                <div class="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                                <div class="flex-1">
                                    <div class="text-white text-sm">Portfolio rebalanced</div>
                                    <div class="text-gray-400 text-xs">${new Date(Date.now() - 300000).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    initializeEthereumAIComponents(dashboard) {
        // Initialiser les événements des boutons de contrôle
        this.setupEthereumAIEventListeners();
        
        // Initialiser le graphique de prix
        this.initializeETHPriceChart(dashboard);
        
        // Configurer le toggle d'auto-refresh
        this.setupAutoRefreshToggle();
        
        console.log('✅ Composants Ethereum AI Terminal initialisés');
    }
    
    setupEthereumAIEventListeners() {
        // Bouton Generate Prediction
        const generateBtn = document.getElementById('generatePrediction');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generatePrediction());
        }
        
        // Bouton Execute Trade Signal  
        const tradeBtn = document.getElementById('executeTradeSignal');
        if (tradeBtn) {
            tradeBtn.addEventListener('click', () => this.executeTradeSignal());
        }
        
        // Bouton Update Market Data
        const updateBtn = document.getElementById('updateMarketData');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.updateMarketData());
        }
        
        // Bouton Refresh Dashboard
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadEthereumAITerminal());
        }
    }
    
    setupAutoRefreshToggle() {
        const toggle = document.getElementById('autoRefreshToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.isAutoRefreshEnabled = e.target.checked;
                console.log('🔄 Auto-refresh:', this.isAutoRefreshEnabled ? 'Activé' : 'Désactivé');
            });
        }
    }
    
    setupEventListeners() {
        // Pas besoin de sélecteur crypto pour ce terminal dédié ETH
        console.log('📡 Event listeners configurés pour Ethereum AI Terminal');
    }
    
    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            if (this.isAutoRefreshEnabled) {
                console.log('🔄 Auto-refresh Ethereum AI Terminal...');
                this.loadEthereumAITerminal();
            }
        }, 30000);
        
        console.log('⏰ Auto-refresh configuré (30s)');
    }
    
    async generatePrediction() {
        try {
            const btn = document.getElementById('generatePrediction');
            const originalText = btn.textContent;
            btn.textContent = '🧠 Generating...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/predictions/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crypto: this.currentCrypto, horizon: 24 })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Nouvelle prédiction générée avec succès');
                await this.loadEthereumAITerminal(); // Recharger pour afficher la nouvelle prédiction
            } else {
                throw new Error(result.error || 'Erreur génération prédiction');
            }
        } catch (error) {
            console.error('❌ Erreur génération prédiction:', error);
            this.showError('Erreur lors de la génération de prédiction: ' + error.message);
        } finally {
            const btn = document.getElementById('generatePrediction');
            if (btn) {
                btn.textContent = '🧠 Generate Prediction';
                btn.disabled = false;
            }
        }
    }
    
    async executeTradeSignal() {
        try {
            const btn = document.getElementById('executeTradeSignal');
            const originalText = btn.textContent;
            btn.textContent = '📈 Executing...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/trading/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crypto: this.currentCrypto })
            });
            
            const result = await response.json();
            
            if (result.success) {
                const action = result.signal?.action || 'hold';
                this.showSuccess(`Signal de trading exécuté: ${action.toUpperCase()}`);
                await this.loadEthereumAITerminal(); // Recharger pour afficher les nouvelles positions
            } else {
                throw new Error(result.error || 'Erreur exécution signal');
            }
        } catch (error) {
            console.error('❌ Erreur signal trading:', error);
            this.showError('Erreur lors de l\'exécution du signal: ' + error.message);
        } finally {
            const btn = document.getElementById('executeTradeSignal');
            if (btn) {
                btn.textContent = '📈 Execute Trade Signal';
                btn.disabled = false;
            }
        }
    }
    
    async updateMarketData() {
        try {
            const btn = document.getElementById('updateMarketData');
            const originalText = btn.textContent;
            btn.textContent = '📊 Updating...';
            btn.disabled = true;
            
            const response = await fetch(`${this.apiBase}/automation/incremental-update`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`Données mises à jour: +${result.new_points_added || 0} nouveaux points`);
                await this.loadEthereumAITerminal(); // Recharger avec les nouvelles données
            } else {
                throw new Error(result.error || 'Erreur mise à jour données');
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour données:', error);
            this.showError('Erreur lors de la mise à jour: ' + error.message);
        } finally {
            const btn = document.getElementById('updateMarketData');
            if (btn) {
                btn.textContent = '📊 Update Market Data';
                btn.disabled = false;
            }
        }
    }
    
    initializeETHPriceChart(dashboard) {
        const canvas = document.getElementById('cryptoPriceChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Données de démonstration pour le graphique
        const defaultPrice = this.currentCrypto === 'ETH' ? 4600 : 98000; // Prix par défaut ETH vs BTC
        const currentPrice = dashboard.current_price || defaultPrice;
        const hours = 24;
        const data = [];
        const labels = [];
        
        for (let i = hours; i >= 0; i--) {
            const time = new Date(Date.now() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            
            // Simulation de données de prix avec variation réaliste
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
            const price = currentPrice * (1 + variation * (i / hours));
            data.push(price);
        }
        
        // Détruire le graphique existant s'il y en a un
        if (this.priceChart) {
            this.priceChart.destroy();
        }
        
        // Couleurs dynamiques selon la crypto
        const chartColors = this.currentCrypto === 'ETH' 
            ? { border: 'rgb(147, 51, 234)', background: 'rgba(147, 51, 234, 0.1)' }
            : { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.1)' };
        
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${this.currentCrypto} Price (USD)`,
                    data: data,
                    borderColor: chartColors.border,
                    backgroundColor: chartColors.background,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(75, 85, 99, 0.3)'
                        },
                        ticks: {
                            color: 'rgba(156, 163, 175, 0.8)',
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(75, 85, 99, 0.3)'
                        },
                        ticks: {
                            color: 'rgba(156, 163, 175, 0.8)',
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: 'rgb(147, 51, 234)'
                    }
                }
            }
        });
    }
    
    async switchCrypto(newCrypto) {
        if (newCrypto !== this.currentCrypto) {
            console.log(`🔄 Switching from ${this.currentCrypto} to ${newCrypto}`);
            this.currentCrypto = newCrypto;
            
            console.log(`📊 Loading ${newCrypto} data and re-rendering interface...`);
            
            // Recharger les données pour la nouvelle crypto (ceci va re-render l'interface avec les bons onglets actifs)
            await this.loadEthereumAITerminal();
        }
    }
    
    async showPredictionDetails(predictionId, crypto) {
        try {
            console.log(`🔍 Chargement des détails pour la prédiction ${predictionId} (${crypto})`);
            
            // Récupérer les détails complets de la prédiction
            const response = await fetch(`${this.apiBase}/predictions/${predictionId}/details?crypto=${crypto}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Impossible de charger les détails');
            }
            
            this.renderPredictionDetailsModal(result.prediction_details, crypto);
            
        } catch (error) {
            console.error('❌ Erreur chargement détails prédiction:', error);
            this.showError('Erreur lors du chargement des détails: ' + error.message);
        }
    }
    
    renderPredictionDetailsModal(details, crypto) {
        // Créer le modal s'il n'existe pas
        let modal = document.getElementById('prediction-details-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'prediction-details-modal';
            document.body.appendChild(modal);
        }
        
        const cryptoIcon = crypto === 'ETH' ? '⚡' : '₿';
        const cryptoName = crypto === 'ETH' ? 'Ethereum' : 'Bitcoin';
        
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-gradient-to-br from-gray-900 to-purple-900/50 border border-purple-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="sticky top-0 bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-lg p-6 border-b border-purple-500/30 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">
                                    ${cryptoIcon}
                                </div>
                                <div>
                                    <h2 class="text-2xl font-bold text-white">Détails Prédiction TimesFM</h2>
                                    <p class="text-purple-300">${cryptoName} - ${new Date(details.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onclick="app.closePredictionDetails()" 
                                class="w-10 h-10 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 rounded-lg flex items-center justify-center text-red-300 hover:text-red-200 transition-all">
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    <!-- Content -->
                    <div class="p-6 space-y-6">
                        ${this.generatePredictionDetailsContent(details, crypto)}
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Empêcher le scroll de la page
        
        console.log('✅ Modal des détails de prédiction affiché');
    }
    
    generatePredictionDetailsContent(details, crypto) {
        return `
            <!-- Résultats TimesFM -->
            <div class="prediction-results bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-3">🧠</span>
                    Résultats TimesFM
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="result-card bg-blue-900/40 p-4 rounded-lg border border-blue-400/30">
                        <div class="text-blue-300 text-sm mb-2">Prix Prédit</div>
                        <div class="text-3xl font-bold text-white">$${details.predicted_price?.toLocaleString() || 'N/A'}</div>
                        <div class="text-xs text-blue-400 mt-1">Horizon: ${details.prediction_horizon || '24h'}</div>
                    </div>
                    
                    <div class="result-card bg-green-900/40 p-4 rounded-lg border border-green-400/30">
                        <div class="text-green-300 text-sm mb-2">Retour Attendu</div>
                        <div class="text-2xl font-bold ${(details.predicted_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                            ${details.predicted_return ? ((details.predicted_return * 100).toFixed(2) + '%') : 'N/A'}
                        </div>
                        <div class="text-xs text-green-400 mt-1">Variation prévue</div>
                    </div>
                    
                    <div class="result-card bg-purple-900/40 p-4 rounded-lg border border-purple-400/30">
                        <div class="text-purple-300 text-sm mb-2">Confiance</div>
                        <div class="text-2xl font-bold text-white flex items-center">
                            ${details.confidence_score ? ((details.confidence_score * 100).toFixed(1) + '%') : 'N/A'}
                            <span class="ml-2">${details.confidence_score > 0.59 ? '✅' : '⚠️'}</span>
                        </div>
                        <div class="text-xs text-purple-400 mt-1">Seuil: > 59%</div>
                    </div>
                </div>
                
                <!-- Intervalles de Confiance -->
                <div class="confidence-intervals bg-black/30 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-white mb-3">Intervalles de Confiance</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="text-center">
                            <div class="text-red-400 font-medium">Quantile 10% (Pessimiste)</div>
                            <div class="text-xl font-bold text-white">$${details.quantile_10?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-yellow-400 font-medium">Médiane (Scénario Central)</div>
                            <div class="text-xl font-bold text-white">$${details.predicted_price?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-green-400 font-medium">Quantile 90% (Optimiste)</div>
                            <div class="text-xl font-bold text-white">$${details.quantile_90?.toLocaleString() || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Données d'Entrée TimesFM -->
            <div class="input-data bg-gradient-to-br from-gray-900/50 to-indigo-900/30 rounded-xl p-6 border border-indigo-500/30">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-3">📊</span>
                    Données d'Entrée TimesFM
                </h3>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Données Historiques -->
                    <div class="historical-data">
                        <h4 class="text-lg font-semibold text-indigo-300 mb-3">Historique des Prix Utilisé</h4>
                        <div class="bg-black/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                            ${details.input_historical_data ? this.generateHistoricalDataTable(details.input_historical_data) : 'Données historiques non disponibles'}
                        </div>
                    </div>
                    
                    <!-- Paramètres du Modèle -->
                    <div class="model-params">
                        <h4 class="text-lg font-semibold text-indigo-300 mb-3">Paramètres du Modèle</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-300">Cryptomonnaie:</span>
                                <span class="text-white font-medium">${crypto}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Horizon de prédiction:</span>
                                <span class="text-white font-medium">${details.prediction_horizon || '24 heures'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Points de données:</span>
                                <span class="text-white font-medium">${details.input_data_points || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Période d'analyse:</span>
                                <span class="text-white font-medium">${details.analysis_period || '7 derniers jours'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-300">Prix de base:</span>
                                <span class="text-white font-medium">$${details.base_price?.toLocaleString() || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Explication TimesFM -->
            <div class="explanation bg-gradient-to-br from-green-900/30 to-teal-900/30 rounded-xl p-6 border border-green-500/30">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-3">🤖</span>
                    Explication de la Prédiction TimesFM
                </h3>
                
                <div class="space-y-4 text-sm">
                    <div class="explanation-section">
                        <h4 class="font-semibold text-green-300 mb-2">Analyse des Patterns:</h4>
                        <p class="text-gray-200 leading-relaxed">
                            ${details.pattern_analysis || `TimesFM a analysé ${details.input_data_points || 'les derniers'} points de données historiques pour ${crypto}, 
                            identifiant des tendances et patterns de prix. Le modèle neural a détecté ${details.confidence_score > 0.7 ? 'des signaux forts' : 'des signaux modérés'} 
                            dans les données, résultant en une confiance de ${(details.confidence_score * 100).toFixed(1)}%.`}
                        </p>
                    </div>
                    
                    <div class="explanation-section">
                        <h4 class="font-semibold text-green-300 mb-2">Facteurs Clés Détectés:</h4>
                        <ul class="text-gray-200 space-y-1 ml-4">
                            ${details.key_factors ? details.key_factors.map(factor => `<li>• ${factor}</li>`).join('') : `
                                <li>• Volatilité récente: ${Math.abs(details.predicted_return * 100).toFixed(1)}%</li>
                                <li>• Tendance de prix: ${details.predicted_return > 0 ? 'Haussière' : 'Baissière'}</li>
                                <li>• Stabilité des patterns: ${details.confidence_score > 0.6 ? 'Élevée' : 'Modérée'}</li>
                                <li>• Volume d'analyse: ${details.input_data_points || 'Standard'} points de données</li>
                            `}
                        </ul>
                    </div>
                    
                    <div class="explanation-section">
                        <h4 class="font-semibold text-green-300 mb-2">Fiabilité de la Prédiction:</h4>
                        <p class="text-gray-200 leading-relaxed">
                            ${details.reliability_explanation || `Cette prédiction est basée sur l'analyse de series temporelles avec TimesFM. 
                            Le niveau de confiance de ${(details.confidence_score * 100).toFixed(1)}% ${details.confidence_score > 0.59 ? 'dépasse' : 'est en-dessous du'} 
                            seuil de trading de 59%, ${details.confidence_score > 0.59 ? 'suggérant une prédiction fiable' : 'nécessitant une analyse supplémentaire'} 
                            pour les décisions de trading automatisées.`}
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Action Recommandée -->
            <div class="recommended-action bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-500/30">
                <h3 class="text-xl font-bold text-white mb-4 flex items-center">
                    <span class="mr-3">⚡</span>
                    Action Recommandée
                </h3>
                
                ${this.generateActionRecommendation(details, crypto)}
            </div>
        `;
    }
    
    generateHistoricalDataTable(historicalData) {
        if (!historicalData || historicalData.length === 0) {
            return '<div class="text-gray-400 text-center py-4">Aucune donnée historique disponible</div>';
        }
        
        return `
            <div class="space-y-2">
                <div class="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-400 border-b border-gray-600 pb-2">
                    <div>Timestamp</div>
                    <div>Prix</div>
                    <div>Volume</div>
                    <div>Variation</div>
                </div>
                ${historicalData.slice(0, 10).map((point, index) => {
                    const variation = index > 0 ? ((point.price - historicalData[index - 1].price) / historicalData[index - 1].price * 100) : 0;
                    return `
                        <div class="grid grid-cols-4 gap-2 text-xs text-gray-200 py-1 hover:bg-gray-700/30 rounded">
                            <div>${new Date(point.timestamp).toLocaleTimeString()}</div>
                            <div class="font-medium">$${point.price?.toLocaleString()}</div>
                            <div>${point.volume ? (point.volume / 1e6).toFixed(1) + 'M' : 'N/A'}</div>
                            <div class="${variation >= 0 ? 'text-green-400' : 'text-red-400'}">
                                ${variation.toFixed(2)}%
                            </div>
                        </div>
                    `;
                }).join('')}
                ${historicalData.length > 10 ? `<div class="text-xs text-gray-400 text-center pt-2">... et ${historicalData.length - 10} autres points</div>` : ''}
            </div>
        `;
    }
    
    generateActionRecommendation(details, crypto) {
        const confidence = details.confidence_score || 0;
        const predictedReturn = details.predicted_return || 0;
        const isHighConfidence = confidence > 0.59;
        
        let action, actionColor, actionIcon, explanation;
        
        if (isHighConfidence && predictedReturn > 0.02) {
            action = 'ACHAT RECOMMANDÉ';
            actionColor = 'text-green-400 bg-green-900/30 border-green-500/50';
            actionIcon = '📈';
            explanation = `Avec une confiance de ${(confidence * 100).toFixed(1)}% et un retour prévu de +${(predictedReturn * 100).toFixed(2)}%, 
            le système recommande un achat. Les conditions de trading automatique sont remplies (confiance > 59% et retour positif significatif).`;
        } else if (isHighConfidence && predictedReturn < -0.02) {
            action = 'VENTE RECOMMANDÉE';
            actionColor = 'text-red-400 bg-red-900/30 border-red-500/50';
            actionIcon = '📉';
            explanation = `Avec une confiance de ${(confidence * 100).toFixed(1)}% et un retour prévu de ${(predictedReturn * 100).toFixed(2)}%, 
            le système recommande une vente ou une position courte. La prédiction indique une baisse probable du prix.`;
        } else if (isHighConfidence && Math.abs(predictedReturn) <= 0.02) {
            action = 'MAINTENIR LA POSITION';
            actionColor = 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
            actionIcon = '➡️';
            explanation = `La prédiction indique une stabilité relative du prix (${(predictedReturn * 100).toFixed(2)}% de variation). 
            Avec une confiance de ${(confidence * 100).toFixed(1)}%, le système recommande de maintenir les positions actuelles.`;
        } else {
            action = 'AUCUNE ACTION';
            actionColor = 'text-gray-400 bg-gray-900/30 border-gray-500/50';
            actionIcon = '⏸️';
            explanation = `Confiance insuffisante (${(confidence * 100).toFixed(1)}% < 59%) pour déclencher une action automatique. 
            Le système recommande d'attendre des signaux plus fiables avant de prendre position.`;
        }
        
        return `
            <div class="action-card ${actionColor} rounded-lg p-4 mb-4">
                <div class="flex items-center space-x-3 mb-3">
                    <span class="text-2xl">${actionIcon}</span>
                    <div>
                        <div class="text-xl font-bold">${action}</div>
                        <div class="text-sm opacity-80">${crypto} - ${new Date().toLocaleString()}</div>
                    </div>
                </div>
            </div>
            
            <div class="explanation-box bg-black/30 rounded-lg p-4">
                <h4 class="font-semibold text-white mb-2">Justification de l'Action:</h4>
                <p class="text-gray-200 text-sm leading-relaxed mb-4">${explanation}</p>
                
                <div class="risk-assessment grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                        <div class="font-medium text-orange-300 mb-1">Évaluation du Risque:</div>
                        <div class="space-y-1">
                            <div class="flex justify-between">
                                <span>Niveau de risque:</span>
                                <span class="${confidence > 0.7 ? 'text-green-400' : confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'}">
                                    ${confidence > 0.7 ? 'Faible' : confidence > 0.5 ? 'Modéré' : 'Élevé'}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span>Volatilité attendue:</span>
                                <span>${Math.abs(predictedReturn * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div class="font-medium text-orange-300 mb-1">Paramètres de Gestion:</div>
                        <div class="space-y-1">
                            <div class="flex justify-between">
                                <span>Stop-Loss suggéré:</span>
                                <span>${Math.abs(predictedReturn * 50).toFixed(1)}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Take-Profit:</span>
                                <span>${Math.abs(predictedReturn * 150).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    closePredictionDetails() {
        const modal = document.getElementById('prediction-details-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restaurer le scroll
            console.log('✅ Modal des détails fermé');
        }
    }
    
    showError(message) {
        console.error('❌ Erreur:', message);
        // Vous pouvez ajouter ici un système de notification toast
    }
    
    showSuccess(message) {
        console.log('✅ Succès:', message);
        // Vous pouvez ajouter ici un système de notification toast
    }
}

// Initialiser l'application au chargement de la page
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EthereumAITradingTerminal();
});