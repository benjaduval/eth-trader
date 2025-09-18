/**
 * ETH Trader - Backend API avec Hono pour Cloudflare Workers
 * Trading automatisé ETH/USDC avec TimesFM et CoinGecko Pro
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types/cloudflare'
import { CoinGeckoService } from './services/coingecko'
import { TimesFMPredictor } from './services/timesfm-predictor'
import { PaperTradingEngine } from './services/paper-trading'

// Types pour l'environnement Hono avec Cloudflare bindings
type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>()

// Middleware CORS pour les requêtes API
app.use('/api/*', cors({
  origin: '*', // En production, spécifier les domaines autorisés
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Servir les fichiers statiques depuis public/
app.use('/static/*', serveStatic({ root: './public' }))

// ===============================
// ROUTES API
// ===============================

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: !!c.env.DB,
      coingecko_api: !!c.env.COINGECKO_API_KEY
    },
    supported_cryptos: CoinGeckoService.getSupportedCryptos()
  })
})

// Route pour obtenir la liste des cryptos supportées
app.get('/api/cryptos/supported', (c) => {
  const supportedCryptos = CoinGeckoService.getSupportedCryptos().map(crypto => ({
    crypto,
    info: CoinGeckoService.getCryptoInfo(crypto)
  }))
  
  return c.json({
    success: true,
    cryptos: supportedCryptos,
    count: supportedCryptos.length
  })
})

// Comparaison multi-cryptos 
app.get('/api/cryptos/compare', async (c) => {
  try {
    const cryptos = ['ETH', 'BTC'] // Par défaut, comparer ETH et BTC
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    
    const comparisons = await Promise.all(
      cryptos.map(async (crypto) => {
        try {
          const price = await coinGecko.getCurrentCryptoPrice(crypto)
          const marketData = await coinGecko.getCryptoMarketData(crypto)
          
          return {
            crypto,
            price,
            market_cap: marketData?.market_data?.market_cap?.usd || 0,
            change_24h: marketData?.market_data?.price_change_percentage_24h || 0,
            volume_24h: marketData?.market_data?.total_volume?.usd || 0,
            timestamp: new Date().toISOString()
          }
        } catch (error) {
          console.warn(`Failed to get ${crypto} data:`, error)
          return {
            crypto,
            price: 0,
            market_cap: 0,
            change_24h: 0,
            volume_24h: 0,
            error: true,
            timestamp: new Date().toISOString()
          }
        }
      })
    )
    
    return c.json({
      success: true,
      comparisons,
      count: comparisons.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to compare cryptos',
      comparisons: []
    }, 500)
  }
})

// ===============================
// MARKET DATA ROUTES
// ===============================

// Données de marché actuelles (multi-crypto)
app.get('/api/market/current', async (c) => {
  try {
    const crypto = c.req.query('crypto') || 'ETH' // ETH par défaut
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const data = await coinGecko.getEnhancedMarketData(crypto.toUpperCase())
    
    return c.json({
      success: true,
      data,
      crypto: crypto.toUpperCase(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Market data error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Prix crypto actuel (multi-crypto)
app.get('/api/market/price', async (c) => {
  try {
    const crypto = c.req.query('crypto') || 'ETH' // ETH par défaut
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const price = await coinGecko.getCurrentCryptoPrice(crypto.toUpperCase())
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    return c.json({
      success: true,
      price,
      crypto: crypto.toUpperCase(),
      symbol,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch price',
      price: 0
    }, 500)
  }
})

// Données OHLCV historiques (multi-crypto)
app.get('/api/market/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '24')
    const crypto = c.req.query('crypto') || 'ETH'
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    const result = await c.env.DB.prepare(`
      SELECT timestamp, open_price as open, high_price as high, 
             low_price as low, close_price as close, volume
      FROM market_data 
      WHERE symbol = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).bind(symbol, limit).all()
    
    return c.json({
      success: true,
      data: result.results.reverse(), // Plus ancien -> plus récent
      count: result.results.length,
      crypto: crypto.toUpperCase(),
      symbol
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch historical data',
      data: []
    }, 500)
  }
})

// ===============================
// PREDICTIONS ROUTES  
// ===============================

// Générer une nouvelle prédiction (multi-crypto)
app.post('/api/predictions/generate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const horizonHours = parseInt(body.horizon || '24')
    const crypto = body.crypto || 'ETH'
    
    // Récupérer le prix actuel
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentCryptoPrice(crypto.toUpperCase())
    
    if (!currentPrice) {
      throw new Error(`Could not fetch current ${crypto} price`)
    }
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    // Générer la prédiction
    const predictor = new TimesFMPredictor(c.env.DB)
    const prediction = await predictor.predictNextHours(symbol, horizonHours, currentPrice)
    
    return c.json({
      success: true,
      prediction,
      crypto: crypto.toUpperCase(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Prediction generation error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Prediction failed'
    }, 500)
  }
})

// Récupérer les dernières prédictions (multi-crypto)
app.get('/api/predictions/latest', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    const crypto = c.req.query('crypto') || 'ETH'
    
    // Déterminer le symbol de trading pour le filtre
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    const predictor = new TimesFMPredictor(c.env.DB)
    // On peut soit adapter getLatestPredictions pour accepter un symbol
    // Soit faire la requête directement ici
    const result = await c.env.DB.prepare(`
      SELECT * FROM predictions 
      WHERE symbol = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).bind(symbol, limit).all()
    
    const predictions = result.results.map((row: any) => ({
      symbol: row.symbol,
      timestamp: new Date(row.timestamp),
      predicted_price: row.predicted_price,
      predicted_return: row.predicted_return,
      confidence_score: row.confidence_score,
      horizon_hours: row.horizon_hours,
      quantile_10: row.quantile_10,
      quantile_90: row.quantile_90
    }));
    
    return c.json({
      success: true,
      predictions,
      count: predictions.length,
      crypto: crypto.toUpperCase(),
      symbol
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch predictions',
      predictions: []
    }, 500)
  }
})

// ===============================
// TRADING ROUTES
// ===============================

// Générer et exécuter un signal de trading (multi-crypto)
app.post('/api/trading/signal', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const crypto = body.crypto || 'ETH'
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    // Récupérer le prix actuel
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentCryptoPrice(crypto.toUpperCase())
    
    if (!currentPrice) {
      throw new Error(`Could not fetch current ${crypto} price`)
    }
    
    // Générer prédiction
    const predictor = new TimesFMPredictor(c.env.DB)
    const prediction = await predictor.predictNextHours(symbol, 24, currentPrice)
    
    // Générer signal de trading
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const signal = await tradingEngine.generateSignal(symbol)
    
    // Exécuter le trade si le signal n'est pas "hold"
    let trade = null
    if (signal.action !== 'hold') {
      trade = await tradingEngine.executePaperTrade(signal)
    }
    
    return c.json({
      success: true,
      signal,
      trade,
      prediction,
      crypto: crypto.toUpperCase(),
      symbol,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Trading signal error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Signal generation failed'
    }, 500)
  }
})

// Positions ouvertes
app.get('/api/trading/positions', async (c) => {
  try {
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const positions = await tradingEngine.getActivePositions()
    
    return c.json({
      success: true,
      positions,
      count: positions.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch positions',
      positions: []
    }, 500)
  }
})

// Fermer une position manuellement
app.post('/api/trading/positions/:id/close', async (c) => {
  try {
    const tradeId = parseInt(c.req.param('id'))
    
    // Récupérer le prix actuel
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current price')
    }
    
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const closedTrade = await tradingEngine.closePosition(tradeId, currentPrice, 'manual')
    
    return c.json({
      success: true,
      trade: closedTrade,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close position'
    }, 500)
  }
})

// Métriques de performance
app.get('/api/trading/metrics', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30')
    
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const metrics = await tradingEngine.getPerformanceMetrics(days)
    const currentBalance = await tradingEngine.getCurrentBalance()
    
    return c.json({
      success: true,
      metrics: {
        ...metrics,
        current_balance: currentBalance
      },
      period_days: days
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch metrics',
      metrics: {}
    }, 500)
  }
})

// Historique des trades
app.get('/api/trading/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const trades = await tradingEngine.getRecentTrades(limit)
    
    return c.json({
      success: true,
      trades,
      count: trades.length
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch trade history',
      trades: []
    }, 500)
  }
})

// ===============================
// DASHBOARD ROUTE
// ===============================

// Données complètes du dashboard (multi-crypto)
app.get('/api/dashboard', async (c) => {
  try {
    const crypto = c.req.query('crypto') || 'ETH'
    
    // Récupérer toutes les données en parallèle (mais séquentiel pour éviter les rate limits)
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    
    // Prix actuel pour la crypto sélectionnée
    const currentPrice = await coinGecko.getCurrentCryptoPrice(crypto.toUpperCase())
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    // Positions et métriques pour la crypto sélectionnée SEULEMENT
    const [activePositions, metrics, recentTrades] = await Promise.all([
      tradingEngine.getActivePositions(symbol), // Positions filtrées par crypto
      tradingEngine.getPerformanceMetrics(30, symbol), // Métriques filtrées par crypto
      tradingEngine.getRecentTrades(10, symbol) // Trades récents filtrés par crypto
    ])
    
    // Prédictions pour la crypto sélectionnée
    const latestPredictionsResult = await c.env.DB.prepare(`
      SELECT * FROM predictions 
      WHERE symbol = ?
      ORDER BY timestamp DESC 
      LIMIT 3
    `).bind(symbol).all()
    
    const latestPredictions = latestPredictionsResult.results.map((row: any) => ({
      symbol: row.symbol,
      timestamp: new Date(row.timestamp),
      predicted_price: row.predicted_price,
      predicted_return: row.predicted_return,
      confidence_score: row.confidence_score,
      horizon_hours: row.horizon_hours,
      quantile_10: row.quantile_10,
      quantile_90: row.quantile_90
    }))
    
    // Balance actuelle pour cette crypto spécifiquement
    const currentBalance = await tradingEngine.getCurrentBalance(symbol)
    
    // Données de marché (optionnel, peut être lourd)
    const marketData = c.req.query('include_market') === 'true' 
      ? await coinGecko.getEnhancedMarketData(crypto.toUpperCase()) 
      : null
    
    return c.json({
      success: true,
      dashboard: {
        current_price: currentPrice,
        current_balance: currentBalance,
        active_positions: activePositions,
        metrics: metrics,
        recent_trades: recentTrades,
        latest_predictions: latestPredictions,
        market_data: marketData,
        crypto: crypto.toUpperCase(),
        symbol: symbol
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Dashboard fetch failed'
    }, 500)
  }
})

// ===============================
// MONITORING & LOGS ROUTES
// ===============================

// Historique des logs TimesFM
app.get('/api/logs/timesfm', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10')
    
    // Si la base de données n'est pas disponible, retourner des logs de démo
    if (!c.env.DB) {
      return c.json({
        success: true,
        logs: [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            component: 'timesfm',
            message: 'TimesFM prediction completed',
            context_data: JSON.stringify({
              predicted_price: 4620.14,
              predicted_return: 0.025,
              confidence_score: 0.72,
              execution_time_ms: 1250,
              trend_direction: 'bullish',
              trend_strength: 0.6
            }),
            execution_time_ms: 1250
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 300000).toISOString(),
            level: 'INFO', 
            component: 'timesfm',
            message: 'Starting TimesFM prediction',
            context_data: JSON.stringify({
              symbol: 'ETHUSDT',
              horizonHours: 24,
              currentPrice: 4603.75
            }),
            execution_time_ms: null
          }
        ],
        count: 2,
        demo: true
      })
    }
    
    const result = await c.env.DB.prepare(`
      SELECT * FROM system_logs 
      WHERE component = 'timesfm' 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).bind(limit).all()
    
    return c.json({
      success: true,
      logs: result.results,
      count: result.results.length
    })
  } catch (error) {
    console.error('TimesFM logs error:', error)
    
    // Fallback avec logs de démo en cas d'erreur
    return c.json({
      success: true,
      logs: [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          component: 'timesfm',
          message: 'TimesFM system ready',
          context_data: JSON.stringify({
            status: 'active',
            last_prediction: new Date(Date.now() - 120000).toISOString()
          }),
          execution_time_ms: null
        }
      ],
      count: 1,
      fallback: true
    })
  }
})

// Route pour initialiser le schema de base de données
app.post('/api/admin/init-database', async (c) => {
  try {
    console.log('🔄 Initializing database schema...');
    
    if (!c.env.DB) {
      throw new Error('Database not available');
    }

    // Créer table system_logs en priorité
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL,
          component TEXT NOT NULL,
          message TEXT NOT NULL,
          execution_time_ms REAL,
          memory_usage_mb REAL,
          api_calls_count INTEGER DEFAULT 0,
          context_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    console.log('✅ System logs table created');

    return c.json({
      success: true,
      message: 'Database schema initialized successfully'
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database initialization failed'
    }, 500);
  }
});

// Logs système généraux
app.get('/api/logs/system', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const component = c.req.query('component') || null
    
    let query = `
      SELECT * FROM system_logs 
      ${component ? 'WHERE component = ?' : ''}
      ORDER BY timestamp DESC 
      LIMIT ?
    `
    
    const result = component 
      ? await c.env.DB.prepare(query).bind(component, limit).all()
      : await c.env.DB.prepare(query).bind(limit).all()
    
    return c.json({
      success: true,
      logs: result.results,
      count: result.results.length,
      component: component
    })
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to fetch system logs',
      logs: []
    }, 500)
  }
})

// ===============================
// AUTOMATED TASKS
// ===============================

// Check automatique des stop loss et take profit
app.post('/api/trading/check-exits', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current price')
    }
    
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    await tradingEngine.checkStopLossAndTakeProfit(currentPrice)
    
    return c.json({
      success: true,
      message: 'Stop loss and take profit check completed',
      current_price: currentPrice,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Check exits failed'
    }, 500)
  }
})

// ===============================
// PAGE PRINCIPALE - Multi-Crypto Trader Pro V2
// ===============================

// Route pour servir l'interface web à la racine
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Crypto Trader Pro - ETH & BTC Analysis</title>
    <link rel="stylesheet" href="/static/style.css">
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            margin: 0;
            padding: 0;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            padding: 2rem;
            background: rgba(15, 23, 42, 0.9);
            border-bottom: 1px solid #334155;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header p {
            margin: 0.5rem 0 0;
            color: #94a3b8;
            font-size: 1.1rem;
        }
        
        .crypto-tabs {
            display: flex;
            justify-content: center;
            padding: 1rem;
            background: rgba(30, 41, 59, 0.5);
            border-bottom: 1px solid #334155;
        }
        
        .tab-button {
            background: rgba(51, 65, 85, 0.5);
            color: #94a3b8;
            border: none;
            padding: 0.75rem 2rem;
            margin: 0 0.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid transparent;
        }
        
        .tab-button.active {
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            color: white;
            border-color: rgba(255, 255, 255, 0.1);
        }
        
        .tab-button:hover:not(.active) {
            background: rgba(71, 85, 105, 0.8);
            color: #f1f5f9;
        }
        
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem;
            color: #94a3b8;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #334155;
            border-top: 4px solid #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .dashboard {
            display: none;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .dashboard.active {
            display: block;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 1rem;
            padding: 1.5rem;
            border: 1px solid #334155;
            backdrop-filter: blur(10px);
        }
        
        .card h3 {
            margin: 0 0 1rem;
            color: #f1f5f9;
            font-size: 1.2rem;
        }
        
        .price-display {
            font-size: 2rem;
            font-weight: 700;
            color: #10b981;
            margin-bottom: 0.5rem;
        }
        
        .balance-display {
            font-size: 1.5rem;
            font-weight: 600;
            color: #3b82f6;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #334155;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .metric-value {
            color: #f1f5f9;
            font-weight: 500;
        }
        
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        .neutral { color: #94a3b8; }
        
        .footer {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            border-top: 1px solid #334155;
            margin-top: 2rem;
        }
        
        .error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #fecaca;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📈</div>
        <h1>Multi-Crypto Trader Pro</h1>
        <p>ETH & BTC Analysis with TimesFM & CoinGecko Pro</p>
    </div>

    <div class="crypto-tabs">
        <button class="tab-button active" onclick="switchCrypto('ETH')" id="eth-tab">
            📊 Ethereum (ETH)
        </button>
        <button class="tab-button" onclick="switchCrypto('BTC')" id="btc-tab">
            ₿ Bitcoin (BTC)
        </button>
    </div>

    <div id="loading" class="loading">
        <div class="spinner"></div>
        <p>Initializing Neural Networks</p>
        <p>Loading Market Data</p>
        <p>Starting Analytics Engine</p>
    </div>

    <div id="eth-dashboard" class="dashboard active">
        <div class="dashboard-grid">
            <div class="card">
                <h3>💰 Current ETH Price</h3>
                <div class="price-display" id="eth-price">$0.00</div>
                <div class="metric">
                    <span class="metric-label">24h Change</span>
                    <span class="metric-value" id="eth-change">+0.00%</span>
                </div>
            </div>

            <div class="card">
                <h3>💼 Portfolio Balance</h3>
                <div class="balance-display" id="eth-balance">$0.00</div>
                <div class="metric">
                    <span class="metric-label">Active Positions</span>
                    <span class="metric-value" id="eth-positions">0</span>
                </div>
            </div>

            <div class="card">
                <h3>🧠 TimesFM Predictions</h3>
                <div id="eth-predictions"></div>
            </div>

            <div class="card">
                <h3>📈 Trading Metrics</h3>
                <div id="eth-metrics"></div>
            </div>
        </div>
    </div>

    <div id="btc-dashboard" class="dashboard">
        <div class="dashboard-grid">
            <div class="card">
                <h3>💰 Current BTC Price</h3>
                <div class="price-display" id="btc-price">$0.00</div>
                <div class="metric">
                    <span class="metric-label">24h Change</span>
                    <span class="metric-value" id="btc-change">+0.00%</span>
                </div>
            </div>

            <div class="card">
                <h3>💼 Portfolio Balance</h3>
                <div class="balance-display" id="btc-balance">$0.00</div>
                <div class="metric">
                    <span class="metric-label">Active Positions</span>
                    <span class="metric-value" id="btc-positions">0</span>
                </div>
            </div>

            <div class="card">
                <h3>🧠 TimesFM Predictions</h3>
                <div id="btc-predictions"></div>
            </div>

            <div class="card">
                <h3>📈 Trading Metrics</h3>
                <div id="btc-metrics"></div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>🚀 Multi-Crypto Trader Pro | Real-time ETH & BTC Analysis | Powered by TimesFM & CoinGecko Pro</p>
        <p>Trading Parameters: Confidence > 50% | Return > 1.2% | Position Size: 100%</p>
    </div>

    <script src="/static/app-multi-crypto.js"></script>
    
    <script>
        let currentCrypto = 'ETH';

        function switchCrypto(crypto) {
            currentCrypto = crypto;
            
            // Update tabs
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(crypto.toLowerCase() + '-tab').classList.add('active');
            
            // Update dashboards
            document.querySelectorAll('.dashboard').forEach(dash => {
                dash.classList.remove('active');
            });
            document.getElementById(crypto.toLowerCase() + '-dashboard').classList.add('active');
            
            // Refresh data
            loadDashboard(crypto);
        }

        async function loadDashboard(crypto) {
            try {
                console.log(\`Loading \${crypto} dashboard...\`);
                
                // Load dashboard data
                const response = await fetch(\`/api/dashboard?crypto=\${crypto}\`);
                const data = await response.json();
                
                if (data.success && data.dashboard) {
                    updateUI(crypto, data.dashboard);
                } else {
                    throw new Error(\`Failed to load \${crypto} dashboard: \${data.error || 'Unknown error'}\`);
                }
                
                // Hide loading indicator
                document.getElementById('loading').style.display = 'none';
                
            } catch (error) {
                console.error('Dashboard loading error:', error);
                showError(\`Failed to load \${crypto} dashboard: \${error.message}\`);
            }
        }

        function updateUI(crypto, dashboard) {
            const prefix = crypto.toLowerCase();
            
            // Update price
            document.getElementById(\`\${prefix}-price\`).textContent = \`$\${dashboard.current_price.toLocaleString()}\`;
            
            // Update balance
            document.getElementById(\`\${prefix}-balance\`).textContent = \`$\${dashboard.current_balance.toLocaleString()}\`;
            
            // Update positions
            document.getElementById(\`\${prefix}-positions\`).textContent = dashboard.active_positions.length;
            
            // Update predictions
            const predictionsEl = document.getElementById(\`\${prefix}-predictions\`);
            if (dashboard.latest_predictions && dashboard.latest_predictions.length > 0) {
                const pred = dashboard.latest_predictions[0];
                predictionsEl.innerHTML = \`
                    <div class="metric">
                        <span class="metric-label">Predicted Price</span>
                        <span class="metric-value">$\${pred.predicted_price.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Expected Return</span>
                        <span class="metric-value \${pred.predicted_return > 0 ? 'positive' : 'negative'}">
                            \${(pred.predicted_return * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Confidence</span>
                        <span class="metric-value">\${(pred.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                \`;
            } else {
                predictionsEl.innerHTML = '<p class="neutral">Generating prediction...</p>';
            }
            
            // Update metrics
            const metricsEl = document.getElementById(\`\${prefix}-metrics\`);
            if (dashboard.metrics) {
                metricsEl.innerHTML = \`
                    <div class="metric">
                        <span class="metric-label">Win Rate</span>
                        <span class="metric-value">\${((dashboard.metrics.win_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Total Trades</span>
                        <span class="metric-value">\${dashboard.metrics.total_trades || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Total PnL</span>
                        <span class="metric-value \${(dashboard.metrics.total_pnl || 0) > 0 ? 'positive' : 'negative'}">
                            \${(dashboard.metrics.total_pnl || 0).toFixed(2)}%
                        </span>
                    </div>
                \`;
            }
        }

        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            
            const loading = document.getElementById('loading');
            loading.appendChild(errorDiv);
        }

        // Initialize with ETH dashboard
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                loadDashboard('ETH');
            }, 2000);
        });
    </script>
</body>
</html>
  `)
})

export default app