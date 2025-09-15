-- Schema creation without seed data
-- Tables pour le système de trading automatisé ETH

-- Table pour les données de marché (prix OHLCV)
CREATE TABLE IF NOT EXISTS market_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    timeframe TEXT NOT NULL DEFAULT '1h', -- 1m, 5m, 15m, 1h, 4h, 1d
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    market_cap BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timestamp, symbol, timeframe)
);

-- Table pour les prédictions TimesFM
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    horizon_hours INTEGER NOT NULL DEFAULT 24, -- Horizon de prédiction (1-168h)
    predicted_price DECIMAL(20, 8) NOT NULL,
    predicted_return DECIMAL(10, 6) NOT NULL, -- Pourcentage de retour attendu
    confidence_score DECIMAL(5, 4) NOT NULL, -- Score de confiance 0-1
    quantile_10 DECIMAL(20, 8), -- 10ème percentile (bear case)
    quantile_90 DECIMAL(20, 8), -- 90ème percentile (bull case)
    model_version TEXT DEFAULT 'timesfm-1.0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les signaux de trading
CREATE TABLE IF NOT EXISTS trading_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'hold')),
    confidence DECIMAL(5, 4) NOT NULL, -- Score de confiance du signal
    predicted_return DECIMAL(10, 6), -- Retour prédit pour ce signal
    current_price DECIMAL(20, 8) NOT NULL,
    stop_loss_price DECIMAL(20, 8), -- Prix de stop loss calculé
    take_profit_price DECIMAL(20, 8), -- Prix de prise de bénéfice
    prediction_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prediction_id) REFERENCES predictions(id)
);

-- Table pour les trades de paper trading
CREATE TABLE IF NOT EXISTS paper_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    entry_price DECIMAL(20, 8) NOT NULL,
    exit_price DECIMAL(20, 8), -- NULL si position encore ouverte
    quantity DECIMAL(20, 8) NOT NULL, -- Quantité d'ETH tradée
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at DATETIME NOT NULL,
    closed_at DATETIME, -- NULL si encore ouvert
    gross_pnl DECIMAL(20, 8) DEFAULT 0, -- P&L brut avant frais
    fees DECIMAL(20, 8) DEFAULT 0, -- Frais de trading
    net_pnl DECIMAL(20, 8) DEFAULT 0, -- P&L net après frais
    exit_reason TEXT, -- 'profit_target', 'stop_loss', 'signal_change', 'manual'
    signal_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signal_id) REFERENCES trading_signals(id)
);

-- Table pour les métriques de performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- Pourcentage de trades gagnants
    total_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_fees DECIMAL(20, 8) NOT NULL DEFAULT 0,
    net_pnl DECIMAL(20, 8) NOT NULL DEFAULT 0,
    avg_win DECIMAL(20, 8) DEFAULT 0,
    avg_loss DECIMAL(20, 8) DEFAULT 0,
    profit_factor DECIMAL(10, 4) DEFAULT 0, -- Total gains / Total pertes
    max_drawdown DECIMAL(10, 6) DEFAULT 0, -- Drawdown maximum en %
    starting_balance DECIMAL(20, 8) NOT NULL DEFAULT 10000,
    ending_balance DECIMAL(20, 8) NOT NULL DEFAULT 10000,
    total_return DECIMAL(10, 6) DEFAULT 0, -- Retour total en %
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(period_start, period_end, period_type)
);

-- Table pour les logs système et TimesFM
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    component TEXT NOT NULL, -- 'timesfm', 'coingecko', 'trading', 'api'
    message TEXT NOT NULL,
    context_data TEXT, -- JSON stringifié pour contexte supplémentaire
    execution_time_ms DECIMAL(10, 3), -- Temps d'exécution en ms
    api_calls_count INTEGER DEFAULT 0 -- Nombre d'appels API effectués
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_time ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_time ON predictions(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_signals_timestamp ON trading_signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_paper_trades_status ON paper_trades(status);
CREATE INDEX IF NOT EXISTS idx_paper_trades_timestamp ON paper_trades(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component, timestamp);

-- Configuration de l'application
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_config (key, value, description) VALUES 
    ('trading_mode', 'paper', 'Current trading mode: paper or live'),
    ('initial_balance', '10000', 'Starting balance for paper trading'),
    ('fees_per_side_bps', '8', 'Trading fees in basis points per side (8 = 0.08%)'),
    ('max_position_size', '0.95', 'Maximum position size as percentage of balance'),
    ('stop_loss_percent', '5', 'Default stop loss percentage'),
    ('take_profit_percent', '15', 'Default take profit percentage'),
    ('prediction_horizon', '24', 'Default prediction horizon in hours'),
    ('min_confidence', '0.6', 'Minimum confidence score for trade execution'),
    ('app_version', '1.0.0', 'Current application version'),
    ('last_coingecko_call', datetime('now', '-1 hour'), 'Last CoinGecko API call timestamp'),
    ('auto_trading_enabled', 'true', 'Enable automatic trading based on signals'),
    ('prediction_interval_minutes', '60', 'Interval between TimesFM predictions in minutes');

-- Trigger pour mettre à jour automatiquement app_config
CREATE TRIGGER IF NOT EXISTS update_app_config_timestamp 
    AFTER UPDATE ON app_config
    FOR EACH ROW
BEGIN
    UPDATE app_config SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;