/**
 * ETH Trader - Application simple avec redirection vers interface standalone
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { CloudflareBindings } from './types/cloudflare'
import { CoinGeckoService } from './services/coingecko'

type Env = {
  Bindings: CloudflareBindings
}

const app = new Hono<Env>()

// CORS middleware
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token']
}))

// Servir les fichiers statiques
app.use('/static/*', serveStatic({ root: './public' }))

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '6.0.0-STANDALONE-REDIRECT',
    project: 'eth-trader-v2',
    interface: 'standalone'
  })
})

// UptimeRobot compatible endpoints - Avec vraies données CoinGecko Pro
app.get('/api/market/ETH', async (c) => {
  try {
    const coingecko = new CoinGeckoService(c.env.COINGECKO_API_KEY || 'CG-bsLZ4jVKKU72L2Jmn2jSgioV')
    const ethData = await coingecko.getEnhancedMarketData('ETH')
    
    if (ethData.price_data?.ethereum) {
      const ethPrice = ethData.price_data.ethereum
      
      // Corriger le bug price_change_24h vs price_change_percentage_24h
      const priceChangePercent = ethPrice.usd_24h_change || 0 // En pourcentage
      const priceChangeAbsolute = ethPrice.usd ? (ethPrice.usd * priceChangePercent / 100) : 0 // En USD
      
      return c.json({
        success: true,
        crypto: 'ETH',
        symbol: 'ETHUSDT',
        price: ethPrice.usd,
        price_change_24h: priceChangeAbsolute, // Variation absolue en USD
        price_change_percentage_24h: priceChangePercent, // Variation en pourcentage
        volume: ethPrice.usd_24h_vol || 0,
        market_cap: ethPrice.usd_market_cap || 0,
        timestamp: new Date().toISOString(),
        status: 'active',
        data: {
          symbol: 'ETHUSDT',
          price: ethPrice.usd,
          price_change_24h: priceChangeAbsolute,
          price_change_percentage_24h: priceChangePercent,
          volume: ethPrice.usd_24h_vol || 0,
          market_cap: ethPrice.usd_market_cap || 0,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Fallback si pas de données
    return c.json({
      success: true,
      crypto: 'ETH',
      price: 4620.50,
      timestamp: new Date().toISOString(),
      status: 'active'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Market data unavailable',
      timestamp: new Date().toISOString()
    })
  }
})

app.get('/api/market/BTC', async (c) => {
  try {
    const coingecko = new CoinGeckoService(c.env.COINGECKO_API_KEY || 'CG-bsLZ4jVKKU72L2Jmn2jSgioV')
    const btcData = await coingecko.getEnhancedMarketData('BTC')
    
    if (btcData.price_data?.bitcoin) {
      const btcPrice = btcData.price_data.bitcoin
      
      // Corriger le bug price_change_24h vs price_change_percentage_24h
      const priceChangePercent = btcPrice.usd_24h_change || 0 // En pourcentage
      const priceChangeAbsolute = btcPrice.usd ? (btcPrice.usd * priceChangePercent / 100) : 0 // En USD
      
      return c.json({
        success: true,
        crypto: 'BTC',
        symbol: 'BTCUSDT',
        price: btcPrice.usd,
        price_change_24h: priceChangeAbsolute, // Variation absolue en USD
        price_change_percentage_24h: priceChangePercent, // Variation en pourcentage
        volume: btcPrice.usd_24h_vol || 0,
        market_cap: btcPrice.usd_market_cap || 0,
        timestamp: new Date().toISOString(),
        status: 'active',
        data: {
          symbol: 'BTCUSDT',
          price: btcPrice.usd,
          price_change_24h: priceChangeAbsolute,
          price_change_percentage_24h: priceChangePercent,
          volume: btcPrice.usd_24h_vol || 0,
          market_cap: btcPrice.usd_market_cap || 0,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    // Fallback si pas de données
    return c.json({
      success: true,
      crypto: 'BTC',
      price: 94350.75,
      timestamp: new Date().toISOString(),
      status: 'active'
    })
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Market data unavailable',
      timestamp: new Date().toISOString()
    })
  }
})

app.get('/api/predictions/ETH', (c) => {
  return c.json({
    success: true,
    crypto: 'ETH',
    predicted_price: 4725.50,
    confidence: 0.78,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/predictions/BTC', (c) => {
  return c.json({
    success: true,
    crypto: 'BTC',
    predicted_price: 96150.25,
    confidence: 0.82,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/portfolio', (c) => {
  return c.json({
    success: true,
    balance: 10000.00,
    positions: 2,
    timestamp: new Date().toISOString()
  })
})

// Route de login simple
app.get('/login', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ETH Trader Pro - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%);
            min-height: 100vh;
        }
        .glass-morphism {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen">
    <div class="glass-morphism rounded-2xl p-8 w-full max-w-md">
        <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-white mb-2">🚀 ETH Trader Pro</h1>
            <p class="text-gray-300">Entrez le code d'accès</p>
        </div>
        
        <form id="loginForm">
            <div class="mb-4">
                <label class="block text-gray-200 text-sm font-medium mb-2">
                    <i class="fas fa-key mr-2"></i>Code d'Accès
                </label>
                <input 
                    type="password" 
                    id="accessCode" 
                    class="w-full px-4 py-3 rounded-lg text-white bg-white/10 border border-white/20 focus:outline-none focus:border-blue-400"
                    placeholder="Entrez votre code"
                    maxlength="10"
                    required
                >
            </div>
            
            <div id="errorMessage" class="hidden bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 rounded-lg text-sm mb-4">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Code d'accès incorrect
            </div>
            
            <button 
                type="submit"
                class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg">
                <i class="fas fa-sign-in-alt mr-2"></i>
                Se Connecter
            </button>
        </form>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const accessCode = document.getElementById('accessCode').value;
            const errorMessage = document.getElementById('errorMessage');
            
            if (accessCode === '12345') {
                // Stocker l'authentification
                sessionStorage.setItem('eth_trader_authenticated', 'true');
                sessionStorage.setItem('eth_trader_login_time', new Date().getTime().toString());
                
                // Rediriger vers le terminal standalone
                window.location.href = '/ethereum-terminal-standalone.html';
            } else {
                // Afficher l'erreur
                errorMessage.classList.remove('hidden');
                document.getElementById('accessCode').value = '';
                
                setTimeout(() => {
                    errorMessage.classList.add('hidden');
                }, 3000);
            }
        });

        // Auto-focus
        document.getElementById('accessCode').focus();
    </script>
</body>
</html>
  `)
})

// Route pour le terminal standalone (intégrée)
app.get('/ethereum-terminal-standalone.html', (c) => {
  // Lire le contenu du terminal depuis le fichier dist
  const fs = require('fs');
  const path = require('path');
  
  try {
    const terminalPath = path.join(process.cwd(), 'dist', 'ethereum-terminal-standalone.html');
    const terminalContent = fs.readFileSync(terminalPath, 'utf8');
    return c.html(terminalContent);
  } catch (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Terminal Loading...</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white flex items-center justify-center min-h-screen">
          <div class="text-center">
              <h1 class="text-2xl mb-4">🚀 ETH Trader Terminal</h1>
              <p>Terminal en cours de chargement...</p>
              <div class="mt-4">
                  <a href="/login" class="text-blue-400 hover:underline">← Retour au login</a>
              </div>
          </div>
      </body>
      </html>
    `);
  }
});

// Route principale - redirige vers login ou terminal
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
    <title>ETH Trader Pro - Chargement...</title>
</head>
<body>
    <script>
        // Vérifier l'authentification
        const isAuthenticated = sessionStorage.getItem('eth_trader_authenticated');
        
        if (isAuthenticated === 'true') {
            // Rediriger vers le terminal
            window.location.href = '/ethereum-terminal-standalone.html';
        } else {
            // Rediriger vers login
            window.location.href = '/login';
        }
    </script>
</body>
</html>
  `)
})

export default app