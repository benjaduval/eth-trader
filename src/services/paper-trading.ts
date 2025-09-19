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
      maxPositionSize: 1.0, // 100% du capital disponible
      stopLossPercent: 5,
      takeProfitPercent: 15,
      volatilityTarget: parseFloat(env.VOLATILITY_TARGET || '0.30')
    };
  }

  async generateSignal(symbol: string = 'ETHUSDT', currentPrice?: number): Promise<TradingSignal> {
    try {
      // Récupérer la dernière prédiction depuis la base
      const lastPrediction = await this.db.prepare(`
        SELECT * FROM predictions 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `).bind(symbol).first() as any;

      if (!lastPrediction) {
        throw new Error('No recent prediction available');
      }

      // Utiliser le prix fourni en paramètre ou récupérer depuis la base de données
      let priceToUse = currentPrice;
      if (!priceToUse) {
        const latestMarketData = await this.db.prepare(`
          SELECT close_price FROM market_data 
          WHERE symbol = ? 
          ORDER BY timestamp DESC 
          LIMIT 1
        `).bind(symbol).first() as any;

        priceToUse = latestMarketData?.close_price || lastPrediction.predicted_price;
      }
      
      const predictedReturn = lastPrediction.predicted_return;
      const confidence = lastPrediction.confidence_score;
      
      // Logique de génération de signal - CRITÈRES MIS À JOUR
      let action: 'buy' | 'sell' | 'hold' = 'hold';
      
      // Nouveaux seuils selon vos spécifications :
      // - Différence de plus de 1.2% avec le prix actuel
      // - Indice de confiance de 60% minimum
      const minConfidence = 0.6; // > 60% de confiance requis (NOUVEAU)
      const minReturnThreshold = 0.012; // > 1.2% de retour prédit requis
      
      // Calculer la différence de prix prédite
      const predictedPrice = lastPrediction.predicted_price;
      const priceDifference = Math.abs(predictedPrice - priceToUse) / priceToUse;
      
      // NOUVELLE LOGIQUE : Différence de prix + confiance
      if (confidence >= minConfidence && priceDifference >= minReturnThreshold) {
        if (predictedReturn > minReturnThreshold) {
          action = 'buy';
        } else if (predictedReturn < -minReturnThreshold) {
          action = 'sell';
        }
      }
      
      // AMÉLIORATION : Fermeture intelligente des positions
      // Si TimesFM semble moins sûr (confiance < 50%), on peut fermer les positions
      const shouldClosePositions = confidence < 0.5 && Math.abs(predictedReturn) < 0.005;
      
      if (shouldClosePositions) {
        // On peut ajouter une logique pour fermer les positions existantes
        // Cette logique sera implémentée dans une méthode séparée
        await this.checkLowConfidencePositions(symbol, confidence);
      }

      // Calculer les niveaux de stop loss et take profit
      const stopLoss = action === 'buy' 
        ? priceToUse * (1 - this.config.stopLossPercent / 100)
        : priceToUse * (1 + this.config.stopLossPercent / 100);

      const takeProfit = action === 'buy'
        ? priceToUse * (1 + this.config.takeProfitPercent / 100)
        : priceToUse * (1 - this.config.takeProfitPercent / 100);

      return {
        action,
        confidence,
        price: priceToUse,
        timestamp: new Date(),
        symbol: symbol,
        predicted_return: predictedReturn,
        predicted_price: predictedPrice,
        price_difference_percent: priceDifference * 100,
        stop_loss: action !== 'hold' ? stopLoss : undefined,
        take_profit: action !== 'hold' ? takeProfit : undefined,
        should_close_low_confidence: shouldClosePositions || false
      };
    } catch (error) {
      console.error('Error generating signal:', error);
      return {
        action: 'hold',
        confidence: 0,
        price: 0,
        timestamp: new Date(),
        symbol: symbol
      };
    }
  }

  // Méthode pour vérifier si une position doit être fermée (stop loss/take profit)
  async shouldClosePosition(position: PaperTrade, currentPrice: number): Promise<{close: boolean, reason?: string}> {
    try {
      if (position.status !== 'open') {
        return { close: false }
      }
      
      // Vérifier stop loss
      if (position.stop_loss_price) {
        if (position.side === 'long' && currentPrice <= position.stop_loss_price) {
          return { close: true, reason: 'stop_loss' }
        }
        if (position.side === 'short' && currentPrice >= position.stop_loss_price) {
          return { close: true, reason: 'stop_loss' }
        }
      }
      
      // Vérifier take profit
      if (position.take_profit_price) {
        if (position.side === 'long' && currentPrice >= position.take_profit_price) {
          return { close: true, reason: 'take_profit' }
        }
        if (position.side === 'short' && currentPrice <= position.take_profit_price) {
          return { close: true, reason: 'take_profit' }
        }
      }
      
      return { close: false }
      
    } catch (error) {
      console.error('Error checking position closure conditions:', error)
      return { close: false }
    }
  }

  // Nouvelle méthode pour gérer les positions à faible confiance
  async checkLowConfidencePositions(symbol: string, confidence: number): Promise<void> {
    try {
      // Récupérer les positions ouvertes pour ce symbol
      const openPositions = await this.getActivePositions(symbol);
      
      if (openPositions.length === 0) return;
      
      // Si la confiance est très faible (< 0.4), fermer toutes les positions
      if (confidence < 0.4) {
        console.log(`Low confidence (${confidence}), closing all positions for ${symbol}`);
        
        for (const position of openPositions) {
          // Récupérer le prix actuel
          const latestMarketData = await this.db.prepare(`
            SELECT close_price FROM market_data 
            WHERE symbol = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
          `).bind(symbol).first() as any;
          
          const currentPrice = latestMarketData?.close_price;
          if (currentPrice && position.id) {
            await this.closePosition(position.id, currentPrice, 'low_confidence');
          }
        }
      }
      
      // Log de l'action
      await this.db.prepare(`
        INSERT INTO system_logs 
        (timestamp, level, component, message, context_data)
        VALUES (CURRENT_TIMESTAMP, 'INFO', 'trading', 'Low confidence position check', ?)
      `).bind(JSON.stringify({
        symbol,
        confidence,
        open_positions: openPositions.length,
        action: confidence < 0.4 ? 'positions_closed' : 'no_action'
      })).run();
      
    } catch (error) {
      console.error('Error checking low confidence positions:', error);
    }
  }

  async executePaperTrade(signal: TradingSignal): Promise<PaperTrade | null> {
    if (signal.action === 'hold') {
      return null;
    }

    try {
      // Vérifier s'il y a déjà une position ouverte pour ce symbol
      const existingPosition = await this.getActivePosition(signal.symbol);
      
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

      // Calculer la taille de position (100% du capital disponible pour ce symbol)
      const currentBalance = await this.getCurrentBalance(signal.symbol);
      const maxPositionValue = currentBalance * this.config.maxPositionSize;
      const quantity = maxPositionValue / signal.price;
      const fees = (maxPositionValue * this.config.feesPerSide) / 10000; // basis points to decimal

      // Créer la nouvelle position
      const trade: PaperTrade = {
        symbol: signal.symbol,
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

      console.log(`✅ Paper trade executed: ${signal.action} ${quantity.toFixed(4)} ${signal.symbol} at $${signal.price}`);
      
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

      console.log(`✅ Position closed: ${trade.side} ${trade.quantity.toFixed(4)} ${trade.symbol} - P&L: $${netPnl.toFixed(2)}`);

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

  async getActivePosition(symbol?: string): Promise<PaperTrade | null> {
    try {
      let query = `SELECT * FROM paper_trades WHERE status = 'open'`;
      const params: any[] = [];
      
      if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
      }
      
      query += ` ORDER BY opened_at DESC LIMIT 1`;
      
      const result = params.length > 0 
        ? await this.db.prepare(query).bind(...params).first()
        : await this.db.prepare(query).first();

      return result as PaperTrade | null;
    } catch (error) {
      console.error('Error getting active position:', error);
      return null;
    }
  }

  async getActivePositions(symbol?: string): Promise<PaperTrade[]> {
    try {
      let query = `SELECT * FROM paper_trades WHERE status = 'open'`;
      const params: any[] = [];
      
      if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
      }
      
      query += ` ORDER BY opened_at DESC`;
      
      const result = params.length > 0 
        ? await this.db.prepare(query).bind(...params).all()
        : await this.db.prepare(query).all();

      return result.results as PaperTrade[];
    } catch (error) {
      console.error('Error getting active positions:', error);
      return [];
    }
  }

  async getCurrentBalance(symbol?: string): Promise<number> {
    try {
      let query = `SELECT COALESCE(SUM(net_pnl), 0) as total_pnl FROM paper_trades WHERE status = 'closed'`;
      const params: any[] = [];
      
      if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
      }
      
      const result = params.length > 0
        ? await this.db.prepare(query).bind(...params).first()
        : await this.db.prepare(query).first();

      return this.config.initialBalance + ((result as any)?.total_pnl || 0);
    } catch (error) {
      console.error('Error getting current balance:', error);
      return this.config.initialBalance;
    }
  }

  async getPerformanceMetrics(days: number = 30, symbol?: string): Promise<PerformanceMetrics> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      let query = `
        SELECT 
          COUNT(*) as total_trades,
          SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
          SUM(CASE WHEN net_pnl <= 0 THEN 1 ELSE 0 END) as losing_trades,
          COALESCE(SUM(gross_pnl), 0) as total_pnl,
          COALESCE(SUM(net_pnl), 0) as net_pnl,
          COALESCE(AVG(CASE WHEN net_pnl > 0 THEN net_pnl END), 0) as avg_win,
          COALESCE(AVG(CASE WHEN net_pnl <= 0 THEN ABS(net_pnl) END), 0) as avg_loss
        FROM paper_trades 
        WHERE status = 'closed' AND closed_at >= ?`;
      
      const params: any[] = [since.toISOString()];
      
      if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
      }
      
      const result = await this.db.prepare(query).bind(...params).first() as any;

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

  async getRecentTrades(limit: number = 10, symbol?: string): Promise<PaperTrade[]> {
    try {
      let query = `SELECT * FROM paper_trades WHERE status = 'closed'`;
      const params: any[] = [];
      
      if (symbol) {
        query += ` AND symbol = ?`;
        params.push(symbol);
      }
      
      query += ` ORDER BY closed_at DESC LIMIT ?`;
      params.push(limit);
      
      const result = await this.db.prepare(query).bind(...params).all();

      return result.results as PaperTrade[];
    } catch (error) {
      console.error('Error getting recent trades:', error);
      return [];
    }
  }

  // ===============================
  // NOUVELLES MÉTHODES - FERMETURE INTELLIGENTE
  // ===============================

  /**
   * Calcule la probabilité qu'une position atteigne son take-profit
   * basée sur la prédiction TimesFM et la distance au target
   */
  calculateProfitProbability(position: any, prediction: TimesFMPrediction, currentPrice: number): number {
    try {
      const { side, entry_price, take_profit_price } = position;
      
      if (!take_profit_price) return 0.5; // Si pas de TP défini, neutralité
      
      // Distance à parcourir pour atteindre le TP (en %)
      const distanceToTP = side === 'long' 
        ? (take_profit_price - currentPrice) / currentPrice
        : (currentPrice - take_profit_price) / currentPrice;
      
      // Prédiction alignée avec la direction de la position
      const alignedReturn = side === 'long' 
        ? prediction.predicted_return 
        : -prediction.predicted_return;
      
      // Facteurs influençant la probabilité
      const confidenceFactor = prediction.confidence_score; // 0-1
      const returnFactor = alignedReturn > 0 ? Math.min(alignedReturn / distanceToTP, 2) : 0; // Max 2x boost
      const timeFactor = 0.8; // Décote pour l'incertitude temporelle
      
      // Calcul probabilité composite
      let probability = (confidenceFactor * 0.5) + (returnFactor * 0.3) + (timeFactor * 0.2);
      probability = Math.max(0, Math.min(1, probability)); // Clamp entre 0-1
      
      return probability;
    } catch (error) {
      console.warn('Error calculating profit probability:', error);
      return 0.5; // Valeur neutre en cas d'erreur
    }
  }

  /**
   * Évalue si une position doit être fermée selon les critères intelligents (legacy)
   */
  shouldClosePositionWithPrediction(position: any, prediction: TimesFMPrediction, currentPrice: number): {
    shouldClose: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    try {
      // 1. Vérifications classiques (stop-loss/take-profit)
      if (position.stop_loss_price) {
        const hitStopLoss = (position.side === 'long' && currentPrice <= position.stop_loss_price) ||
                           (position.side === 'short' && currentPrice >= position.stop_loss_price);
        if (hitStopLoss) reasons.push('stop_loss');
      }
      
      if (position.take_profit_price) {
        const hitTakeProfit = (position.side === 'long' && currentPrice >= position.take_profit_price) ||
                             (position.side === 'short' && currentPrice <= position.take_profit_price);
        if (hitTakeProfit) reasons.push('take_profit');
      }
      
      // 2. NOUVEAU: Confiance TimesFM trop faible
      if (prediction.confidence_score < 0.3) { // Ajusté selon nouveaux seuils (50% -> 30% fermeture)
        reasons.push('low_confidence');
      }
      
      // 3. NOUVEAU: Probabilité de profit trop faible
      const profitProb = this.calculateProfitProbability(position, prediction, currentPrice);
      if (profitProb < 0.4) {
        reasons.push('low_profit_probability');
      }
      
      // 4. NOUVEAU: Prédiction défavorable forte
      const positionDirection = position.side === 'long' ? 1 : -1;
      const expectedReturn = prediction.predicted_return * positionDirection;
      if (expectedReturn < -0.015) { // -1.5% contre la position
        reasons.push('negative_outlook');
      }
      
      // 5. NOUVEAU: Signal opposé (basé sur nouvelle prédiction)
      const newSignal = this.evaluateSignalFromPrediction(prediction);
      const oppositeSignal = (position.side === 'long' && newSignal === 'sell') ||
                            (position.side === 'short' && newSignal === 'buy');
      if (oppositeSignal) {
        reasons.push('opposite_signal');
      }
      
      return {
        shouldClose: reasons.length > 0,
        reasons
      };
      
    } catch (error) {
      console.error('Error evaluating position closure:', error);
      return { shouldClose: false, reasons: ['evaluation_error'] };
    }
  }

  /**
   * Évalue le signal de trading basé sur une prédiction (sans ouvrir de position)
   */
  private evaluateSignalFromPrediction(prediction: TimesFMPrediction): 'buy' | 'sell' | 'hold' {
    const { predicted_return, confidence_score } = prediction;
    const minConfidence = 0.5; // > 50% de confiance requis
    const minReturnThreshold = 0.012; // > 1.2% de retour prédit requis
    
    if (confidence_score >= minConfidence) {
      if (predicted_return > minReturnThreshold) return 'buy';
      if (predicted_return < -minReturnThreshold) return 'sell';
    }
    
    return 'hold';
  }

  /**
   * Vérifie et ferme les positions selon les critères intelligents
   * Version légère pour monitoring fréquent (15-30min)
   */
  async checkAndClosePositionsIntelligent(prediction: TimesFMPrediction, currentPrice: number): Promise<{
    positions_checked: number;
    positions_closed: number;
    closures: Array<{ id: number; reasons: string[]; pnl: number }>;
  }> {
    try {
      // Récupérer toutes les positions ouvertes
      const openPositions = await this.db.prepare(`
        SELECT * FROM paper_trades WHERE status = 'open'
      `).all();
      
      const results = {
        positions_checked: openPositions.results.length,
        positions_closed: 0,
        closures: [] as Array<{ id: number; reasons: string[]; pnl: number }>
      };
      
      for (const position of openPositions.results) {
        const trade = position as any;
        
        // Évaluer si la position doit être fermée
        const evaluation = this.shouldClosePositionWithPrediction(trade, prediction, currentPrice);
        
        if (evaluation.shouldClose) {
          try {
            // Fermer la position
            const closedTrade = await this.closePosition(
              trade.id, 
              currentPrice, 
              evaluation.reasons.join(',')
            );
            
            results.positions_closed++;
            results.closures.push({
              id: trade.id,
              reasons: evaluation.reasons,
              pnl: closedTrade.net_pnl || 0
            });
            
            // Log de la fermeture intelligente
            await this.db.prepare(`
              INSERT INTO system_logs (timestamp, level, component, message, context_data)
              VALUES (CURRENT_TIMESTAMP, 'INFO', 'trading', 'Intelligent position closure', ?)
            `).bind(
              JSON.stringify({
                position_id: trade.id,
                side: trade.side,
                entry_price: trade.entry_price,
                exit_price: currentPrice,
                reasons: evaluation.reasons,
                pnl: closedTrade.net_pnl || 0,
                profit_probability: this.calculateProfitProbability(trade, prediction, currentPrice)
              })
            ).run().catch(() => {});
            
            console.log(`🧠 Intelligent closure: ${trade.side} position (${evaluation.reasons.join(',')}) - P&L: $${(closedTrade.net_pnl || 0).toFixed(2)}`);
            
          } catch (closeError) {
            console.error(`Error closing position ${trade.id}:`, closeError);
          }
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error in intelligent position check:', error);
      return {
        positions_checked: 0,
        positions_closed: 0,
        closures: []
      };
    }
  }
}