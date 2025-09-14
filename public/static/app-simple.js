/**
 * Version simplifiée du Frontend JavaScript pour ETH Trader Dashboard
 */

class ETHTraderApp {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 secondes
        this.isAutoRefreshEnabled = true;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initialisation ETH Trader Dashboard...');
        
        try {
            await this.checkHealth();
            await this.loadDashboard();
            this.setupAutoRefresh();
            
            console.log('✅ Dashboard initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showError('Erreur de connexion au serveur');
        }
    }

    async checkHealth() {
        const response = await fetch(this.apiBase + '/health');
        const data = await response.json();
        
        if (data.status !== 'healthy') {
            throw new Error('Service indisponible');
        }
        
        console.log('✅ Service healthy:', data);
    }

    async loadDashboard() {
        const loading = document.getElementById('loading');
        const dashboard = document.getElementById('dashboard');
        
        try {
            const response = await fetch(this.apiBase + '/dashboard');
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Erreur dashboard');
            }
            
            this.renderDashboard(result.dashboard);
            
            if (loading) loading.style.display = 'none';
            if (dashboard) dashboard.style.display = 'block';
            
        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
            if (loading) {
                loading.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                        <p class="mt-2 text-red-400">Erreur: ${error.message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                            Réessayer
                        </button>
                    </div>
                `;
            }
        }
    }

    renderDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        
        const currentPrice = data.current_price || 0;
        const currentBalance = data.current_balance || 10000;
        const activePositions = data.active_positions || [];
        const metrics = data.metrics || {};
        const recentTrades = data.recent_trades || [];
        const latestPredictions = data.latest_predictions || [];

        dashboard.innerHTML = `
            <!-- Header avec métriques principales -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                ${this.renderMetricCard('Prix ETH', '$' + currentPrice.toFixed(2), 'fas fa-coins', 'text-yellow-400')}
                ${this.renderMetricCard('Balance', '$' + currentBalance.toFixed(2), 'fas fa-wallet', 'text-green-400')}
                ${this.renderMetricCard('Positions', activePositions.length, 'fas fa-chart-line', 'text-blue-400')}
                ${this.renderMetricCard('Win Rate', ((metrics.win_rate || 0) * 100).toFixed(1) + '%', 'fas fa-trophy', 'text-purple-400')}
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
                            <i class="fas fa-magic mr-2"></i>Générer Signal
                        </button>
                        <button onclick="app.refreshData()" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-sync mr-2"></i>Actualiser
                        </button>
                        <button onclick="app.toggleAutoRefresh()" class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors" id="autoRefreshBtn">
                            <i class="fas fa-pause mr-2"></i>Auto-Refresh: ON
                        </button>
                    </div>
                </div>
            </div>

            <!-- Données principales -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Positions ouvertes -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-list mr-2 text-green-400"></i>
                        Positions Ouvertes
                    </h2>
                    <div id="activePositions" class="space-y-3">
                        ${this.renderActivePositions(activePositions)}
                    </div>
                </div>

                <!-- Prédictions -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-crystal-ball mr-2 text-purple-400"></i>
                        Prédictions TimesFM
                    </h2>
                    <div id="predictions" class="space-y-3">
                        ${this.renderPredictions(latestPredictions)}
                    </div>
                </div>
            </div>

            <!-- Trades récents et métriques -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Trades récents -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-history mr-2 text-indigo-400"></i>
                        Trades Récents
                    </h2>
                    <div id="recentTrades" class="space-y-3">
                        ${this.renderRecentTrades(recentTrades)}
                    </div>
                </div>

                <!-- Métriques de performance -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-analytics mr-2 text-red-400"></i>
                        Métriques (30j)
                    </h2>
                    ${this.renderPerformanceMetrics(metrics)}
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-gray-400 text-sm">
                Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}
            </div>
        `;
    }

    renderMetricCard(title, value, icon, iconColor) {
        return `
            <div class="bg-gray-800 rounded-lg p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-400 text-sm">${title}</p>
                        <p class="text-2xl font-bold">${value}</p>
                    </div>
                    <i class="${icon} text-3xl ${iconColor}"></i>
                </div>
            </div>
        `;
    }

    renderActivePositions(positions) {
        if (!positions.length) {
            return '<p class="text-gray-400 text-center py-8">Aucune position ouverte</p>';
        }

        return positions.map(pos => `
            <div class="bg-gray-700 rounded p-4 flex justify-between items-center">
                <div>
                    <span class="font-medium ${pos.side === 'long' ? 'text-green-400' : 'text-red-400'}">
                        ${pos.side ? pos.side.toUpperCase() : 'UNKNOWN'} ${(pos.quantity || 0).toFixed(4)} ETH
                    </span>
                    <p class="text-sm text-gray-400">
                        Entrée: $${(pos.entry_price || 0).toFixed(2)}
                    </p>
                </div>
                <button onclick="app.closePosition(${pos.id})" 
                        class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
                    Fermer
                </button>
            </div>
        `).join('');
    }

    renderPredictions(predictions) {
        if (!predictions.length) {
            return '<p class="text-gray-400 text-center py-8">Aucune prédiction disponible</p>';
        }

        return predictions.map(pred => `
            <div class="bg-gray-700 rounded p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-medium">Prix prédit: $${(pred.predicted_price || 0).toFixed(2)}</span>
                        <p class="text-sm text-gray-400">
                            Retour: ${((pred.predicted_return || 0) * 100).toFixed(2)}% 
                            | Confiance: ${((pred.confidence_score || 0) * 100).toFixed(1)}%
                        </p>
                        <p class="text-xs text-gray-500">
                            Horizon: ${pred.horizon_hours || 0}h
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRecentTrades(trades) {
        if (!trades.length) {
            return '<p class="text-gray-400 text-center py-8">Aucun trade récent</p>';
        }

        return trades.map(trade => `
            <div class="bg-gray-700 rounded p-4">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-medium ${(trade.net_pnl || 0) > 0 ? 'text-green-400' : 'text-red-400'}">
                            ${trade.side ? trade.side.toUpperCase() : 'UNKNOWN'} ${(trade.quantity || 0).toFixed(4)} ETH
                        </span>
                        <p class="text-sm text-gray-400">
                            ${(trade.entry_price || 0).toFixed(2)} → ${(trade.exit_price || 0).toFixed(2)}
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="font-medium ${(trade.net_pnl || 0) > 0 ? 'text-green-400' : 'text-red-400'}">
                            ${(trade.net_pnl || 0) >= 0 ? '+' : ''}$${(trade.net_pnl || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPerformanceMetrics(metrics) {
        return `
            <div class="grid grid-cols-2 gap-6">
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-400">${metrics.total_trades || 0}</p>
                    <p class="text-sm text-gray-400">Total Trades</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-green-400">${((metrics.win_rate || 0) * 100).toFixed(1)}%</p>
                    <p class="text-sm text-gray-400">Win Rate</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold ${(metrics.net_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                        $${(metrics.net_pnl || 0).toFixed(2)}
                    </p>
                    <p class="text-sm text-gray-400">P&L Net</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-red-400">${((metrics.max_drawdown || 0) * 100).toFixed(1)}%</p>
                    <p class="text-sm text-gray-400">Max DD</p>
                </div>
            </div>
        `;
    }

    async generateSignal() {
        const button = event.target;
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Génération...';
            button.disabled = true;
            
            const response = await fetch(this.apiBase + '/trading/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    'Signal généré: ' + result.signal.action.toUpperCase() + ' ' +
                    '(Confiance: ' + (result.signal.confidence * 100).toFixed(1) + '%)',
                    'success'
                );
                
                setTimeout(() => this.refreshData(), 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Erreur: ' + error.message, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async closePosition(tradeId) {
        if (!confirm('Êtes-vous sûr de vouloir fermer cette position ?')) {
            return;
        }
        
        try {
            const response = await fetch(this.apiBase + '/trading/positions/' + tradeId + '/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    'Position fermée - P&L: $' + (result.trade.net_pnl || 0).toFixed(2),
                    (result.trade.net_pnl || 0) >= 0 ? 'success' : 'error'
                );
                
                setTimeout(() => this.refreshData(), 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Erreur fermeture: ' + error.message, 'error');
        }
    }

    async refreshData() {
        console.log('🔄 Actualisation des données...');
        
        try {
            const response = await fetch(this.apiBase + '/dashboard');
            const result = await response.json();
            
            if (result.success) {
                this.renderDashboard(result.dashboard);
                console.log('✅ Données actualisées');
            }
        } catch (error) {
            console.error('❌ Erreur actualisation:', error);
        }
    }

    toggleAutoRefresh() {
        this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
        
        const btn = document.getElementById('autoRefreshBtn');
        if (btn) {
            btn.innerHTML = this.isAutoRefreshEnabled 
                ? '<i class="fas fa-pause mr-2"></i>Auto-Refresh: ON'
                : '<i class="fas fa-play mr-2"></i>Auto-Refresh: OFF';
        }
        
        this.showNotification(
            'Auto-refresh ' + (this.isAutoRefreshEnabled ? 'activé' : 'désactivé'),
            'info'
        );
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (this.isAutoRefreshEnabled) {
                this.refreshData();
            }
        }, this.refreshInterval);
        
        console.log('🔄 Auto-refresh configuré (' + (this.refreshInterval / 1000) + 's)');
    }

    showNotification(message, type) {
        type = type || 'info';
        
        const notification = document.createElement('div');
        
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            info: 'bg-blue-600',
            warning: 'bg-yellow-600'
        };
        
        notification.className = 
            'fixed top-4 right-4 ' + (colors[type] || 'bg-blue-600') + 
            ' text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialisation de l'application
const app = new ETHTraderApp();

// Exposition globale pour les event handlers inline
window.app = app;

console.log('🚀 ETH Trader Frontend chargé');