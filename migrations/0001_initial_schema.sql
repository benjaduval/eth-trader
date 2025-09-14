-- Initial schema for ETH Trader
-- Optimized for Cloudflare D1 (SQLite)

-- Market data table for storing OHLCV and technical indicators
CREATE TABLE IF NOT EXISTS market_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    timeframe TEXT NOT NULL DEFAULT '1h',
    
    -- OHLCV data
    open_price REAL NOT NULL,
    high_price REAL NOT NULL,
    low_price REAL NOT NULL,
    close_price REAL NOT NULL,
    volume REAL DEFAULT 0,
    
    -- Technical indicators (calculated and stored)
    rsi_14 REAL,
    ema_20 REAL,
    ema_50 REAL,
    bollinger_upper REAL,
    bollinger_lower REAL,
    atr_14 REAL,
    
    -- Market metadata from CoinGecko
    market_cap REAL,
    fear_greed_index REAL,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Predictions table for TimesFM model results
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    
    -- Model configuration
    model_name TEXT DEFAULT 'TimesFM_Lite',
    context_length INTEGER DEFAULT 168, -- hours of context
    horizon_hours INTEGER NOT NULL, -- 6, 12, 24, 48, 72, 168
    
    -- Prediction results
    predicted_price REAL NOT NULL,
    predicted_return REAL NOT NULL,
    confidence_score REAL NOT NULL,
    
    -- Risk quantiles
    quantile_10 REAL, -- 10th percentile (pessimistic)
    quantile_25 REAL, -- 25th percentile
    quantile_75 REAL, -- 75th percentile  
    quantile_90 REAL, -- 90th percentile (optimistic)
    
    -- Validation (filled later when horizon is reached)
    actual_price REAL,
    accuracy_score REAL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trading signals generated from predictions
CREATE TABLE IF NOT EXISTS trading_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    
    -- Signal details
    action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'hold')),
    confidence REAL NOT NULL,
    predicted_return REAL,
    current_price REAL NOT NULL,
    
    -- Risk management
    stop_loss_price REAL,
    take_profit_price REAL,
    position_size_percent REAL DEFAULT 0.95,
    
    -- Model reference
    prediction_id INTEGER REFERENCES predictions(id),
    model_used TEXT DEFAULT 'TimesFM_Lite',
    horizon_hours INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Paper trades execution and results
CREATE TABLE IF NOT EXISTS paper_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    symbol TEXT NOT NULL DEFAULT 'ETHUSDT',
    
    -- Trade execution
    side TEXT NOT NULL CHECK (side IN ('long', 'short')),
    entry_price REAL NOT NULL,
    exit_price REAL,
    quantity REAL NOT NULL,
    
    -- Trade status
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    opened_at DATETIME NOT NULL,
    closed_at DATETIME,
    
    -- P&L calculation
    gross_pnl REAL DEFAULT 0,
    fees REAL DEFAULT 0,
    net_pnl REAL DEFAULT 0,
    
    -- Risk management levels
    stop_loss_price REAL,
    take_profit_price REAL,
    exit_reason TEXT, -- 'profit_target', 'stop_loss', 'manual', 'timeout', 'signal_change'
    
    -- Reference to originating signal
    signal_id INTEGER REFERENCES trading_signals(id),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics (calculated periodically)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Time period for calculation
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    period_type TEXT DEFAULT 'daily', -- daily, weekly, monthly
    
    -- Basic metrics
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0,
    
    -- P&L metrics
    total_pnl REAL DEFAULT 0,
    total_fees REAL DEFAULT 0,
    net_pnl REAL DEFAULT 0,
    
    -- Risk metrics
    sharpe_ratio REAL,
    sortino_ratio REAL,
    max_drawdown REAL DEFAULT 0,
    calmar_ratio REAL,
    
    -- Trading metrics
    avg_win REAL DEFAULT 0,
    avg_loss REAL DEFAULT 0,
    profit_factor REAL DEFAULT 0,
    avg_trade_duration_hours REAL DEFAULT 0,
    
    -- Portfolio metrics
    starting_balance REAL,
    ending_balance REAL,
    total_return REAL DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System logs for monitoring and debugging
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Log classification
    level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
    component TEXT NOT NULL, -- 'coingecko', 'timesfm', 'trading', 'api'
    message TEXT NOT NULL,
    
    -- Performance metrics
    execution_time_ms REAL,
    memory_usage_mb REAL,
    api_calls_count INTEGER DEFAULT 0,
    
    -- Context data (JSON string)
    context_data TEXT, -- JSON string for additional context
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance

-- Market data indexes
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_market_data_timeframe_timestamp ON market_data(timeframe, timestamp);

-- Predictions indexes  
CREATE INDEX IF NOT EXISTS idx_predictions_symbol_timestamp ON predictions(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_predictions_horizon ON predictions(horizon_hours, timestamp);

-- Trading signals indexes
CREATE INDEX IF NOT EXISTS idx_signals_symbol_timestamp ON trading_signals(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_signals_action_timestamp ON trading_signals(action, timestamp);

-- Paper trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_symbol_status ON paper_trades(symbol, status);
CREATE INDEX IF NOT EXISTS idx_trades_status_timestamp ON paper_trades(status, timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON paper_trades(opened_at);
CREATE INDEX IF NOT EXISTS idx_trades_closed_at ON paper_trades(closed_at);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_period ON performance_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp ON performance_metrics(period_type, timestamp);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_level_component ON system_logs(level, component);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp_level ON system_logs(timestamp, level);
CREATE INDEX IF NOT EXISTS idx_logs_component_timestamp ON system_logs(component, timestamp);