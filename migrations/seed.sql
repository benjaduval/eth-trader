-- Seed data for ETH Trader development and testing
-- This creates some initial data for testing the application

-- Insert some historical market data (last 24 hours simulation)
INSERT OR IGNORE INTO market_data (
    timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, market_cap
) VALUES 
    (datetime('now', '-24 hours'), 'ETHUSDT', '1h', 3200.00, 3220.50, 3195.25, 3215.75, 1245.67, 385000000000),
    (datetime('now', '-23 hours'), 'ETHUSDT', '1h', 3215.75, 3235.00, 3210.00, 3228.50, 1156.34, 386200000000),
    (datetime('now', '-22 hours'), 'ETHUSDT', '1h', 3228.50, 3245.75, 3220.00, 3241.25, 1389.12, 387500000000),
    (datetime('now', '-21 hours'), 'ETHUSDT', '1h', 3241.25, 3255.00, 3235.50, 3248.75, 1298.45, 388100000000),
    (datetime('now', '-20 hours'), 'ETHUSDT', '1h', 3248.75, 3265.25, 3240.00, 3252.50, 1445.78, 388900000000),
    (datetime('now', '-19 hours'), 'ETHUSDT', '1h', 3252.50, 3270.00, 3245.75, 3261.25, 1334.56, 389600000000),
    (datetime('now', '-18 hours'), 'ETHUSDT', '1h', 3261.25, 3275.50, 3255.00, 3268.75, 1567.89, 390400000000),
    (datetime('now', '-17 hours'), 'ETHUSDT', '1h', 3268.75, 3285.00, 3260.25, 3277.50, 1678.23, 391200000000),
    (datetime('now', '-16 hours'), 'ETHUSDT', '1h', 3277.50, 3295.75, 3270.00, 3289.25, 1789.45, 392100000000),
    (datetime('now', '-15 hours'), 'ETHUSDT', '1h', 3289.25, 3305.00, 3280.50, 3298.75, 1623.67, 393000000000),
    (datetime('now', '-14 hours'), 'ETHUSDT', '1h', 3298.75, 3315.25, 3290.00, 3307.50, 1534.89, 393800000000),
    (datetime('now', '-13 hours'), 'ETHUSDT', '1h', 3307.50, 3325.00, 3300.25, 3318.75, 1745.12, 394700000000),
    (datetime('now', '-12 hours'), 'ETHUSDT', '1h', 3318.75, 3335.50, 3310.00, 3328.25, 1856.34, 395600000000),
    (datetime('now', '-11 hours'), 'ETHUSDT', '1h', 3328.25, 3345.75, 3320.50, 3337.00, 1967.56, 396500000000),
    (datetime('now', '-10 hours'), 'ETHUSDT', '1h', 3337.00, 3355.25, 3330.75, 3348.50, 2078.78, 397400000000),
    (datetime('now', '-9 hours'), 'ETHUSDT', '1h', 3348.50, 3365.00, 3340.25, 3357.75, 2189.90, 398300000000),
    (datetime('now', '-8 hours'), 'ETHUSDT', '1h', 3357.75, 3375.50, 3350.00, 3368.25, 2234.12, 399200000000),
    (datetime('now', '-7 hours'), 'ETHUSDT', '1h', 3368.25, 3385.75, 3360.50, 3378.00, 2123.45, 400100000000),
    (datetime('now', '-6 hours'), 'ETHUSDT', '1h', 3378.00, 3395.25, 3370.75, 3387.50, 2012.67, 401000000000),
    (datetime('now', '-5 hours'), 'ETHUSDT', '1h', 3387.50, 3405.00, 3380.25, 3396.75, 1901.89, 401900000000),
    (datetime('now', '-4 hours'), 'ETHUSDT', '1h', 3396.75, 3415.50, 3390.00, 3407.25, 1834.56, 402800000000),
    (datetime('now', '-3 hours'), 'ETHUSDT', '1h', 3407.25, 3425.75, 3400.50, 3418.00, 1723.78, 403700000000),
    (datetime('now', '-2 hours'), 'ETHUSDT', '1h', 3418.00, 3435.25, 3410.75, 3427.50, 1612.90, 404600000000),
    (datetime('now', '-1 hour'), 'ETHUSDT', '1h', 3427.50, 3445.00, 3420.25, 3438.75, 1567.23, 405500000000);

-- Insert some sample predictions
INSERT OR IGNORE INTO predictions (
    timestamp, symbol, horizon_hours, predicted_price, predicted_return, confidence_score, quantile_10, quantile_90
) VALUES 
    (datetime('now', '-2 hours'), 'ETHUSDT', 24, 3450.00, 0.025, 0.72, 3385.00, 3515.00),
    (datetime('now', '-1 hour'), 'ETHUSDT', 12, 3465.25, 0.018, 0.68, 3420.00, 3510.50),
    (datetime('now', '-30 minutes'), 'ETHUSDT', 6, 3445.75, 0.012, 0.65, 3410.25, 3481.25);

-- Insert some sample trading signals
INSERT OR IGNORE INTO trading_signals (
    timestamp, symbol, action, confidence, predicted_return, current_price, stop_loss_price, take_profit_price, prediction_id
) VALUES 
    (datetime('now', '-2 hours'), 'ETHUSDT', 'buy', 0.72, 0.025, 3427.50, 3256.13, 3941.63, 1),
    (datetime('now', '-1 hour'), 'ETHUSDT', 'hold', 0.68, 0.018, 3438.75, NULL, NULL, 2),
    (datetime('now', '-30 minutes'), 'ETHUSDT', 'buy', 0.65, 0.012, 3442.25, 3270.14, 3958.59, 3);

-- Insert some sample paper trades (1 closed, 1 open)
INSERT OR IGNORE INTO paper_trades (
    timestamp, symbol, side, entry_price, exit_price, quantity, status, opened_at, closed_at, 
    gross_pnl, fees, net_pnl, exit_reason, signal_id
) VALUES 
    (datetime('now', '-6 hours'), 'ETHUSDT', 'long', 3387.50, 3427.50, 2.8956, 'closed', 
     datetime('now', '-6 hours'), datetime('now', '-2 hours'), 115.85, 11.85, 104.00, 'profit_target', 1),
    (datetime('now', '-30 minutes'), 'ETHUSDT', 'long', 3442.25, NULL, 2.8455, 'open', 
     datetime('now', '-30 minutes'), NULL, 0, 9.79, 0, NULL, 3);

-- Insert sample performance metrics (daily summary)
INSERT OR IGNORE INTO performance_metrics (
    timestamp, period_start, period_end, period_type, total_trades, winning_trades, losing_trades,
    win_rate, total_pnl, total_fees, net_pnl, avg_win, avg_loss, profit_factor, max_drawdown,
    starting_balance, ending_balance, total_return
) VALUES 
    (datetime('now'), datetime('now', '-1 day'), datetime('now'), 'daily', 5, 3, 2, 0.60,
     245.67, 47.85, 197.82, 82.34, 41.17, 2.00, 0.035, 10000.00, 10197.82, 0.0198);

-- Insert some system logs
INSERT OR IGNORE INTO system_logs (
    timestamp, level, component, message, execution_time_ms, api_calls_count
) VALUES 
    (datetime('now', '-1 hour'), 'INFO', 'coingecko', 'Successfully fetched ETH market data', 245.6, 5),
    (datetime('now', '-45 minutes'), 'INFO', 'timesfm', 'Generated prediction for 24h horizon with 72% confidence', 1250.3, 0),
    (datetime('now', '-30 minutes'), 'INFO', 'trading', 'Executed BUY signal: 2.8455 ETH at $3442.25', 89.4, 0),
    (datetime('now', '-15 minutes'), 'INFO', 'api', 'Dashboard data requested - performance: 197ms', 197.2, 2),
    (datetime('now', '-5 minutes'), 'WARN', 'coingecko', 'Rate limit approaching: 450/500 calls used', 156.7, 1);

-- Create a view for quick dashboard metrics
CREATE VIEW IF NOT EXISTS dashboard_summary AS
SELECT 
    -- Current portfolio status
    (SELECT COALESCE(10000 + SUM(net_pnl), 10000) FROM paper_trades WHERE status = 'closed') as current_balance,
    
    -- Active positions count
    (SELECT COUNT(*) FROM paper_trades WHERE status = 'open') as open_positions,
    
    -- Today's performance
    (SELECT COALESCE(SUM(net_pnl), 0) FROM paper_trades WHERE status = 'closed' AND date(closed_at) = date('now')) as today_pnl,
    
    -- Total trades
    (SELECT COUNT(*) FROM paper_trades WHERE status = 'closed') as total_trades,
    
    -- Win rate
    (SELECT ROUND(CAST(COUNT(*) FILTER (WHERE net_pnl > 0) AS FLOAT) / COUNT(*) * 100, 2) 
     FROM paper_trades WHERE status = 'closed') as win_rate_percent,
    
    -- Latest price
    (SELECT close_price FROM market_data ORDER BY timestamp DESC LIMIT 1) as latest_eth_price,
    
    -- Latest signal
    (SELECT action FROM trading_signals ORDER BY timestamp DESC LIMIT 1) as latest_signal,
    
    -- Last update
    (SELECT MAX(timestamp) FROM market_data) as last_update;

-- Insert initial system configuration (can be used for app settings)
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
    ('last_coingecko_call', datetime('now', '-1 hour'), 'Last CoinGecko API call timestamp');

-- Create a trigger to update the last update timestamp
CREATE TRIGGER IF NOT EXISTS update_app_config_timestamp 
    AFTER UPDATE ON app_config
    FOR EACH ROW
BEGIN
    UPDATE app_config SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;