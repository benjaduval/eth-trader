/**
 * Configuration PM2 pour ETH Trader
 * Optimisé pour développement local dans le sandbox
 */

module.exports = {
  apps: [
    {
      name: 'eth-trader',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=eth-trader-production --local --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      
      // Variables d'environnement (sera surchargé par .dev.vars)
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        TRADING_MODE: 'paper',
        INITIAL_BALANCE: '10000',
        FEES_BPS_PER_SIDE: '8',
        VOLATILITY_TARGET: '0.30'
      },
      
      // Configuration PM2
      instances: 1,
      exec_mode: 'fork',
      watch: false, // Wrangler gère déjà le hot reload
      
      // Logs
      log_file: './logs/eth-trader.log',
      out_file: './logs/eth-trader.out',
      error_file: './logs/eth-trader.error',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Monitoring
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Instance configuration
      combine_logs: true,
      merge_logs: true,
      
      // Ignore ces signaux pour éviter les redémarrages intempestifs
      kill_retry_time: 100,
      
      // Variables spécifiques au sandbox
      node_args: '--max-old-space-size=1024'
    }
  ]
}