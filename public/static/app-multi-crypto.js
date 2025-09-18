/**
 * Frontend JavaScript pour Multi-Crypto Trader Dashboard
 * Interface de trading en temps réel avec métriques et graphiques
 * Support ETH et BTC avec TimesFM Analysis
 */

class CryptoTraderApp {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 secondes
        this.priceChart = null;
        this.isAutoRefreshEnabled = true;
        this.currentCrypto = 'ETH'; // Crypto actuelle (ETH par défaut)
        this.supportedCryptos = ['ETH', 'BTC'];
        
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation Multi-Crypto Trader Dashboard...');
        
        try {
            await this.checkHealth();
            await this.loadSupportedCryptos();
            await this.loadDashboard();
            this.setupAutoRefresh();
            this.setupEventListeners();
            
            console.log('✅ Dashboard initialisé avec succès');
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
        const dashboard = document.getElementById('dashboard');
        
        dashboard.innerHTML = `
            <!-- Sélecteur de crypto -->
            <div class="mb-6">
                <div class="bg-gray-800 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-bold flex items-center">
                            <i class="fas fa-coins mr-2 text-yellow-400"></i>
                            Multi-Crypto Trading Dashboard
                        </h2>
                        <div class="flex items-center space-x-4">
                            <label class="text-sm text-gray-300">Crypto:</label>
                            <select id="cryptoSelector" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white focus:border-blue-500">
                                ${this.supportedCryptos.map(crypto => 
                                    `<option value="${crypto}" ${crypto === this.currentCrypto ? 'selected' : ''}>${crypto}</option>`
                                ).join('')}
                            </select>
                            <button onclick="app.compareCryptos()" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">
                                <i class="fas fa-balance-scale mr-1"></i>Comparer
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Header avec métriques principales -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                ${this.renderMetricCard(`Prix ${this.currentCrypto}`, `$${data.current_price?.toFixed(2) || '0'}`, 'fas fa-coins', 'text-yellow-400')}
                ${this.renderMetricCard('Balance', `$${data.current_balance?.toFixed(2) || '10000'}`, 'fas fa-wallet', 'text-green-400')}
                ${this.renderMetricCard('Positions', data.active_positions?.length || 0, 'fas fa-chart-line', 'text-blue-400')}
                ${this.renderMetricCard('Win Rate', `${((data.metrics?.win_rate || 0) * 100).toFixed(1)}%`, 'fas fa-trophy', 'text-purple-400')}
            </div>

            <!-- Actions rapides -->
            <div class="mb-8">
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-bolt mr-2 text-yellow-400"></i>
                        Actions Rapides
                    </h2>
                    <div class="flex flex-wrap gap-4">
                        <button onclick="app.generateSignal()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-magic mr-2"></i>Générer Signal ${this.currentCrypto}
                        </button>
                        <button onclick="app.refreshData()" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-sync mr-2"></i>Actualiser
                        </button>
                        <button onclick="app.toggleAutoRefresh()" class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors" id="autoRefreshBtn">
                            <i class="fas fa-pause mr-2"></i>Auto-Refresh: ON
                        </button>
                        <button onclick="app.switchCrypto('${this.currentCrypto === 'ETH' ? 'BTC' : 'ETH}')" class="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-exchange-alt mr-2"></i>Passer à ${this.currentCrypto === 'ETH' ? 'BTC' : 'ETH'}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Graphique des prix et prédictions -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-chart-area mr-2 text-green-400"></i>
                        Prix ${this.currentCrypto} (24h)
                    </h2>
                    <div class="relative h-64">
                        <canvas id="priceChart"></canvas>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-brain mr-2 text-purple-400"></i>
                        Prédictions TimesFM - ${this.currentCrypto}
                    </h2>
                    <div id="predictions">
                        ${this.renderPredictions(data.latest_predictions || [])}
                    </div>
                </div>
            </div>

            <!-- Positions ouvertes et historique -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-chart-line mr-2 text-blue-400"></i>
                        Positions Ouvertes
                    </h2>
                    <div id="positions">
                        ${this.renderPositions(data.active_positions || [])}
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-history mr-2 text-orange-400"></i>
                        Trades Récents
                    </h2>
                    <div id="recent-trades">
                        ${this.renderRecentTrades(data.recent_trades || [])}
                    </div>
                </div>
            </div>

            <!-- Métriques détaillées -->
            <div class="bg-gray-800 rounded-lg p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-analytics mr-2 text-indigo-400"></i>
                    Métriques de Performance (30j)
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${this.renderDetailedMetrics(data.metrics || {})}
                </div>
            </div>
        `;

        // Setup du sélecteur de crypto après le rendu
        this.setupCryptoSelector();
        
        // Charger le graphique
        this.loadPriceChart();
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

    // ... Conserver toutes les autres méthodes existantes (renderMetricCard, setupEventListeners, etc.)
    
    renderMetricCard(title, value, icon, colorClass) {
        return `
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center">
                    <div class="p-2 ${colorClass} bg-opacity-20 rounded-lg">
                        <i class="${icon} text-xl ${colorClass}"></i>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm text-gray-400">${title}</p>
                        <p class="text-2xl font-bold">${value}</p>
                    </div>
                </div>
            </div>
        `;
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

    async loadPriceChart() {
        // Implémentation du graphique de prix à ajouter si nécessaire
        console.log(`📊 Loading ${this.currentCrypto} price chart...`);
    }
}

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CryptoTraderApp();
});