-- Migration: Create predictions table for storing TimesFM predictions
-- Date: 2025-09-25

CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prediction_id TEXT UNIQUE NOT NULL,
  crypto TEXT NOT NULL,
  current_price REAL NOT NULL,
  predicted_price REAL NOT NULL,
  confidence_score REAL NOT NULL,
  predicted_return REAL NOT NULL,
  prediction_horizon TEXT NOT NULL DEFAULT '24h',
  model_version TEXT NOT NULL DEFAULT 'TimesFM-v2.1',
  quantile_10 REAL,
  quantile_90 REAL,
  features_analyzed TEXT, -- JSON string
  analysis_data TEXT,     -- JSON string
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_predictions_crypto_timestamp ON predictions(crypto, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp DESC);