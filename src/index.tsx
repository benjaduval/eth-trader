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
    }
  })
})

// ===============================
// MARKET DATA ROUTES
// ===============================

// Données de marché actuelles
app.get('/api/market/current', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const data = await coinGecko.getEnhancedMarketData()
    
    return c.json({
      success: true,
      data,
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

// Prix ETH actuel simple
app.get('/api/market/price', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const price = await coinGecko.getCurrentETHPrice()
    
    return c.json({
      success: true,
      price,
      symbol: 'ETHUSDT',
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

// Données OHLCV historiques
app.get('/api/market/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '24')
    
    const result = await c.env.DB.prepare(`
      SELECT timestamp, open_price as open, high_price as high, 
             low_price as low, close_price as close, volume
      FROM market_data 
      WHERE symbol = 'ETHUSDT'
      ORDER BY timestamp DESC 
      LIMIT ?
    `).bind(limit).all()
    
    return c.json({
      success: true,
      data: result.results.reverse(), // Plus ancien -> plus récent
      count: result.results.length
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

// Générer une nouvelle prédiction
app.post('/api/predictions/generate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const horizonHours = parseInt(body.horizon || '24')
    
    // Récupérer le prix actuel
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current price')
    }
    
    // Générer la prédiction
    const predictor = new TimesFMPredictor(c.env.DB)
    const prediction = await predictor.predictNextHours('ETHUSDT', horizonHours, currentPrice)
    
    return c.json({
      success: true,
      prediction,
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

// Récupérer les dernières prédictions
app.get('/api/predictions/latest', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5')
    const predictor = new TimesFMPredictor(c.env.DB)
    const predictions = await predictor.getLatestPredictions(limit)
    
    return c.json({
      success: true,
      predictions,
      count: predictions.length
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

// Générer et exécuter un signal de trading
app.post('/api/trading/signal', async (c) => {
  try {
    // Récupérer le prix actuel
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current price')
    }
    
    // Générer prédiction
    const predictor = new TimesFMPredictor(c.env.DB)
    const prediction = await predictor.predictNextHours('ETHUSDT', 24, currentPrice)
    
    // Générer signal de trading
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const signal = await tradingEngine.generateSignal(prediction, currentPrice)
    
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

// Données complètes du dashboard
app.get('/api/dashboard', async (c) => {
  try {
    // Récupérer toutes les données en parallèle (mais séquentiel pour éviter les rate limits)
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const predictor = new TimesFMPredictor(c.env.DB, c.env)
    
    // Prix actuel
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    // Positions et métriques
    const [activePositions, metrics, recentTrades, latestPredictions] = await Promise.all([
      tradingEngine.getActivePositions(),
      tradingEngine.getPerformanceMetrics(30),
      tradingEngine.getRecentTrades(10),
      predictor.getLatestPredictions(3)
    ])
    
    // Balance actuelle
    const currentBalance = await tradingEngine.getCurrentBalance()
    
    // Données de marché (optionnel, peut être lourd)
    const marketData = c.req.query('include_market') === 'true' 
      ? await coinGecko.getEnhancedMarketData() 
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
        market_data: marketData
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
// PAGE PRINCIPALE
// ===============================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ETH Trader Pro - Automated Paper Trading with TimesFM</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-900 text-white min-h-screen">
        <div id="app" class="container mx-auto px-4 py-8">
            <div class="text-center py-8">
                <i class="fas fa-chart-line text-6xl text-green-400 mb-4"></i>
                <h1 class="text-4xl font-bold mb-2">ETH Trader Pro</h1>
                <p class="text-gray-400 text-lg mb-8">Automated Paper Trading with TimesFM & CoinGecko Pro</p>
                <div id="loading" class="text-center">
                    <i class="fas fa-spinner fa-spin text-2xl text-blue-400"></i>
                    <p class="mt-2">Loading dashboard...</p>
                </div>
            </div>
            
            <!-- Dashboard content injected by JavaScript -->
            <div id="dashboard" class="hidden">
                <!-- Dynamic dashboard content -->
            </div>
        </div>
        
        <script src="/static/app-en.js"></script>
    </body>
    </html>
  `)
})

export default app
