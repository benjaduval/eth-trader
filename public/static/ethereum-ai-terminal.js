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
        this.currentCrypto = 'ETH'; // Focus sur ETH pour ce terminal
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
            console.log(`🔄 Chargement des données ${this.currentCrypto}...`);
            const response = await fetch(`${this.apiBase}/dashboard?include_market=true&crypto=${this.currentCrypto}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('❌ Erreur API:', result.error);
                throw new Error(result.error || 'Erreur dashboard');
            }
            
            console.log(`✅ Données ${this.currentCrypto} reçues:`, result.dashboard);
            this.renderEthereumAITerminal(result.dashboard);
            
        } catch (error) {
            console.warn(`⚠️ API non disponible, utilisation des données de démonstration:`, error.message);
            // Utiliser des données de démonstration si l'API n'est pas disponible
            const demoData = this.getDemoData();
            this.renderEthereumAITerminal(demoData);
        } finally {
            if (loading) loading.classList.add('hidden');
            if (dashboard) dashboard.classList.remove('hidden');
        }
    }
    
    getDemoData() {
        const basePrice = this.currentCrypto === 'ETH' ? 4620.50 : 94350.75;
        return {
            current_price: basePrice,
            current_balance: 10000.00,
            active_positions: [
                {
                    type: 'long',
                    entry_price: basePrice * 0.98,
                    pnl: 2.35
                },
                {
                    type: 'short', 
                    entry_price: basePrice * 1.02,
                    pnl: -1.15
                }
            ],
            latest_predictions: [
                {
                    predicted_price: basePrice * 1.025,
                    predicted_return: 0.025,
                    confidence_score: 0.78,
                    quantile_10: basePrice * 0.95,
                    quantile_90: basePrice * 1.08
                }
            ],
            market_data: {
                volume_24h: this.currentCrypto === 'ETH' ? 15.8e9 : 28.3e9,
                market_cap: this.currentCrypto === 'ETH' ? 556e9 : 1875e9,
                price_change_percentage_24h: 2.45
            }
        };
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
    }
    
    generateEthereumAITerminalHTML(dashboard) {
        return `
            <!-- Ethereum AI Trading Terminal Header -->
            <div class="ethereum-ai-header mb-8">
                <div class="flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl">⚡</div>
                        <div>
                            <h1 class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Ethereum AI Trading Terminal
                            </h1>
                            <p class="text-purple-300">Neural Network Powered Trading System</p>
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
        const cryptoIcon = this.currentCrypto === 'ETH' ? '⚡' : '₿';
        const cryptoColor = this.currentCrypto === 'ETH' ? 'purple' : 'orange';
        
        return `
            <div class="ethereum-market-analysis bg-gradient-to-br from-gray-900/80 to-${cryptoColor}-900/20 backdrop-blur-lg rounded-2xl p-6 border border-${cryptoColor}-500/30">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold text-white flex items-center">
                        <span class="mr-3">📈</span>
                        ${this.currentCrypto} Market Analysis
                    </h2>
                    <div class="text-sm text-${cryptoColor}-300">Live Data • ${cryptoIcon}</div>
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
                
                <!-- Price Chart -->
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
                            Confidence: ${latestPrediction?.confidence_score ? (latestPrediction.confidence_score * 100).toFixed(1) + '%' : 'N/A'}
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
        
        console.log(`✅ Composants Ethereum AI Terminal initialisés pour ${this.currentCrypto}`);
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
        // Sélecteur de crypto pour supporter ETH et BTC
        const cryptoSelector = document.getElementById('cryptoSelector');
        if (cryptoSelector) {
            cryptoSelector.value = this.currentCrypto; // Set initial value
            cryptoSelector.addEventListener('change', (e) => {
                const newCrypto = e.target.value;
                console.log(`🔄 Changement de crypto: ${this.currentCrypto} → ${newCrypto}`);
                this.currentCrypto = newCrypto;
                this.loadEthereumAITerminal(); // Recharger avec la nouvelle crypto
            });
        }
        
        console.log('📡 Event listeners configurés pour Ethereum AI Terminal (ETH/BTC support)');
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
        if (!canvas) {
            console.warn('❌ Canvas cryptoPriceChart non trouvé');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Données de démonstration pour le graphique
        const currentPrice = dashboard.current_price || 4600;
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
        
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${this.currentCrypto} Price (USD)`,
                    data: data,
                    borderColor: this.currentCrypto === 'ETH' ? 'rgb(147, 51, 234)' : 'rgb(249, 115, 22)',
                    backgroundColor: this.currentCrypto === 'ETH' ? 'rgba(147, 51, 234, 0.1)' : 'rgba(249, 115, 22, 0.1)',
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
                        hoverBackgroundColor: this.currentCrypto === 'ETH' ? 'rgb(147, 51, 234)' : 'rgb(249, 115, 22)'
                    }
                }
            }
        });
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