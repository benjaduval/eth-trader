-- Create predictions table (simple version compatible with existing DB)
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
  features_analyzed TEXT,
  analysis_data TEXT,
  timestamp TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);