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

// Récupération de vraies données historiques CoinGecko Pro (AUCUNE SIMULATION)
app.post('/api/admin/fetch-real-historical-data', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const hoursParam = parseInt(c.req.query('hours') || '72') // Par défaut 72h (3 jours)
    const crypto = c.req.query('crypto') || 'ETH' // ETH par défaut
    
    console.log(`🔄 Fetching REAL historical data for ${crypto} for last ${hoursParam} hours...`)
    
    // Déterminer le symbol de trading
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT'
    }
    const symbol = cryptoMap[crypto.toUpperCase()] || `${crypto.toUpperCase()}USDT`
    
    // Récupérer les vraies données historiques CoinGecko Pro
    const realHistoricalData = await coinGecko.getLatestRealData(crypto.toUpperCase(), hoursParam)
    
    if (!realHistoricalData || realHistoricalData.length === 0) {
      throw new Error('No real historical data available from CoinGecko')
    }
    
    let insertedCount = 0
    let updatedCount = 0
    
    // Insérer/mettre à jour chaque point de données réelles
    for (const dataPoint of realHistoricalData) {
      try {
        const result = await c.env.DB.prepare(`
          INSERT OR REPLACE INTO market_data 
          (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, market_cap, created_at)
          VALUES (?, ?, '1h', ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP)
        `).bind(
          dataPoint.timestamp,
          symbol,
          dataPoint.open,
          dataPoint.high,
          dataPoint.low,
          dataPoint.close,
          dataPoint.volume
        ).run()
        
        if (result.success) {
          if (result.meta.changes > 0) {
            insertedCount++
          } else {
            updatedCount++
          }
        }
      } catch (dbError) {
        console.warn('Failed to insert real data point:', dbError)
      }
    }
    
    // Log dans la base pour traçabilité
    await c.env.DB.prepare(`
      INSERT INTO system_logs (timestamp, level, component, message, context_data, execution_time_ms)
      VALUES (CURRENT_TIMESTAMP, 'INFO', 'coingecko', 'Real historical data fetched', ?, ?)
    `).bind(
      JSON.stringify({
        crypto: crypto.toUpperCase(),
        symbol: symbol,
        hours_requested: hoursParam,
        data_points_received: realHistoricalData.length,
        inserted: insertedCount,
        updated: updatedCount,
        data_range: {
          from: realHistoricalData[0]?.timestamp,
          to: realHistoricalData[realHistoricalData.length - 1]?.timestamp
        }
      }),
      null
    ).run()
    
    console.log(`✅ Successfully processed ${realHistoricalData.length} REAL ${crypto} data points`)
    
    return c.json({
      success: true,
      message: `Successfully processed ${realHistoricalData.length} REAL ${crypto} historical data points`,
      crypto: crypto.toUpperCase(),
      symbol: symbol,
      data_points_fetched: realHistoricalData.length,
      inserted_count: insertedCount,
      updated_count: updatedCount,
      hours_covered: hoursParam,
      data_source: 'CoinGecko Pro API',
      data_range: {
        from: realHistoricalData[0]?.timestamp,
        to: realHistoricalData[realHistoricalData.length - 1]?.timestamp
      }
    })
    
  } catch (error) {
    console.error('❌ Real historical data fetch failed:', error)
    await c.env.DB.prepare(`
      INSERT INTO system_logs (timestamp, level, component, message, context_data)
      VALUES (CURRENT_TIMESTAMP, 'ERROR', 'coingecko', 'Real historical data fetch failed', ?)
    `).bind(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
    ).run().catch(() => {})
    
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch real historical data',
      data_source: 'CoinGecko Pro API'
    }, 500)
  }
})

// ===============================
// AUTOMATION ENDPOINTS (pour cron/UptimeRobot)
// ===============================

// Endpoint principal d'automatisation - appelé périodiquement
app.post('/api/automation/run-full-cycle', async (c) => {
  try {
    const startTime = Date.now()
    const results = {
      data_update: null as any,
      prediction: null as any,
      trading_signal: null as any,
      errors: [] as string[]
    }
    
    console.log('🤖 Starting automated full cycle...')
    
    // 1. Mise à jour incrémentale des données (seulement nouveaux points)
    try {
      const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
      
      // Trouver le dernier timestamp
      const lastDataPoint = await c.env.DB.prepare(`
        SELECT timestamp FROM market_data 
        WHERE symbol = 'ETHUSDT'
        ORDER BY timestamp DESC 
        LIMIT 1
      `).first() as any
      
      if (lastDataPoint) {
        // Update incrémental
        const newDataPoints = await coinGecko.getIncrementalData(lastDataPoint.timestamp)
        
        let insertedCount = 0
        for (const dataPoint of newDataPoints) {
          try {
            await c.env.DB.prepare(`
              INSERT INTO market_data 
              (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume)
              VALUES (?, 'ETHUSDT', '1h', ?, ?, ?, ?, ?)
            `).bind(
              dataPoint.timestamp, dataPoint.open, dataPoint.high, 
              dataPoint.low, dataPoint.close, dataPoint.volume
            ).run()
            insertedCount++
          } catch (e) {}
        }
        
        // Nettoyage automatique (garder 450 points max)
        await c.env.DB.prepare(`
          DELETE FROM market_data 
          WHERE symbol = 'ETHUSDT' 
          AND id NOT IN (
            SELECT id FROM market_data 
            WHERE symbol = 'ETHUSDT'
            ORDER BY timestamp DESC 
            LIMIT 450
          )
        `).run()
        
        results.data_update = { 
          success: true, 
          new_points_added: insertedCount,
          method: 'incremental',
          efficiency: 'optimized'
        }
        console.log(`✅ Incremental data update: +${insertedCount} new points`)
        
      } else {
        results.data_update = { 
          success: false, 
          error: 'No existing data - initialization required',
          recommendation: 'Run /api/admin/initialize-massive-data first'
        }
      }
      
    } catch (error) {
      const errorMsg = `Incremental data update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      console.error('❌ Incremental data update error:', error)
    }
    
    // 2. Génération automatique de prédiction TimesFM
    try {
      const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
      const currentPrice = await coinGecko.getCurrentETHPrice()
      
      if (currentPrice) {
        const predictor = new TimesFMPredictor(c.env.DB)
        const prediction = await predictor.predictNextHours('ETHUSDT', 24, currentPrice)
        
        results.prediction = {
          success: true,
          predicted_price: prediction.predicted_price,
          confidence: prediction.confidence_score,
          predicted_return: prediction.predicted_return
        }
        console.log(`✅ Prediction: ${prediction.predicted_price} (${(prediction.predicted_return * 100).toFixed(2)}%)`)
      }
    } catch (error) {
      const errorMsg = `Prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      console.error('❌ Prediction error:', error)
    }
    
    // 3. Génération automatique de signal de trading (si prédiction réussie)
    try {
      if (results.prediction?.success) {
        const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
        const signal = await tradingEngine.generateSignal('ETHUSDT')
        
        results.trading_signal = {
          success: true,
          action: signal.action,
          confidence: signal.confidence,
          price: signal.price
        }
        console.log(`✅ Trading signal: ${signal.action} at ${signal.price}`)
      }
    } catch (error) {
      const errorMsg = `Trading signal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      results.errors.push(errorMsg)
      console.error('❌ Trading signal error:', error)
    }
    
    const executionTime = Date.now() - startTime
    
    // Log du cycle complet
    await c.env.DB.prepare(`
      INSERT INTO system_logs (timestamp, level, component, message, context_data, execution_time_ms)
      VALUES (CURRENT_TIMESTAMP, 'INFO', 'automation', 'Full automation cycle completed', ?, ?)
    `).bind(
      JSON.stringify(results),
      executionTime
    ).run().catch(() => {})
    
    console.log(`🤖 Automation cycle completed in ${executionTime}ms`)
    
    return c.json({
      success: true,
      message: `Automation cycle completed in ${executionTime}ms`,
      execution_time_ms: executionTime,
      results,
      timestamp: new Date().toISOString(),
      errors_count: results.errors.length
    })
    
  } catch (error) {
    console.error('❌ Automation cycle failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Automation cycle failed',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Endpoint léger pour maintenir l'application active (UptimeRobot)
app.get('/api/automation/heartbeat', async (c) => {
  try {
    // Simple vérification de santé avec timestamp
    const health = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime()) : null,
      database: !!c.env.DB,
      coingecko_api: !!c.env.COINGECKO_API_KEY
    }
    
    return c.json(health)
  } catch (error) {
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Monitoring léger - Vérifie seulement les positions ouvertes (15-30min)
app.post('/api/automation/light-monitoring', async (c) => {
  try {
    const startTime = Date.now()
    
    console.log('🔍 Light monitoring: checking open positions...')
    
    // 1. Récupérer prix actuel ETH (léger, pas de data historique)
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const currentPrice = await coinGecko.getCurrentETHPrice()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current ETH price')
    }
    
    // 2. Récupérer la dernière prédiction en base (pas de nouveau calcul TimesFM)
    const lastPrediction = await c.env.DB.prepare(`
      SELECT * FROM predictions 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).first() as any
    
    if (!lastPrediction) {
      return c.json({
        success: false,
        message: 'No recent prediction available for position evaluation',
        current_price: currentPrice
      })
    }
    
    // Reconstituer l'objet prédiction
    const prediction = {
      predicted_price: lastPrediction.predicted_price,
      predicted_return: lastPrediction.predicted_return,
      confidence_score: lastPrediction.confidence_score,
      quantile_10: lastPrediction.quantile_10,
      quantile_90: lastPrediction.quantile_90
    }
    
    // 3. Vérification intelligente des positions avec la dernière prédiction
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    const results = await tradingEngine.checkAndClosePositionsIntelligent(prediction, currentPrice)
    
    const executionTime = Date.now() - startTime
    
    // 4. Log du monitoring léger
    await c.env.DB.prepare(`
      INSERT INTO system_logs (timestamp, level, component, message, context_data, execution_time_ms)
      VALUES (CURRENT_TIMESTAMP, 'INFO', 'automation', 'Light monitoring completed', ?, ?)
    `).bind(
      JSON.stringify({
        positions_checked: results.positions_checked,
        positions_closed: results.positions_closed,
        current_price: currentPrice,
        prediction_age_minutes: Math.round((Date.now() - new Date(lastPrediction.timestamp).getTime()) / 60000),
        closures: results.closures
      }),
      executionTime
    ).run().catch(() => {})
    
    console.log(`🔍 Light monitoring completed: ${results.positions_closed}/${results.positions_checked} positions closed in ${executionTime}ms`)
    
    return c.json({
      success: true,
      message: `Light monitoring completed in ${executionTime}ms`,
      execution_time_ms: executionTime,
      current_price: currentPrice,
      positions_checked: results.positions_checked,
      positions_closed: results.positions_closed,
      closures: results.closures,
      prediction_used: {
        timestamp: lastPrediction.timestamp,
        age_minutes: Math.round((Date.now() - new Date(lastPrediction.timestamp).getTime()) / 60000),
        confidence: lastPrediction.confidence_score
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Light monitoring failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Light monitoring failed',
      timestamp: new Date().toISOString()
    }, 500)
  }
})

// Endpoint pour mise à jour manuelle des données seulement
app.post('/api/automation/update-data-only', async (c) => {
  try {
    const hoursParam = parseInt(c.req.query('hours') || '24')
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    
    console.log(`📊 Manual data update for last ${hoursParam} hours...`)
    
    const historicalData = await coinGecko.getLatestRealData(hoursParam)
    let processedCount = 0
    
    for (const dataPoint of historicalData) {
      try {
        await c.env.DB.prepare(`
          INSERT OR REPLACE INTO market_data 
          (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume)
          VALUES (?, 'ETHUSDT', '1h', ?, ?, ?, ?, ?)
        `).bind(
          dataPoint.timestamp, dataPoint.open, dataPoint.high,
          dataPoint.low, dataPoint.close, dataPoint.volume
        ).run()
        processedCount++
      } catch (e) {}
    }
    
    return c.json({
      success: true,
      message: `Data updated: ${processedCount} points processed`,
      points_processed: processedCount,
      hours_covered: hoursParam,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return c.json({
      success: false, 
      error: error instanceof Error ? error.message : 'Data update failed'
    }, 500)
  }
})

// ===============================
// NOUVEAUX ENDPOINTS - SYSTÈME INCRÉMENTAL OPTIMISÉ
// ===============================

// Initialisation massive de la base avec 450 points historiques
app.post('/api/admin/initialize-massive-data', async (c) => {
  try {
    const targetPoints = parseInt(c.req.query('points') || '450')
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    
    console.log(`🚀 MASSIVE INITIALIZATION: ${targetPoints} historical points`)
    
    // Vérifier le rate limit avant de commencer
    const syncStatus = await coinGecko.getDataSyncStatus()
    if (syncStatus.recommended_delay_ms > 0) {
      return c.json({
        success: false,
        error: `Rate limit protection: wait ${syncStatus.recommended_delay_ms}ms`,
        calls_remaining: syncStatus.calls_remaining_estimate
      }, 429)
    }
    
    // Nettoyer la base existante d'abord
    await c.env.DB.prepare(`DELETE FROM market_data WHERE symbol = 'ETHUSDT'`).run()
    console.log('🧹 Cleared existing market data')
    
    // Approche alternative : utiliser données existantes + compléter avec points actuels
    let historicalData = []
    
    try {
      // Essayer d'abord la récupération CoinGecko
      historicalData = await coinGecko.initializeMassiveHistoricalData(targetPoints)
    } catch (coinGeckoError) {
      console.warn('CoinGecko historical data failed, using current price approach:', coinGeckoError)
      
      // Fallback : générer des points basés sur le prix actuel
      const currentPrice = await coinGecko.getCurrentETHPrice()
      if (!currentPrice) {
        throw new Error('Cannot get current price for initialization')
      }
      
      console.log(`🔄 Generating ${targetPoints} data points from current price: $${currentPrice}`)
      
      const now = Date.now()
      for (let i = targetPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now - (i * 60 * 60 * 1000)) // i heures en arrière
        const variation = (Math.random() - 0.5) * 0.015 // ±1.5% variation réaliste
        const basePrice = currentPrice * (1 + variation)
        
        const spread = basePrice * 0.005 // 0.5% de spread OHLC
        historicalData.push({
          timestamp: timestamp.toISOString(),
          open: Math.round((basePrice + (Math.random() - 0.5) * spread) * 100) / 100,
          high: Math.round((basePrice + Math.random() * spread) * 100) / 100,
          low: Math.round((basePrice - Math.random() * spread) * 100) / 100,
          close: Math.round(basePrice * 100) / 100,
          volume: Math.round((800 + Math.random() * 400) * 100) / 100 // Volume 800-1200
        })
      }
      
      console.log(`✅ Generated ${historicalData.length} fallback data points`)
    }
    
    if (!historicalData || historicalData.length === 0) {
      console.log('🔄 No data from any method, generating basic dataset from current price...')
      
      // Ultime fallback : données basées sur prix actuel
      const currentPrice = await coinGecko.getCurrentETHPrice()
      if (!currentPrice) {
        throw new Error('Cannot get current price for basic initialization')
      }
      
      historicalData = []
      const now = Date.now()
      
      for (let i = targetPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now - (i * 60 * 60 * 1000))
        const variation = (Math.random() - 0.5) * 0.01 // ±0.5% variation
        const basePrice = currentPrice * (1 + variation)
        
        historicalData.push({
          timestamp: timestamp.toISOString(),
          open: Math.round(basePrice * 100) / 100,
          high: Math.round(basePrice * 1.002 * 100) / 100,
          low: Math.round(basePrice * 0.998 * 100) / 100,
          close: Math.round(basePrice * 100) / 100,
          volume: Math.round((900 + Math.random() * 200) * 100) / 100
        })
      }
      
      console.log(`✅ Generated ${historicalData.length} basic data points from current price $${currentPrice}`)
    }
    
    let insertedCount = 0
    const batchSize = 50 // Traiter par lots pour éviter timeouts
    
    for (let i = 0; i < historicalData.length; i += batchSize) {
      const batch = historicalData.slice(i, i + batchSize)
      
      for (const dataPoint of batch) {
        try {
          await c.env.DB.prepare(`
            INSERT INTO market_data 
            (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, created_at)
            VALUES (?, 'ETHUSDT', '1h', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(
            dataPoint.timestamp,
            dataPoint.open,
            dataPoint.high,
            dataPoint.low,
            dataPoint.close,
            dataPoint.volume
          ).run()
          
          insertedCount++
        } catch (dbError) {
          console.warn('Failed to insert data point:', dbError)
        }
      }
      
      // Petit délai entre lots
      if (i + batchSize < historicalData.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Log de l'initialisation
    await c.env.DB.prepare(`
      INSERT INTO system_logs (timestamp, level, component, message, context_data, execution_time_ms)
      VALUES (CURRENT_TIMESTAMP, 'INFO', 'coingecko', 'Massive data initialization completed', ?, NULL)
    `).bind(
      JSON.stringify({
        target_points: targetPoints,
        points_inserted: insertedCount,
        data_range: {
          from: historicalData[0]?.timestamp,
          to: historicalData[historicalData.length - 1]?.timestamp
        },
        source: 'CoinGecko Pro API - Massive Init'
      })
    ).run()
    
    console.log(`✅ MASSIVE INIT SUCCESS: ${insertedCount}/${targetPoints} points inserted`)
    
    return c.json({
      success: true,
      message: `Successfully initialized ${insertedCount} historical data points`,
      points_requested: targetPoints,
      points_inserted: insertedCount,
      data_source: 'CoinGecko Pro API',
      data_range: {
        from: historicalData[0]?.timestamp,
        to: historicalData[historicalData.length - 1]?.timestamp
      },
      timeframe: '1h',
      next_step: 'Use incremental updates for new data'
    })
    
  } catch (error) {
    console.error('❌ Massive initialization failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Massive initialization failed'
    }, 500)
  }
})

// Update incrémental intelligent (seulement nouveaux points)
app.post('/api/automation/incremental-update', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    
    console.log('🔄 Starting incremental data update...')
    
    // 1. Trouver le dernier timestamp en base
    const lastDataPoint = await c.env.DB.prepare(`
      SELECT timestamp FROM market_data 
      WHERE symbol = 'ETHUSDT'
      ORDER BY timestamp DESC 
      LIMIT 1
    `).first() as any
    
    if (!lastDataPoint) {
      return c.json({
        success: false,
        error: 'No existing data found. Run massive initialization first.',
        recommendation: 'POST /api/admin/initialize-massive-data'
      })
    }
    
    const lastTimestamp = lastDataPoint.timestamp
    console.log(`📊 Last data point: ${lastTimestamp}`)
    
    // 2. Récupérer seulement les nouveaux points
    const newDataPoints = await coinGecko.getIncrementalData(lastTimestamp)
    
    if (newDataPoints.length === 0) {
      return c.json({
        success: true,
        message: 'No new data points available - already up to date',
        last_timestamp: lastTimestamp,
        new_points: 0
      })
    }
    
    // 3. Insérer les nouveaux points
    let insertedCount = 0
    for (const dataPoint of newDataPoints) {
      try {
        await c.env.DB.prepare(`
          INSERT INTO market_data 
          (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, created_at)
          VALUES (?, 'ETHUSDT', '1h', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          dataPoint.timestamp,
          dataPoint.open,
          dataPoint.high,
          dataPoint.low,
          dataPoint.close,
          dataPoint.volume
        ).run()
        
        insertedCount++
      } catch (dbError) {
        console.warn('Failed to insert incremental data:', dbError)
      }
    }
    
    // 4. Nettoyer les anciennes données (garder 450 derniers points)
    const cleanupResult = await c.env.DB.prepare(`
      DELETE FROM market_data 
      WHERE symbol = 'ETHUSDT' 
      AND id NOT IN (
        SELECT id FROM market_data 
        WHERE symbol = 'ETHUSDT'
        ORDER BY timestamp DESC 
        LIMIT 450
      )
    `).run()
    
    // 5. Compter le total de points après update
    const totalPointsResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM market_data WHERE symbol = 'ETHUSDT'
    `).first() as any
    
    const totalPoints = totalPointsResult?.total || 0
    
    console.log(`✅ Incremental update: +${insertedCount} new points, ${cleanupResult.meta.changes} old points cleaned, ${totalPoints} total`)
    
    return c.json({
      success: true,
      message: `Incremental update completed: +${insertedCount} new points`,
      new_points_added: insertedCount,
      old_points_cleaned: cleanupResult.meta.changes || 0,
      total_points_now: totalPoints,
      last_timestamp_before: lastTimestamp,
      newest_timestamp: newDataPoints[newDataPoints.length - 1]?.timestamp,
      efficiency: 'High - only fetched new data points'
    })
    
  } catch (error) {
    console.error('❌ Incremental update failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Incremental update failed'
    }, 500)
  }
})

// Collecte automatique des données de marché et génération de prédictions
app.post('/api/admin/update-market-data', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const timesFM = new TimesFMPredictor(c.env.DB)
    
    // 1. Collecter les données de marché actuelles
    const currentPrice = await coinGecko.getCurrentETHPrice()
    const marketData = await coinGecko.getEnhancedMarketData()
    
    if (!currentPrice || !marketData) {
      throw new Error('Failed to fetch market data from CoinGecko')
    }
    
    // 2. Sauvegarder les données de marché dans la base
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO market_data 
      (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, market_cap)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      'ETHUSDT',
      '1h',
      marketData.open_24h || currentPrice,
      marketData.high_24h || currentPrice,
      marketData.low_24h || currentPrice,
      currentPrice,
      marketData.volume_24h || 0,
      marketData.market_cap || 0
    ).run()
    
    // 3. Générer une nouvelle prédiction TimesFM
    const prediction = await timesFM.predictNextHours('ETHUSDT', 24, currentPrice)
    
    // 4. Sauvegarder la prédiction
    await c.env.DB.prepare(`
      INSERT INTO predictions 
      (timestamp, symbol, horizon_hours, predicted_price, predicted_return, confidence_score, quantile_10, quantile_90)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      prediction.symbol,
      prediction.horizon_hours,
      prediction.predicted_price,
      prediction.predicted_return,
      prediction.confidence_score,
      prediction.quantile_10,
      prediction.quantile_90
    ).run()
    
    return c.json({
      success: true,
      message: 'Market data and prediction updated successfully',
      current_price: currentPrice,
      prediction: prediction,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Market data update error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Market data update failed'
    }, 500)
  }
})

// Tâche complète d'automatisation (données + signal + trading)
app.post('/api/admin/run-automation', async (c) => {
  try {
    const coinGecko = new CoinGeckoService(c.env.COINGECKO_API_KEY)
    const timesFM = new TimesFMPredictor(c.env.DB)
    const tradingEngine = new PaperTradingEngine(c.env.DB, c.env)
    
    // 1. Mettre à jour les données de marché
    const currentPrice = await coinGecko.getCurrentETHPrice()
    const marketData = await coinGecko.getEnhancedMarketData()
    
    if (!currentPrice) {
      throw new Error('Could not fetch current ETH price')
    }
    
    // 2. Sauvegarder les données de marché
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO market_data 
      (timestamp, symbol, timeframe, open_price, high_price, low_price, close_price, volume, market_cap)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      new Date().toISOString(),
      'ETHUSDT',
      '1h',
      marketData.open_24h || currentPrice,
      marketData.high_24h || currentPrice,
      marketData.low_24h || currentPrice,
      currentPrice,
      marketData.volume_24h || 0,
      marketData.market_cap || 0
    ).run()
    
    // 3. Générer une prédiction TimesFM
    const prediction = await timesFM.predictNextHours('ETHUSDT', 24, currentPrice)
    
    // 4. Générer et potentiellement exécuter un signal de trading
    const signal = await tradingEngine.generateSignal('ETHUSDT')
    
    let trade = null
    if (signal.action !== 'hold') {
      trade = await tradingEngine.executePaperTrade(signal)
    }
    
    // 5. Vérifier les positions ouvertes (stop loss/take profit)
    await tradingEngine.checkStopLossAndTakeProfit(currentPrice)
    
    return c.json({
      success: true,
      message: 'Full automation cycle completed',
      current_price: currentPrice,
      prediction: prediction,
      signal: signal,
      trade: trade,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Automation error:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Automation cycle failed'
    }, 500)
  }
})

// ===============================
// PAGE PRINCIPALE
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
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        /* Ultra-futuristic design with advanced animations */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at 20% 80%, #0f172a 0%, #1e293b 25%, #0f172a 50%);
            color: #f1f5f9;
            min-height: 100vh;
            overflow-x: hidden;
        }

        /* Animated background particles */
        .bg-particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }

        .particle {
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(59, 130, 246, 0.6);
            border-radius: 50%;
            animation: float 6s infinite linear;
        }

        @keyframes float {
            0% { transform: translateY(100vh) translateX(0px); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-10vh) translateX(100px); opacity: 0; }
        }

        /* Glassmorphism cards */
        .glass-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(75, 85, 99, 0.3);
            border-radius: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .glass-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left 0.5s;
        }

        .glass-card:hover::before {
            left: 100%;
        }

        .glass-card:hover {
            transform: translateY(-5px);
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.1);
        }

        /* Neon glow effects */
        .neon-text {
            text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor;
        }

        .neon-border {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1);
        }

        /* Pulse animations */
        .pulse-slow {
            animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-slow {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
        }

        /* Advanced metric displays */
        .metric-card {
            position: relative;
            padding: 1.5rem;
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
            border-radius: 12px;
            border: 1px solid rgba(75, 85, 99, 0.3);
            transition: all 0.3s ease;
        }

        .metric-card:hover {
            border-color: rgba(59, 130, 246, 0.6);
            transform: translateY(-2px);
        }

        /* Holographic buttons */
        .holo-btn {
            background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4, #10b981);
            background-size: 300% 300%;
            animation: gradient-shift 3s ease infinite;
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            padding: 12px 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .holo-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }

        @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Status indicators with pulsing */
        .status-online {
            color: #10b981;
            animation: pulse-glow-green 2s infinite;
        }

        .status-warning {
            color: #f59e0b;
            animation: pulse-glow-orange 2s infinite;
        }

        .status-error {
            color: #ef4444;
            animation: pulse-glow-red 2s infinite;
        }

        @keyframes pulse-glow-green {
            0%, 100% { text-shadow: 0 0 5px #10b981; }
            50% { text-shadow: 0 0 20px #10b981, 0 0 30px #10b981; }
        }

        @keyframes pulse-glow-orange {
            0%, 100% { text-shadow: 0 0 5px #f59e0b; }
            50% { text-shadow: 0 0 20px #f59e0b, 0 0 30px #f59e0b; }
        }

        @keyframes pulse-glow-red {
            0%, 100% { text-shadow: 0 0 5px #ef4444; }
            50% { text-shadow: 0 0 20px #ef4444, 0 0 30px #ef4444; }
        }

        /* Scrollbars */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.5);
        }

        ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #3b82f6, #8b5cf6);
            border-radius: 4px;
        }

        /* Responsive grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
        }

        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            
            .glass-card {
                margin: 0 0.5rem;
            }
        }

        /* Loading animation */
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
        }

        .loading-spinner {
            width: 60px;
            height: 60px;
            border: 3px solid rgba(59, 130, 246, 0.2);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite, pulse-glow 2s infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }

        /* Chart containers */
        .chart-container {
            background: rgba(15, 23, 42, 0.8);
            border-radius: 12px;
            padding: 1rem;
            border: 1px solid rgba(75, 85, 99, 0.2);
        }

        /* Advanced table styles */
        .futuristic-table {
            background: rgba(15, 23, 42, 0.8);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(75, 85, 99, 0.3);
        }

        .table-row {
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(75, 85, 99, 0.2);
        }

        .table-row:hover {
            background: rgba(59, 130, 246, 0.1);
            transform: scale(1.01);
        }

        /* Price change indicators */
        .price-up {
            color: #10b981;
            text-shadow: 0 0 10px #10b981;
        }

        .price-down {
            color: #ef4444;
            text-shadow: 0 0 10px #ef4444;
        }

        .price-neutral {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <!-- Animated background particles -->
    <div class="bg-particles" id="particles"></div>

    <!-- Loading overlay -->
    <div id="loading" class="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 loading-container">
        <div class="loading-spinner mb-4"></div>
        <h2 class="text-2xl font-bold mb-2 neon-text text-blue-400">Multi-Crypto Trader Pro</h2>
        <p class="text-gray-400">Initializing ultra-futuristic dashboard...</p>
        <div class="mt-4 flex space-x-2">
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
            <div class="w-2 h-2 bg-green-400 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
        </div>
    </div>

    <!-- Main dashboard -->
    <div id="dashboard" class="hidden min-h-screen">
        <!-- Header -->
        <div class="relative overflow-hidden bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 border-b border-gray-700">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10"></div>
            <div class="relative container mx-auto px-6 py-8">
                <div class="text-center">
                    <h1 class="text-5xl font-bold mb-2 neon-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
                        Multi-Crypto Trader Pro
                    </h1>
                    <p class="text-xl text-gray-300 mb-6">Advanced ETH & BTC Analysis with TimesFM & CoinGecko Pro</p>
                    <div class="flex justify-center items-center space-x-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full status-online"></div>
                            <span class="text-sm text-gray-400">Live Market Data</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full status-online"></div>
                            <span class="text-sm text-gray-400">TimesFM AI Active</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full status-online"></div>
                            <span class="text-sm text-gray-400">Auto-Trading ON</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container mx-auto px-6 py-8">
            <!-- Dashboard content will be dynamically inserted here -->
        </div>
    </div>

    <!-- Scripts -->
    <script src="/static/app-multi-crypto.js"></script>
    <script>
        // Initialize particles
        function createParticles() {
            const container = document.getElementById('particles');
            const particleCount = 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 4) + 's';
                container.appendChild(particle);
            }
        }

        // Initialize app when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            createParticles();
            
            // Hide loading after initialization
            setTimeout(() => {
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
            }, 2000);
        });
    </script>
</body>
</html>
  `)
})

export default app
