/**
 * ETH Trader Pro - English Frontend with TimesFM Monitoring
 * Automated Paper Trading Dashboard
 */

class ETHTraderApp {
    constructor() {
        this.apiBase = '/api';
        this.refreshInterval = 30000; // 30 seconds
        this.isAutoRefreshEnabled = true;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing ETH Trader Dashboard...');
        
        try {
            await this.checkHealth();
            await this.loadDashboard();
            this.setupAutoRefresh();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Server connection error');
        }
    }

    async checkHealth() {
        const response = await fetch(this.apiBase + '/health');
        const data = await response.json();
        
        if (data.status !== 'healthy') {
            throw new Error('Service unavailable');
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
                throw new Error(result.error || 'Dashboard error');
            }
            
            await this.renderDashboard(result.dashboard);
            
            if (loading) loading.style.display = 'none';
            if (dashboard) dashboard.style.display = 'block';
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
            if (loading) {
                loading.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-400"></i>
                        <p class="mt-2 text-red-400">Error: ${error.message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    async renderDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;
        
        const currentPrice = data.current_price || 0;
        const currentBalance = data.current_balance || 10000;
        const activePositions = data.active_positions || [];
        const metrics = data.metrics || {};
        const recentTrades = data.recent_trades || [];
        const latestPredictions = data.latest_predictions || [];

        // Load TimesFM logs for monitoring
        const timesfmLogs = await this.loadTimesFMLogs();

        dashboard.innerHTML = `
            <!-- Main metrics header -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                ${this.renderMetricCard('ETH Price', '$' + currentPrice.toFixed(2), 'fas fa-coins', 'text-yellow-400')}
                ${this.renderMetricCard('Balance', '$' + currentBalance.toFixed(2), 'fas fa-wallet', 'text-green-400')}
                ${this.renderMetricCard('Positions', activePositions.length, 'fas fa-chart-line', 'text-blue-400')}
                ${this.renderMetricCard('Win Rate', ((metrics.win_rate || 0) * 100).toFixed(1) + '%', 'fas fa-trophy', 'text-purple-400')}
            </div>

            <!-- Quick actions -->
            <div class="mb-8">
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-bolt mr-2 text-yellow-400"></i>
                        Quick Actions
                    </h2>
                    <div class="flex flex-wrap gap-4">
                        <button onclick="app.generateSignal()" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-magic mr-2"></i>Generate Signal
                        </button>
                        <button onclick="app.refreshData()" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-sync mr-2"></i>Refresh
                        </button>
                        <button onclick="app.toggleAutoRefresh()" class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors" id="autoRefreshBtn">
                            <i class="fas fa-pause mr-2"></i>Auto-Refresh: ON
                        </button>
                        <button onclick="app.refreshTimesFMLogs()" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
                            <i class="fas fa-brain mr-2"></i>Refresh AI Logs
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main content grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <!-- Open positions -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-list mr-2 text-green-400"></i>
                        Open Positions
                    </h2>
                    <div id="activePositions" class="space-y-3">
                        ${this.renderActivePositions(activePositions)}
                    </div>
                </div>

                <!-- TimesFM Predictions -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-crystal-ball mr-2 text-purple-400"></i>
                        TimesFM Predictions
                    </h2>
                    <div id="predictions" class="space-y-3">
                        ${this.renderPredictions(latestPredictions)}
                    </div>
                </div>

                <!-- Recent trades -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-history mr-2 text-indigo-400"></i>
                        Recent Trades
                    </h2>
                    <div id="recentTrades" class="space-y-3 max-h-80 overflow-y-auto">
                        ${this.renderRecentTrades(recentTrades)}
                    </div>
                </div>
            </div>

            <!-- TimesFM Monitoring Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- TimesFM Activity Monitor -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-brain mr-2 text-cyan-400"></i>
                        TimesFM AI Monitor
                        <span class="ml-auto">
                            <div class="flex items-center">
                                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                <span class="text-sm text-gray-400">Active</span>
                            </div>
                        </span>
                    </h2>
                    <div id="timesfmLogs" class="space-y-2 max-h-96 overflow-y-auto">
                        ${this.renderTimesFMLogs(timesfmLogs)}
                    </div>
                </div>

                <!-- Performance metrics -->
                <div class="bg-gray-800 rounded-lg p-6">
                    <h2 class="text-xl font-bold mb-4 flex items-center">
                        <i class="fas fa-analytics mr-2 text-red-400"></i>
                        Performance (30d)
                    </h2>
                    ${this.renderPerformanceMetrics(metrics)}
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-gray-400 text-sm">
                Last updated: ${new Date().toLocaleString('en-US')} | TimesFM AI: ${timesfmLogs.length} recent calls
            </div>
        `;
    }

    renderMetricCard(title, value, icon, iconColor) {
        return `
            <div class="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
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
            return '<p class="text-gray-400 text-center py-8">No open positions</p>';
        }

        return positions.map(pos => `
            <div class="bg-gray-700 rounded p-4 flex justify-between items-center hover:bg-gray-600 transition-colors">
                <div>
                    <span class="font-medium ${pos.side === 'long' ? 'text-green-400' : 'text-red-400'}">
                        ${pos.side ? pos.side.toUpperCase() : 'UNKNOWN'} ${(pos.quantity || 0).toFixed(4)} ETH
                    </span>
                    <p class="text-sm text-gray-400">
                        Entry: $${(pos.entry_price || 0).toFixed(2)}
                    </p>
                </div>
                <button onclick="app.closePosition(${pos.id})" 
                        class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors">
                    Close
                </button>
            </div>
        `).join('');
    }

    renderPredictions(predictions) {
        if (!predictions.length) {
            return '<p class="text-gray-400 text-center py-8">No predictions available</p>';
        }

        return predictions.map(pred => `
            <div class="bg-gray-700 rounded p-4 hover:bg-gray-600 transition-colors">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <span class="font-medium text-purple-300">Predicted: $${(pred.predicted_price || 0).toFixed(2)}</span>
                        <p class="text-sm text-gray-400">
                            Return: ${((pred.predicted_return || 0) * 100).toFixed(2)}% 
                            | Confidence: ${((pred.confidence_score || 0) * 100).toFixed(1)}%
                        </p>
                        <p class="text-xs text-gray-500">
                            Horizon: ${pred.horizon_hours || 0}h | ${this.timeAgo(new Date(pred.timestamp))}
                        </p>
                    </div>
                    <div class="ml-2">
                        <div class="w-12 h-2 bg-gray-600 rounded overflow-hidden">
                            <div class="h-full bg-purple-400" 
                                 style="width: ${((pred.confidence_score || 0) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRecentTrades(trades) {
        if (!trades.length) {
            return '<p class="text-gray-400 text-center py-8">No recent trades</p>';
        }

        return trades.map(trade => `
            <div class="bg-gray-700 rounded p-4 hover:bg-gray-600 transition-colors">
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
                        <p class="text-xs text-gray-500">${trade.exit_reason || 'manual'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderTimesFMLogs(logs) {
        if (!logs.length) {
            return `
                <div class="text-center py-8">
                    <i class="fas fa-robot text-4xl text-gray-600 mb-2"></i>
                    <p class="text-gray-400">No TimesFM activity yet</p>
                    <p class="text-xs text-gray-500 mt-1">Generate a signal to see AI predictions</p>
                </div>
            `;
        }

        return logs.map(log => {
            let contextData = {};
            try {
                contextData = JSON.parse(log.context_data || '{}');
            } catch (e) {
                contextData = {};
            }

            const isError = log.level === 'ERROR';
            const isComplete = log.message.includes('completed');
            const executionTime = contextData.execution_time_ms;

            return `
                <div class="bg-gray-700 rounded p-3 text-sm hover:bg-gray-600 transition-colors">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-1">
                                <i class="fas fa-${isError ? 'exclamation-triangle text-red-400' : isComplete ? 'check-circle text-green-400' : 'cog text-blue-400'} mr-2"></i>
                                <span class="font-medium text-gray-200">${log.message}</span>
                            </div>
                            
                            ${contextData.predicted_price ? `
                                <div class="text-xs text-gray-400 ml-6 space-y-1">
                                    <div>Price: $${contextData.predicted_price.toFixed(2)} | Return: ${(contextData.predicted_return * 100).toFixed(2)}%</div>
                                    <div>Confidence: ${(contextData.confidence_score * 100).toFixed(1)}% | Trend: ${contextData.trend_direction || 'N/A'}</div>
                                </div>
                            ` : ''}
                            
                            ${contextData.error ? `
                                <div class="text-xs text-red-300 ml-6 mt-1">${contextData.error}</div>
                            ` : ''}
                        </div>
                        
                        <div class="text-right ml-2">
                            <div class="text-xs text-gray-500">${this.timeAgo(new Date(log.timestamp))}</div>
                            ${executionTime ? `<div class="text-xs text-gray-400">${executionTime}ms</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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
                    <p class="text-sm text-gray-400">Net P&L</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-red-400">${((metrics.max_drawdown || 0) * 100).toFixed(1)}%</p>
                    <p class="text-sm text-gray-400">Max DD</p>
                </div>
            </div>
        `;
    }

    async loadTimesFMLogs() {
        try {
            const response = await fetch(this.apiBase + '/logs/timesfm?limit=10');
            const result = await response.json();
            
            if (result.success) {
                return result.logs;
            }
            return [];
        } catch (error) {
            console.error('Error loading TimesFM logs:', error);
            return [];
        }
    }

    async refreshTimesFMLogs() {
        const timesfmLogsContainer = document.getElementById('timesfmLogs');
        if (!timesfmLogsContainer) return;

        try {
            const logs = await this.loadTimesFMLogs();
            timesfmLogsContainer.innerHTML = this.renderTimesFMLogs(logs);
            this.showNotification('TimesFM logs refreshed', 'info');
        } catch (error) {
            this.showNotification('Failed to refresh logs', 'error');
        }
    }

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    async generateSignal() {
        const button = event.target;
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
            button.disabled = true;
            
            const response = await fetch(this.apiBase + '/trading/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(
                    'Signal generated: ' + result.signal.action.toUpperCase() + ' ' +
                    '(Confidence: ' + (result.signal.confidence * 100).toFixed(1) + '%)',
                    'success'
                );
                
                setTimeout(() => this.refreshData(), 1000);
                setTimeout(() => this.refreshTimesFMLogs(), 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Error: ' + error.message, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async closePosition(tradeId) {
        if (!confirm('Are you sure you want to close this position?')) {
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
                    'Position closed - P&L: $' + (result.trade.net_pnl || 0).toFixed(2),
                    (result.trade.net_pnl || 0) >= 0 ? 'success' : 'error'
                );
                
                setTimeout(() => this.refreshData(), 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Close error: ' + error.message, 'error');
        }
    }

    async refreshData() {
        console.log('🔄 Refreshing data...');
        
        try {
            const response = await fetch(this.apiBase + '/dashboard');
            const result = await response.json();
            
            if (result.success) {
                await this.renderDashboard(result.dashboard);
                console.log('✅ Data refreshed');
            }
        } catch (error) {
            console.error('❌ Refresh error:', error);
        }
    }

    toggleAutoRefresh() {
        this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
        
        const btn = document.getElementById('autoRefreshBtn');
        if (btn) {
            btn.innerHTML = this.isAutoRefreshEnabled 
                ? '<i class="fas fa-pause mr-2"></i>Auto-Refresh: ON'
                : '<i class="fas fa-play mr-2"></i>Auto-Refresh: OFF';
            
            btn.className = btn.className.replace(
                this.isAutoRefreshEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
                this.isAutoRefreshEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            );
        }
        
        this.showNotification(
            'Auto-refresh ' + (this.isAutoRefreshEnabled ? 'enabled' : 'disabled'),
            'info'
        );
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (this.isAutoRefreshEnabled) {
                this.refreshData();
            }
        }, this.refreshInterval);
        
        console.log('🔄 Auto-refresh configured (' + (this.refreshInterval / 1000) + 's)');
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

// Initialize the application
const app = new ETHTraderApp();

// Global exposure for inline event handlers
window.app = app;

console.log('🚀 ETH Trader Frontend loaded with TimesFM monitoring');