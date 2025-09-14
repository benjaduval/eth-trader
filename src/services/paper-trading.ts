/**
 * Paper Trading Engine pour Cloudflare Workers
 * Gestion des positions, P&L et métriques de performance
 */

import type { CloudflareBindings, TradingSignal, PaperTrade, PerformanceMetrics, TimesFMPrediction } from '../types/cloudflare';

interface TradingConfig {
  initialBalance: number;
  feesPerSide: number; // Basis points (8 = 0.08%)
  maxPositionSize: number; // Pourcentage du portfolio (0.1 = 10%)
  stopLossPercent: number; // 5 = 5%
  takeProfitPercent: number; // 10 = 10%
  volatilityTarget: number; // 0.3 = 30%
}

export class PaperTradingEngine {
  private db: D1Database;
  private config: TradingConfig;

  constructor(db: D1Database, env: CloudflareBindings) {
    this.db = db;
    
    this.config = {
      initialBalance: parseFloat(env.INITIAL_BALANCE || '10000'),
      feesPerSide: parseFloat(env.FEES_BPS_PER_SIDE || '8'),
      maxPositionSize: 0.95, // 95% max du portfolio
      stopLossPercent: 5,
      takeProfitPercent: 15,
      volatilityTarget: parseFloat(env.VOLATILITY_TARGET || '0.30')
    };
  }

  async generateSignal(prediction: TimesFMPrediction, currentPrice: number): Promise<TradingSignal> {
    try {
      const predictedReturn = prediction.predicted_return;
      const confidence = prediction.confidence_score;
      
      // Logique de génération de signal
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      
      // Seuils basés sur la confiance et le retour prédit
      const minConfidence = 0.6;
      const minReturnThreshold = 0.02; // 2%
      
      if (confidence >= minConfidence) {
        if (predictedReturn > minReturnThreshold) {
          action = 'buy';
        } else if (predictedReturn < -minReturnThreshold) {
          action = 'sell';
        }
      }

      // Calculer les niveaux de stop loss et take profit
      const stopLoss = action === 'buy' 
        ? currentPrice * (1 - this.config.stopLossPercent / 100)
        : currentPrice * (1 + this.config.stopLossPercent / 100);

      const takeProfit = action === 'buy'
        ? currentPrice * (1 + this.config.takeProfitPercent / 100)
        : currentPrice * (1 - this.config.takeProfitPercent / 100);

      return {
        action,
        confidence,
        price: currentPrice,
        timestamp: new Date(),
        predicted_return: predictedReturn,
        stop_loss: action !== 'hold' ? stopLoss : undefined,
        take_profit: action !== 'hold' ? takeProfit : undefined
      };
    } catch (error) {
      console.error('Error generating signal:', error);
      return {
        action: 'hold',
        confidence: 0,
        price: currentPrice,
        timestamp: new Date()
      };
    }
  }

  async executePaperTrade(signal: TradingSignal): Promise<PaperTrade | null> {
    if (signal.action === 'hold') {
      return null;
    }

    try {
      // Vérifier s'il y a déjà une position ouverte
      const existingPosition = await this.getActivePosition();
      
      if (existingPosition) {
        // Fermer la position existante si signal opposé
        const shouldClose = (
          (existingPosition.side === 'long' && signal.action === 'sell') ||
          (existingPosition.side === 'short' && signal.action === 'buy')
        );
        
        if (shouldClose) {
          await this.closePosition(existingPosition.id!, signal.price, 'signal_change');
        } else {
          // Déjà une position dans la même direction
          console.log('Position already open in same direction');
          return null;
        }
      }

      // Calculer la taille de position
      const currentBalance = await this.getCurrentBalance();
      const maxPositionValue = currentBalance * this.config.maxPositionSize;
      const quantity = maxPositionValue / signal.price;
      const fees = (maxPositionValue * this.config.feesPerSide) / 10000; // basis points to decimal

      // Créer la nouvelle position
      const trade: PaperTrade = {
        symbol: 'ETHUSDT',
        side: signal.action === 'buy' ? 'long' : 'short',
        entry_price: signal.price,
        quantity: quantity,
        status: 'open',
        fees: fees,
        opened_at: new Date()
      };

      // Enregistrer en base
      const result = await this.db.prepare(`
        INSERT INTO paper_trades 
        (symbol, side, entry_price, quantity, status, fees, opened_at, stop_loss_price, take_profit_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        trade.symbol,
        trade.side,
        trade.entry_price,
        trade.quantity,
        trade.status,
        trade.fees,
        trade.opened_at.toISOString(),
        signal.stop_loss || null,
        signal.take_profit || null
      ).run();

      trade.id = result.meta.last_row_id as number;

      console.log(`✅ Paper trade executed: ${signal.action} ${quantity.toFixed(4)} ETH at $${signal.price}`);
      
      return trade;
    } catch (error) {
      console.error('Error executing paper trade:', error);
      throw error;
    }
  }

  async closePosition(tradeId: number, exitPrice: number, exitReason: string): Promise<PaperTrade> {
    try {
      // Récupérer la position
      const result = await this.db.prepare(`
        SELECT * FROM paper_trades WHERE id = ? AND status = 'open'
      `).bind(tradeId).first();

      if (!result) {
        throw new Error(`No open position found with id ${tradeId}`);
      }

      const trade = result as any;

      // Calculer P&L
      const priceDiff = trade.side === 'long' 
        ? exitPrice - trade.entry_price
        : trade.entry_price - exitPrice;
      
      const grossPnl = priceDiff * trade.quantity;
      const exitFees = (exitPrice * trade.quantity * this.config.feesPerSide) / 10000;
      const totalFees = trade.fees + exitFees;
      const netPnl = grossPnl - totalFees;

      // Mettre à jour la position
      await this.db.prepare(`
        UPDATE paper_trades 
        SET exit_price = ?, status = 'closed', gross_pnl = ?, fees = ?, net_pnl = ?, 
            closed_at = ?, exit_reason = ?
        WHERE id = ?
      `).bind(
        exitPrice,
        grossPnl,
        totalFees,
        netPnl,
        new Date().toISOString(),
        exitReason,
        tradeId
      ).run();

      console.log(`✅ Position closed: ${trade.side} ${trade.quantity.toFixed(4)} ETH - P&L: $${netPnl.toFixed(2)}`);

      return {
        ...trade,
        exit_price: exitPrice,
        gross_pnl: grossPnl,
        fees: totalFees,
        net_pnl: netPnl,
        closed_at: new Date(),
        exit_reason: exitReason,
        status: 'closed'
      };
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  }

  async checkStopLossAndTakeProfit(currentPrice: number): Promise<void> {
    try {
      const openPositions = await this.db.prepare(`
        SELECT * FROM paper_trades 
        WHERE status = 'open' AND (stop_loss_price IS NOT NULL OR take_profit_price IS NOT NULL)
      `).all();

      for (const position of openPositions.results) {
        const trade = position as any;
        let shouldClose = false;
        let exitReason = '';

        // Vérifier stop loss
        if (trade.stop_loss_price) {
          if (
            (trade.side === 'long' && currentPrice <= trade.stop_loss_price) ||
            (trade.side === 'short' && currentPrice >= trade.stop_loss_price)
          ) {
            shouldClose = true;
            exitReason = 'stop_loss';
          }
        }

        // Vérifier take profit
        if (trade.take_profit_price && !shouldClose) {
          if (
            (trade.side === 'long' && currentPrice >= trade.take_profit_price) ||
            (trade.side === 'short' && currentPrice <= trade.take_profit_price)
          ) {
            shouldClose = true;
            exitReason = 'take_profit';
          }
        }

        if (shouldClose) {
          await this.closePosition(trade.id, currentPrice, exitReason);
        }
      }
    } catch (error) {
      console.error('Error checking stop loss/take profit:', error);
    }
  }

  async getActivePosition(): Promise<PaperTrade | null> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM paper_trades WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1
      `).first();

      return result as PaperTrade | null;
    } catch (error) {
      console.error('Error getting active position:', error);
      return null;
    }
  }

  async getActivePositions(): Promise<PaperTrade[]> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM paper_trades WHERE status = 'open' ORDER BY opened_at DESC
      `).all();

      return result.results as PaperTrade[];
    } catch (error) {
      console.error('Error getting active positions:', error);
      return [];
    }
  }

  async getCurrentBalance(): Promise<number> {
    try {
      // Calculer le balance basé sur les trades fermés
      const result = await this.db.prepare(`
        SELECT COALESCE(SUM(net_pnl), 0) as total_pnl FROM paper_trades WHERE status = 'closed'
      `).first() as any;

      return this.config.initialBalance + (result?.total_pnl || 0);
    } catch (error) {
      console.error('Error getting current balance:', error);
      return this.config.initialBalance;
    }
  }

  async getPerformanceMetrics(days: number = 30): Promise<PerformanceMetrics> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const result = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_trades,
          SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
          SUM(CASE WHEN net_pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
          COALESCE(SUM(gross_pnl), 0) as total_pnl,
          COALESCE(SUM(net_pnl), 0) as net_pnl,
          COALESCE(AVG(CASE WHEN net_pnl > 0 THEN net_pnl END), 0) as avg_win,
          COALESCE(AVG(CASE WHEN net_pnl <= 0 THEN ABS(net_pnl) END), 0) as avg_loss
        FROM paper_trades 
        WHERE status = 'closed' AND closed_at >= ?
      `).bind(since.toISOString()).first() as any;

      const totalTrades = result?.total_trades || 0;
      const winningTrades = result?.winning_trades || 0;
      const losingTrades = result?.losing_trades || 0;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
      const avgWin = result?.avg_win || 0;
      const avgLoss = result?.avg_loss || 0;
      const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

      // Calculer le drawdown maximum (approximation simple)
      const maxDrawdown = await this.calculateMaxDrawdown();

      return {
        total_trades: totalTrades,
        winning_trades: winningTrades,
        losing_trades: losingTrades,
        win_rate: winRate,
        total_pnl: result?.total_pnl || 0,
        net_pnl: result?.net_pnl || 0,
        max_drawdown: maxDrawdown,
        profit_factor: profitFactor
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0,
        total_pnl: 0,
        net_pnl: 0,
        max_drawdown: 0,
        profit_factor: 0
      };
    }
  }

  private async calculateMaxDrawdown(): Promise<number> {
    try {
      // Récupérer tous les trades fermés par ordre chronologique
      const trades = await this.db.prepare(`
        SELECT net_pnl, closed_at FROM paper_trades 
        WHERE status = 'closed' 
        ORDER BY closed_at ASC
      `).all();

      if (!trades.results.length) return 0;

      let runningBalance = this.config.initialBalance;
      let maxBalance = runningBalance;
      let maxDrawdown = 0;

      for (const trade of trades.results) {
        const tradeData = trade as any;
        runningBalance += tradeData.net_pnl;
        
        if (runningBalance > maxBalance) {
          maxBalance = runningBalance;
        }
        
        const currentDrawdown = (maxBalance - runningBalance) / maxBalance;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }
      }

      return maxDrawdown;
    } catch (error) {
      console.error('Error calculating max drawdown:', error);
      return 0;
    }
  }

  async getRecentTrades(limit: number = 10): Promise<PaperTrade[]> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM paper_trades 
        WHERE status = 'closed'
        ORDER BY closed_at DESC 
        LIMIT ?
      `).bind(limit).all();

      return result.results as PaperTrade[];
    } catch (error) {
      console.error('Error getting recent trades:', error);
      return [];
    }
  }
}