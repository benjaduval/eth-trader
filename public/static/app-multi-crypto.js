/**
 * Ultra-Futuristic Multi-Crypto Trader Dashboard
 * Advanced Real-time Trading Interface with AI Predictions
 * Support ETH & BTC with TimesFM Neural Network Analysis
 */

class CryptoTraderApp {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 seconds
        this.priceChart = null;
        this.isAutoRefreshEnabled = true;
        this.currentCrypto = 'ETH'; // Current crypto (ETH default)
        this.supportedCryptos = ['ETH', 'BTC'];
        this.lastPrices = {}; // Price change tracking
        this.notifications = []; // System notifications
        this.dashboardData = null; // Cache dashboard data
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Ultra-Futuristic Multi-Crypto Dashboard...');
        
        try {
            await this.checkHealth();
            await this.loadSupportedCryptos();
            await this.loadDashboard();
            this.setupAutoRefresh();
            this.setupEventListeners();
            this.initializeParticleEffects();
            
            console.log('✅ Ultra-Futuristic Dashboard initialized successfully');
            this.showNotification('🚀 Dashboard Ready - AI Trading Active', 'success');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Connection error - Retrying...');
            setTimeout(() => this.init(), 5000);
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
            
            if (data.success) {
                this.supportedCryptos = data.cryptos.map(c => c.crypto);
                console.log('💰 Cryptos disponibles:', this.supportedCryptos);
            }
        } catch (error) {
            console.warn('⚠️ Impossible de charger les cryptos supportées:', error);
        }
    }

    async loadDashboard() {
        const loading = document.getElementById('loading');
        const dashboard = document.getElementById('dashboard');
        
        try {
            const response = await fetch(`${this.apiBase}/dashboard?include_market=true&crypto=${this.currentCrypto}`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erreur dashboard');
            }
            
            this.renderDashboard(result.dashboard);
            
            loading.classList.add('hidden');
            dashboard.classList.remove('hidden');
            
        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
            loading.innerHTML = `
                <i class="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                <p class="mt-2 text-red-400">Erreur: ${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                    Réessayer
                </button>
            `;
        }
    }

    renderDashboard(data) {
        const container = document.querySelector('#dashboard .container');
        this.dashboardData = data; // Cache data
        
        // Store last price for change detection
        if (data.current_price && this.lastPrices[this.currentCrypto]) {
            const change = data.current_price - this.lastPrices[this.currentCrypto];
            data.priceChange = change;
            data.priceChangePercent = (change / this.lastPrices[this.currentCrypto]) * 100;
        }
        this.lastPrices[this.currentCrypto] = data.current_price;
        
        container.innerHTML = `
            <!-- Crypto Selector & Quick Actions -->
            <div class="mb-8">
                <div class="glass-card p-6 neon-border">
                    <div class="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
                        <div class="flex items-center space-x-6">
                            <h2 class="text-2xl font-bold neon-text text-blue-400 flex items-center">
                                <i class="fas fa-robot mr-3"></i>
                                AI Trading Control Center
                            </h2>
                            <div class="flex items-center space-x-3">
                                <label class="text-sm text-gray-300 font-medium">Active Crypto:</label>
                                <select id="cryptoSelector" class="bg-gray-800 border border-blue-500/30 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                                    ${this.supportedCryptos.map(crypto => 
                                        `<option value="${crypto}" ${crypto === this.currentCrypto ? 'selected' : ''}>${crypto} ${crypto === 'ETH' ? '📊' : '₿'}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <button onclick="app.generateSignal()" class="holo-btn">
                                <i class="fas fa-magic mr-2"></i>Generate AI Signal
                            </button>
                            <button onclick="app.compareCryptos()" class="holo-btn">
                                <i class="fas fa-balance-scale mr-2"></i>Compare
                            </button>
                            <button onclick="app.toggleAutoRefresh()" class="holo-btn" id="autoRefreshBtn">
                                <i class="fas fa-${this.isAutoRefreshEnabled ? 'pause' : 'play'} mr-2"></i>Auto: ${this.isAutoRefreshEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Metrics Grid -->
            <div class="dashboard-grid mb-8">
                ${this.renderAdvancedMetricCard('Current Price', data.current_price, 'fas fa-coins', 'text-yellow-400', data.priceChange)}
                ${this.renderAdvancedMetricCard('Portfolio Balance', data.current_balance, 'fas fa-wallet', 'text-green-400')}
                ${this.renderAdvancedMetricCard('Active Positions', data.active_positions?.length || 0, 'fas fa-chart-line', 'text-blue-400')}
                ${this.renderAdvancedMetricCard('AI Win Rate', ((data.metrics?.win_rate || 0) * 100).toFixed(1) + '%', 'fas fa-brain', 'text-purple-400')}
            </div>

            <!-- Advanced Analytics Section -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                <!-- TimesFM Predictions -->
                <div class="glass-card p-6 pulse-slow">
                    <h3 class="text-xl font-bold mb-4 flex items-center neon-text text-purple-400">
                        <i class="fas fa-brain mr-3"></i>
                        TimesFM AI Predictions
                    </h3>
                    <div id="predictions-container" class="space-y-4">
                        ${this.renderAdvancedPredictions(data.latest_predictions || [])}
                    </div>
                    <button onclick="app.generatePrediction()" class="mt-4 w-full holo-btn">
                        <i class="fas fa-sync mr-2"></i>Generate New Prediction
                    </button>
                </div>

                <!-- Live Chart -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center neon-text text-green-400">
                        <i class="fas fa-chart-area mr-3"></i>
                        Live ${this.currentCrypto} Chart
                    </h3>
                    <div class="chart-container h-64">
                        <canvas id="priceChart" class="w-full h-full"></canvas>
                    </div>
                    <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div class="text-center p-2 bg-gray-800/50 rounded">
                            <div class="text-gray-400">24h High</div>
                            <div class="text-green-400 font-bold">${data.market_data?.high_24h?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <div class="text-center p-2 bg-gray-800/50 rounded">
                            <div class="text-gray-400">24h Low</div>
                            <div class="text-red-400 font-bold">${data.market_data?.low_24h?.toFixed(2) || 'N/A'}</div>
                        </div>
                        <div class="text-center p-2 bg-gray-800/50 rounded">
                            <div class="text-gray-400">Volume</div>
                            <div class="text-blue-400 font-bold">${data.market_data?.volume_24h ? (data.market_data.volume_24h / 1e6).toFixed(1) + 'M' : 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <!-- System Status & Logs -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center neon-text text-orange-400">
                        <i class="fas fa-server mr-3"></i>
                        System Status & Logs
                    </h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                            <span class="text-sm">Market Data Feed</span>
                            <span class="status-online text-sm">● LIVE</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                            <span class="text-sm">TimesFM Engine</span>
                            <span class="status-online text-sm">● ACTIVE</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                            <span class="text-sm">Auto Trading</span>
                            <span class="status-online text-sm">● ENABLED</span>
                        </div>
                    </div>
                    <button onclick="app.viewLogs()" class="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-list mr-2"></i>View System Logs
                    </button>
                </div>
            </div>

            <!-- Positions & Trading History -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Active Positions -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center neon-text text-blue-400">
                        <i class="fas fa-chart-line mr-3"></i>
                        Active Positions (${data.active_positions?.length || 0})
                    </h3>
                    <div id="positions-container" class="space-y-3">
                        ${this.renderAdvancedPositions(data.active_positions || [])}
                    </div>
                    ${data.active_positions?.length > 0 ? `
                        <button onclick="app.closeAllPositions()" class="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                            <i class="fas fa-times-circle mr-2"></i>Close All Positions
                        </button>
                    ` : ''}
                </div>

                <!-- Recent Trades -->
                <div class="glass-card p-6">
                    <h3 class="text-xl font-bold mb-4 flex items-center neon-text text-cyan-400">
                        <i class="fas fa-history mr-3"></i>
                        Recent Trades
                    </h3>
                    <div class="futuristic-table">
                        ${this.renderAdvancedTrades(data.recent_trades || [])}
                    </div>
                </div>
            </div>

            <!-- Performance Analytics -->
            <div class="glass-card p-6 mb-8">
                <h3 class="text-xl font-bold mb-6 flex items-center neon-text text-indigo-400">
                    <i class="fas fa-analytics mr-3"></i>
                    Performance Analytics Dashboard
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                    ${this.renderPerformanceMetrics(data.metrics || {})}
                </div>
            </div>
        `;

        // Setup interactions
        this.setupCryptoSelector();
        this.loadAdvancedChart(data);
        this.updateRealTimeElements();
    }

    setupCryptoSelector() {
        const selector = document.getElementById('cryptoSelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.switchCrypto(e.target.value);
            });
        }
    }

    async switchCrypto(newCrypto) {
        if (newCrypto !== this.currentCrypto) {
            console.log(`🔄 Switching from ${this.currentCrypto} to ${newCrypto}`);
            this.currentCrypto = newCrypto;
            await this.refreshData();
        }
    }

    async compareCryptos() {
        try {
            const response = await fetch(`${this.apiBase}/cryptos/compare`);
            const data = await response.json();
            
            if (data.success) {
                this.showComparisonModal(data.comparisons);
            }
        } catch (error) {
            console.error('Erreur comparaison:', error);
            this.showError('Impossible de comparer les cryptos');
        }
    }

    showComparisonModal(comparisons) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Comparaison Cryptos</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${comparisons.map(crypto => `
                        <div class="bg-gray-700 rounded p-4">
                            <h4 class="font-bold text-lg mb-2">${crypto.crypto}</h4>
                            <div class="space-y-2 text-sm">
                                <div>Prix: <span class="text-green-400">$${crypto.price.toFixed(2)}</span></div>
                                <div>Change 24h: <span class="${crypto.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}">${crypto.change_24h.toFixed(2)}%</span></div>
                                <div>Market Cap: $${(crypto.market_cap / 1e9).toFixed(2)}B</div>
                                <div>Volume 24h: $${(crypto.volume_24h / 1e6).toFixed(2)}M</div>
                            </div>
                            <button onclick="app.switchCrypto('${crypto.crypto}'); this.closest('.fixed').remove();" class="mt-3 w-full bg-blue-600 hover:bg-blue-700 rounded py-2 text-sm">
                                Analyser ${crypto.crypto}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async generateSignal() {
        const button = document.querySelector('button[onclick="app.generateSignal()"]');
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...';
            button.disabled = true;

            const response = await fetch(`${this.apiBase}/trading/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crypto: this.currentCrypto })
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess(`Signal ${this.currentCrypto} généré: ${result.signal?.action || 'HOLD'}`);
                if (result.trade) {
                    this.showSuccess(`Trade exécuté: ${result.trade.side} à $${result.trade.entry_price}`);
                }
                await this.refreshData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError(`Erreur génération signal: ${error.message}`);
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async refreshData() {
        console.log(`🔄 Actualisation des données ${this.currentCrypto}...`);
        await this.loadDashboard();
    }

    // Ultra-futuristic rendering methods with advanced animations
    
    renderAdvancedMetricCard(title, value, icon, colorClass, change = null) {
        const changeIndicator = change !== null ? (
            change > 0 ? `<span class="price-up text-xs ml-2">+${change.toFixed(2)}</span>` :
            change < 0 ? `<span class="price-down text-xs ml-2">${change.toFixed(2)}</span>` :
            `<span class="price-neutral text-xs ml-2">±0.00</span>`
        ) : '';

        const formattedValue = typeof value === 'number' && value >= 1000 ? 
            value >= 1000000 ? `$${(value / 1000000).toFixed(2)}M` : `$${(value / 1000).toFixed(2)}K` : 
            typeof value === 'number' ? `$${value.toFixed(2)}` : value;

        return `
            <div class="metric-card glass-card pulse-slow">
                <div class="flex items-center justify-between mb-3">
                    <div class="p-3 ${colorClass} bg-opacity-20 rounded-xl neon-border">
                        <i class="${icon} text-2xl ${colorClass}"></i>
                    </div>
                    ${change !== null ? '<div class="text-right">' + changeIndicator + '</div>' : ''}
                </div>
                <div>
                    <p class="text-sm text-gray-400 font-medium">${title}</p>
                    <p class="text-3xl font-bold neon-text ${colorClass} mt-1">${formattedValue}</p>
                </div>
            </div>
        `;
    }

    renderAdvancedPredictions(predictions) {
        if (!predictions || predictions.length === 0) {
            return `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-brain text-4xl mb-4 opacity-50"></i>
                    <p>No AI predictions available</p>
                    <p class="text-xs mt-2">Generate a new prediction to see TimesFM analysis</p>
                </div>
            `;
        }

        return predictions.slice(0, 3).map((pred, index) => `
            <div class="bg-gray-800/60 rounded-lg p-4 border border-purple-500/30 hover:border-purple-500/60 transition-all">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-sm font-bold text-purple-400">#${index + 1} ${pred.symbol}</span>
                    <span class="text-xs text-gray-400">${new Date(pred.timestamp).toLocaleString()}</span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <div class="text-gray-400">Predicted Price</div>
                        <div class="text-lg font-bold text-blue-400">$${pred.predicted_price?.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Expected Return</div>
                        <div class="text-lg font-bold ${(pred.predicted_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                            ${((pred.predicted_return || 0) * 100).toFixed(2)}%
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-400">AI Confidence</div>
                        <div class="flex items-center">
                            <div class="text-sm font-bold text-purple-400">${((pred.confidence_score || 0) * 100).toFixed(1)}%</div>
                            <div class="ml-2 w-12 h-1 bg-gray-700 rounded">
                                <div class="h-full bg-purple-400 rounded" style="width: ${(pred.confidence_score || 0) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-400">Horizon</div>
                        <div class="text-sm font-bold text-yellow-400">${pred.horizon_hours}h</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAdvancedPositions(positions) {
        if (!positions || positions.length === 0) {
            return `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
                    <p>No active positions</p>
                    <p class="text-xs mt-2">Generate a signal to start trading</p>
                </div>
            `;
        }

        return positions.map(pos => `
            <div class="bg-gray-800/60 rounded-lg p-4 border ${pos.side === 'buy' ? 'border-green-500/30' : 'border-red-500/30'} hover:border-blue-500/60 transition-all">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-bold">${pos.symbol}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${pos.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}">
                        ${pos.side.toUpperCase()}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                        <div class="text-gray-400">Entry Price</div>
                        <div class="font-bold">$${pos.entry_price?.toFixed(2)}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Quantity</div>
                        <div class="font-bold">${pos.quantity?.toFixed(6)}</div>
                    </div>
                    <div>
                        <div class="text-gray-400">Unrealized P&L</div>
                        <div class="font-bold ${(pos.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                            $${(pos.unrealized_pnl || 0).toFixed(2)}
                        </div>
                    </div>
                    <div>
                        <div class="text-gray-400">Duration</div>
                        <div class="font-bold text-blue-400">${this.formatDuration(pos.created_at)}</div>
                    </div>
                </div>
                <button onclick="app.closePosition(${pos.id})" class="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                    <i class="fas fa-times mr-1"></i>Close Position
                </button>
            </div>
        `).join('');
    }

    renderAdvancedTrades(trades) {
        if (!trades || trades.length === 0) {
            return `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-history text-4xl mb-4 opacity-50"></i>
                    <p>No recent trades</p>
                </div>
            `;
        }

        return `
            <div class="space-y-2">
                ${trades.slice(0, 8).map(trade => `
                    <div class="table-row p-3 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                            <span class="w-12 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                trade.side === 'buy' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                            }">
                                ${trade.side?.toUpperCase()}
                            </span>
                            <div>
                                <div class="font-medium">${trade.symbol}</div>
                                <div class="text-xs text-gray-400">${new Date(trade.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold ${(trade.realized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                                ${(trade.realized_pnl || 0) >= 0 ? '+' : ''}$${(trade.realized_pnl || 0).toFixed(2)}
                            </div>
                            <div class="text-xs text-gray-400">@$${trade.entry_price?.toFixed(2)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPerformanceMetrics(metrics) {
        const metricsData = [
            { label: 'Total P&L', value: `$${(metrics.total_pnl || 0).toFixed(2)}`, color: (metrics.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400', icon: 'fas fa-dollar-sign' },
            { label: 'Win Rate', value: `${((metrics.win_rate || 0) * 100).toFixed(1)}%`, color: 'text-blue-400', icon: 'fas fa-percentage' },
            { label: 'Total Trades', value: metrics.total_trades || 0, color: 'text-cyan-400', icon: 'fas fa-exchange-alt' },
            { label: 'Avg Return', value: `${((metrics.avg_return || 0) * 100).toFixed(2)}%`, color: 'text-purple-400', icon: 'fas fa-chart-line' },
            { label: 'Sharpe Ratio', value: (metrics.sharpe_ratio || 0).toFixed(3), color: 'text-yellow-400', icon: 'fas fa-calculator' },
            { label: 'Max Drawdown', value: `${((metrics.max_drawdown || 0) * 100).toFixed(1)}%`, color: 'text-red-400', icon: 'fas fa-arrow-down' },
            { label: 'Profit Factor', value: (metrics.profit_factor || 0).toFixed(2), color: 'text-green-400', icon: 'fas fa-trophy' },
            { label: 'Best Trade', value: `$${(metrics.best_trade || 0).toFixed(2)}`, color: 'text-emerald-400', icon: 'fas fa-star' }
        ];

        return metricsData.map(metric => `
            <div class="text-center p-4 bg-gray-800/40 rounded-lg border border-gray-700/50 hover:border-blue-500/30 transition-all">
                <div class="mb-2">
                    <i class="${metric.icon} text-lg ${metric.color}"></i>
                </div>
                <div class="text-lg font-bold ${metric.color} neon-text">${metric.value}</div>
                <div class="text-xs text-gray-400 mt-1">${metric.label}</div>
            </div>
        `).join('');
    }

    renderPredictions(predictions) {
        if (!predictions || predictions.length === 0) {
            return '<p class="text-gray-400">Aucune prédiction disponible</p>';
        }

        return predictions.map(pred => `
            <div class="mb-4 p-4 bg-gray-700 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">${pred.symbol}</span>
                    <span class="text-sm text-gray-400">${new Date(pred.timestamp).toLocaleString()}</span>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>Prix prédit: <span class="text-blue-400">$${pred.predicted_price?.toFixed(2)}</span></div>
                    <div>Retour: <span class="${(pred.predicted_return || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">${((pred.predicted_return || 0) * 100).toFixed(2)}%</span></div>
                    <div>Confiance: <span class="text-purple-400">${((pred.confidence_score || 0) * 100).toFixed(1)}%</span></div>
                    <div>Horizon: <span class="text-yellow-400">${pred.horizon_hours}h</span></div>
                </div>
            </div>
        `).join('');
    }

    renderPositions(positions) {
        if (!positions || positions.length === 0) {
            return '<p class="text-gray-400">Aucune position ouverte</p>';
        }

        return positions.map(pos => `
            <div class="mb-4 p-4 bg-gray-700 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">${pos.symbol}</span>
                    <span class="px-2 py-1 rounded text-xs ${pos.side === 'buy' ? 'bg-green-600' : 'bg-red-600'}">${pos.side.toUpperCase()}</span>
                </div>
                <div class="text-sm space-y-1">
                    <div>Prix d'entrée: $${pos.entry_price?.toFixed(2)}</div>
                    <div>Quantité: ${pos.quantity?.toFixed(6)}</div>
                    <div class="flex justify-between">
                        <span>P&L: <span class="${(pos.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">${pos.unrealized_pnl?.toFixed(2) || '0.00'}$</span></span>
                        <button onclick="app.closePosition(${pos.id})" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">Fermer</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRecentTrades(trades) {
        if (!trades || trades.length === 0) {
            return '<p class="text-gray-400">Aucun trade récent</p>';
        }

        return trades.slice(0, 5).map(trade => `
            <div class="mb-3 p-3 bg-gray-700 rounded-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium">${trade.symbol}</span>
                    <span class="text-xs text-gray-400">${new Date(trade.timestamp).toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}">${trade.side.toUpperCase()}</span>
                    <span class="${(trade.realized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">${trade.realized_pnl?.toFixed(2) || '0.00'}$</span>
                </div>
            </div>
        `).join('');
    }

    renderDetailedMetrics(metrics) {
        const metricsData = [
            { label: 'P&L Total', value: `$${(metrics.total_pnl || 0).toFixed(2)}`, color: (metrics.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: 'Sharpe Ratio', value: (metrics.sharpe_ratio || 0).toFixed(2), color: 'text-blue-400' },
            { label: 'Max Drawdown', value: `${((metrics.max_drawdown || 0) * 100).toFixed(1)}%`, color: 'text-red-400' },
            { label: 'Profit Factor', value: (metrics.profit_factor || 0).toFixed(2), color: 'text-purple-400' }
        ];

        return metricsData.map(metric => `
            <div class="text-center">
                <div class="text-lg font-bold ${metric.color}">${metric.value}</div>
                <div class="text-sm text-gray-400">${metric.label}</div>
            </div>
        `).join('');
    }

    // ... Autres méthodes utilitaires ...
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check' : 'fa-exclamation-triangle'} mr-2"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    setupAutoRefresh() {
        if (this.isAutoRefreshEnabled) {
            setTimeout(() => {
                this.refreshData();
                this.setupAutoRefresh();
            }, this.refreshInterval);
        }
    }

    setupEventListeners() {
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.generateSignal();
            } else if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
        });
    }

    toggleAutoRefresh() {
        this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
        const btn = document.getElementById('autoRefreshBtn');
        if (btn) {
            btn.innerHTML = `<i class="fas fa-${this.isAutoRefreshEnabled ? 'pause' : 'play'} mr-2"></i>Auto-Refresh: ${this.isAutoRefreshEnabled ? 'ON' : 'OFF'}`;
        }
        
        if (this.isAutoRefreshEnabled) {
            this.setupAutoRefresh();
        }
    }

    async closePosition(positionId) {
        try {
            const response = await fetch(`${this.apiBase}/trading/positions/${positionId}/close`, {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Position fermée avec succès');
                await this.refreshData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError(`Erreur fermeture position: ${error.message}`);
        }
    }

    // Advanced utility methods
    formatDuration(timestamp) {
        const diff = Date.now() - new Date(timestamp).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    initializeParticleEffects() {
        // Enhanced particle system already handled in HTML
        console.log('🎨 Particle effects initialized');
    }

    updateRealTimeElements() {
        // Update timestamps and live data
        setInterval(() => {
            document.querySelectorAll('[data-timestamp]').forEach(el => {
                const timestamp = el.getAttribute('data-timestamp');
                el.textContent = this.formatDuration(timestamp);
            });
        }, 60000); // Update every minute
    }

    async loadAdvancedChart(data) {
        console.log(`📊 Loading advanced ${this.currentCrypto} chart with AI predictions...`);
        
        try {
            const canvas = document.getElementById('priceChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Get historical data for chart
            const historyResponse = await fetch(`${this.apiBase}/market/history?crypto=${this.currentCrypto}&limit=24`);
            const historyData = await historyResponse.json();
            
            if (historyData.success && historyData.data.length > 0) {
                this.renderAdvancedChart(ctx, historyData.data, data.latest_predictions || []);
            }
        } catch (error) {
            console.error('Chart loading error:', error);
        }
    }

    renderAdvancedChart(ctx, priceData, predictions) {
        const canvas = ctx.canvas;
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        if (priceData.length === 0) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Extract prices and find min/max
        const prices = priceData.map(d => d.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;

        // Draw grid
        ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw price line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();

        prices.forEach((price, index) => {
            const x = (width / (prices.length - 1)) * index;
            const y = height - ((price - minPrice) / priceRange) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Add glow effect
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw price points
        ctx.fillStyle = '#3b82f6';
        prices.forEach((price, index) => {
            const x = (width / (prices.length - 1)) * index;
            const y = height - ((price - minPrice) / priceRange) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw prediction indicators
        if (predictions.length > 0) {
            const latestPred = predictions[0];
            if (latestPred.predicted_price) {
                const predY = height - ((latestPred.predicted_price - minPrice) / priceRange) * height;
                
                // Prediction line
                ctx.strokeStyle = '#8b5cf6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(width * 0.8, predY);
                ctx.lineTo(width, predY);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Prediction label
                ctx.fillStyle = '#8b5cf6';
                ctx.font = '12px Inter, sans-serif';
                ctx.fillText(`Pred: $${latestPred.predicted_price.toFixed(2)}`, width - 100, predY - 10);
            }
        }
    }

    // Enhanced interaction methods
    async generatePrediction() {
        try {
            this.showNotification('🧠 Generating AI prediction...', 'info');
            
            const response = await fetch(`${this.apiBase}/predictions/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    crypto: this.currentCrypto,
                    horizon: 24 
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`🎯 AI Prediction Complete: ${result.prediction.predicted_return > 0 ? '📈' : '📉'} ${(result.prediction.predicted_return * 100).toFixed(2)}%`, 'success');
                await this.refreshData();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showError(`Prediction failed: ${error.message}`);
        }
    }

    async closeAllPositions() {
        if (!confirm('Close all active positions? This action cannot be undone.')) return;
        
        try {
            const positions = this.dashboardData?.active_positions || [];
            
            for (const position of positions) {
                await this.closePosition(position.id);
            }
            
            this.showNotification('🔄 All positions closed successfully', 'success');
            await this.refreshData();
        } catch (error) {
            this.showError(`Failed to close all positions: ${error.message}`);
        }
    }

    async viewLogs() {
        try {
            const response = await fetch(`${this.apiBase}/logs/timesfm?limit=20`);
            const data = await response.json();
            
            if (data.success) {
                this.showLogsModal(data.logs);
            }
        } catch (error) {
            this.showError('Failed to load system logs');
        }
    }

    showLogsModal(logs) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="glass-card max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 class="text-xl font-bold neon-text text-blue-400">🖥️ System Logs</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-96">
                    <div class="space-y-2 font-mono text-sm">
                        ${logs.map(log => `
                            <div class="flex items-start space-x-3 p-2 rounded ${
                                log.level === 'ERROR' ? 'bg-red-900/20' : 
                                log.level === 'WARN' ? 'bg-yellow-900/20' : 
                                'bg-gray-800/50'
                            }">
                                <span class="text-xs text-gray-400 w-20">${new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span class="text-xs ${
                                    log.level === 'ERROR' ? 'text-red-400' : 
                                    log.level === 'WARN' ? 'text-yellow-400' : 
                                    'text-green-400'
                                } w-12">${log.level}</span>
                                <span class="text-xs text-blue-400 w-20">${log.component}</span>
                                <span class="text-gray-300 flex-1">${log.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Initialize the ultra-futuristic application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CryptoTraderApp();
});