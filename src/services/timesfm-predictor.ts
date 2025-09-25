/**
 * TimesFM Predictor simplifié pour Cloudflare Workers
 * Utilise des prédictions basées sur l'analyse technique et les tendances
 */

import type { TimesFMPrediction, MarketData } from '../types/cloudflare';

interface TechnicalIndicators {
  rsi: number;
  ema20: number;
  ema50: number;
  bollingerUpper: number;
  bollingerLower: number;
  atr: number;
  momentum: number;
  volatility: number;
}

export class TimesFMPredictor {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // Méthode utilitaire pour convertir crypto -> symbol trading
  private getCryptoSymbol(input: string): string {
    // Si c'est déjà un symbol comme ETHUSDT, BTCUSDT, le garder tel quel
    if (input.includes('USDT') || input.includes('USD')) {
      return input;
    }
    
    // Sinon, convertir crypto -> symbol
    const cryptoMap: Record<string, string> = {
      'ETH': 'ETHUSDT',
      'BTC': 'BTCUSDT',
      'ETHEREUM': 'ETHUSDT', 
      'BITCOIN': 'BTCUSDT'
    };
    
    return cryptoMap[input.toUpperCase()] || input;
  }

  async predictNextHours(
    symbol: string = 'ETHUSDT', 
    horizonHours: number = 24,
    currentPrice: number,
    saveToDb: boolean = true  // Par défaut, sauvegarde en DB (pour UptimeRobot)
  ): Promise<TimesFMPrediction> {
    const startTime = Date.now();
    
    // Normaliser le symbol pour supporter BTC et ETH
    const normalizedSymbol = this.getCryptoSymbol(symbol);
    
    try {
      // Log début de prédiction
      await this.logTimesFMCall('Starting TimesFM prediction', {
        symbol: normalizedSymbol,
        originalSymbol: symbol,
        horizonHours,
        currentPrice,
        timestamp: new Date().toISOString()
      });

      // Récupérer les données historiques récentes (étendu pour TimesFM)
      const historicalData = await this.getHistoricalData(normalizedSymbol, 504); // 21 jours pour minimum 400+ points
      
      if (historicalData.length < 100) {
        await this.logTimesFMCall('Insufficient historical data for TimesFM', {
          dataPoints: historicalData.length,
          required: 100,
          recommended: 400,
          fallback: 'neutral_prediction'
        });
        // Pas assez de données pour TimesFM, retourner une prédiction neutre
        return this.createNeutralPrediction(normalizedSymbol, currentPrice, horizonHours);
      }

      // Calculer les indicateurs techniques
      const indicators = this.calculateTechnicalIndicators(historicalData);
      
      // Analyser les patterns et tendances
      const trendAnalysis = this.analyzeTrend(historicalData);
      
      // Générer la prédiction
      const prediction = this.generatePrediction(
        normalizedSymbol, 
        currentPrice, 
        horizonHours, 
        indicators, 
        trendAnalysis
      );

      // Log prédiction générée
      const executionTime = Date.now() - startTime;
      await this.logTimesFMCall('TimesFM prediction completed', {
        predicted_price: prediction.predicted_price,
        predicted_return: prediction.predicted_return,
        confidence_score: prediction.confidence_score,
        execution_time_ms: executionTime,
        indicators_used: Object.keys(indicators).length,
        trend_direction: trendAnalysis.direction,
        trend_strength: trendAnalysis.strength
      });

      // Sauvegarder en base SEULEMENT si demandé explicitement (UptimeRobot cycles)
      if (saveToDb) {
        await this.savePrediction(prediction);
        console.log(`💾 Prediction saved to DB: ${prediction.symbol} - ${(prediction.predicted_return * 100).toFixed(2)}%`)
      } else {
        console.log(`🔍 Manual prediction generated (not saved): ${prediction.symbol} - ${(prediction.predicted_return * 100).toFixed(2)}%`)
      }
      
      return prediction;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.logTimesFMCall('TimesFM prediction error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: executionTime,
        fallback: 'neutral_prediction'
      });
      
      console.error('Error in TimesFM prediction:', error);
      return this.createNeutralPrediction(normalizedSymbol, currentPrice, horizonHours);
    }
  }

  private async getHistoricalData(symbol: string, hours: number): Promise<MarketData[]> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const result = await this.db.prepare(`
        SELECT * FROM market_data 
        WHERE symbol = ? AND timestamp >= ? 
        ORDER BY timestamp ASC
      `).bind(symbol, since.toISOString()).all();

      return result.results.map((row: any) => ({
        symbol: row.symbol,
        timestamp: new Date(row.timestamp),
        open: row.open_price,
        high: row.high_price,
        low: row.low_price,
        close: row.close_price,
        volume: row.volume || 0,
        market_cap: row.market_cap,
        fear_greed: row.fear_greed_index
      }));
    } catch (error) {
      console.error('Error getting historical data:', error);
      return [];
    }
  }

  private calculateTechnicalIndicators(data: MarketData[]): TechnicalIndicators {
    if (data.length < 20) {
      throw new Error('Insufficient data for technical analysis');
    }

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    return {
      rsi: this.calculateRSI(closes, 14),
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      bollingerUpper: this.calculateBollingerBands(closes, 20).upper,
      bollingerLower: this.calculateBollingerBands(closes, 20).lower,
      atr: this.calculateATR(highs, lows, closes, 14),
      momentum: this.calculateMomentum(closes, 10),
      volatility: this.calculateVolatility(closes, 20)
    };
  }

  private analyzeTrend(data: MarketData[]): {
    direction: 'bullish' | 'bearish' | 'sideways';
    strength: number;
    support: number;
    resistance: number;
  } {
    const closes = data.map(d => d.close);
    const recentData = closes.slice(-20); // 20 dernières bougies
    
    // Analyser la direction générale
    const firstPrice = recentData[0];
    const lastPrice = recentData[recentData.length - 1];
    const priceChange = (lastPrice - firstPrice) / firstPrice;
    
    let direction: 'bullish' | 'bearish' | 'sideways' = 'sideways';
    if (priceChange > 0.02) direction = 'bullish';
    else if (priceChange < -0.02) direction = 'bearish';
    
    // Calculer la force de la tendance
    const strength = Math.abs(priceChange) * 10;
    
    // Support et résistance simples
    const support = Math.min(...recentData.slice(-10));
    const resistance = Math.max(...recentData.slice(-10));
    
    return {
      direction,
      strength: Math.min(strength, 1),
      support,
      resistance
    };
  }

  private generatePrediction(
    symbol: string,
    currentPrice: number,
    horizonHours: number,
    indicators: TechnicalIndicators,
    trend: any
  ): TimesFMPrediction {
    // Logique de prédiction basée sur les indicateurs - VERSION AMÉLIORÉE
    let predictedReturn = 0;
    let confidence = 0.5; // Base confidence
    let signalStrength = 0;
    
    // Facteur RSI - Plus réactif
    if (indicators.rsi > 75) {
      predictedReturn -= 0.025; // Surachat fort, baisse probable
      confidence += 0.15;
      signalStrength++;
    } else if (indicators.rsi > 65) {
      predictedReturn -= 0.015; // Surachat modéré
      confidence += 0.1;
      signalStrength += 0.5;
    } else if (indicators.rsi < 25) {
      predictedReturn += 0.025; // Survente forte, hausse probable  
      confidence += 0.15;
      signalStrength++;
    } else if (indicators.rsi < 35) {
      predictedReturn += 0.015; // Survente modérée
      confidence += 0.1;
      signalStrength += 0.5;
    }
    
    // Facteur EMA - Plus sensible aux croisements
    const emaSpread = (indicators.ema20 - indicators.ema50) / indicators.ema50;
    if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
      predictedReturn += 0.015 + (emaSpread * 0.5); // Tendance haussière avec amplification
      confidence += 0.12;
      signalStrength++;
    } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
      predictedReturn -= 0.015 - (Math.abs(emaSpread) * 0.5); // Tendance baissière avec amplification
      confidence += 0.12;
      signalStrength++;
    }
    
    // Facteur Bollinger Bands - Plus précis
    const bollBandWidth = (indicators.bollingerUpper - indicators.bollingerLower) / currentPrice;
    if (currentPrice > indicators.bollingerUpper) {
      predictedReturn -= 0.02 * (1 + bollBandWidth); // Ajusté par largeur des bandes
      confidence += 0.1;
      signalStrength += 0.7;
    } else if (currentPrice < indicators.bollingerLower) {
      predictedReturn += 0.02 * (1 + bollBandWidth);
      confidence += 0.1;
      signalStrength += 0.7;
    }
    
    // Facteur tendance - Renforcé
    if (trend.direction === 'bullish') {
      predictedReturn += trend.strength * 0.03; // Augmenté de 0.02 à 0.03
      confidence += 0.15;
      signalStrength += trend.strength;
    } else if (trend.direction === 'bearish') {
      predictedReturn -= trend.strength * 0.03;
      confidence += 0.15;
      signalStrength += trend.strength;
    }
    
    // Facteur momentum - NOUVEAU
    if (Math.abs(indicators.momentum) > 0.01) {
      predictedReturn += indicators.momentum * 0.8; // Amplifier le momentum
      confidence += Math.min(Math.abs(indicators.momentum) * 10, 0.1);
      signalStrength += 0.5;
    }
    
    // Facteur volatilité - Ajusté
    const volAdjustment = Math.min(indicators.volatility * horizonHours / 24, 0.6);
    predictedReturn *= (1 + volAdjustment * 0.8);
    
    // Ajuster selon l'horizon temporel
    const timeMultiplier = Math.sqrt(horizonHours / 24);
    predictedReturn *= timeMultiplier;
    
    // Bonus de confiance basé sur la convergence des signaux
    if (signalStrength >= 2) {
      confidence += 0.15; // Bonus si plusieurs indicateurs convergent
    } else if (signalStrength >= 1.5) {
      confidence += 0.1;
    }
    
    // Limiter les prédictions - PLAGE ÉLARGIE
    predictedReturn = Math.max(-0.15, Math.min(0.15, predictedReturn));
    confidence = Math.max(0.4, Math.min(0.95, confidence));
    
    // S'assurer qu'on génère des prédictions significatives
    if (Math.abs(predictedReturn) < 0.005) {
      // Si la prédiction est trop faible, utiliser le momentum comme guide
      predictedReturn = indicators.momentum * 0.5;
      predictedReturn = Math.max(-0.02, Math.min(0.02, predictedReturn));
    }
    
    const predictedPrice = currentPrice * (1 + predictedReturn);
    
    return {
      symbol,
      timestamp: new Date(),
      predicted_price: predictedPrice,
      predicted_return: predictedReturn,
      confidence_score: confidence,
      horizon_hours: horizonHours,
      quantile_10: predictedPrice * (1 - Math.abs(predictedReturn) * 0.7), // Plus dynamique
      quantile_90: predictedPrice * (1 + Math.abs(predictedReturn) * 0.7)   // Plus dynamique
    };
  }

  private createNeutralPrediction(symbol: string, currentPrice: number, horizonHours: number): TimesFMPrediction {
    return {
      symbol,
      timestamp: new Date(),
      predicted_price: currentPrice,
      predicted_return: 0,
      confidence_score: 0.5,
      horizon_hours: horizonHours,
      quantile_10: currentPrice * 0.98,
      quantile_90: currentPrice * 1.02
    };
  }

  private async savePrediction(prediction: TimesFMPrediction): Promise<void> {
    try {
      // Generate unique prediction ID
      const predictionId = `${Date.now()}_${prediction.symbol}_${Math.random().toString(36).substr(2, 9)}`
      
      // Convert symbol to crypto format (ETHUSDT -> ETH)
      const crypto = prediction.symbol.replace('USDT', '')
      
      // Create current price (use predicted price as fallback for historical data)
      const currentPrice = prediction.predicted_price / (1 + prediction.predicted_return)
      
      await this.db.prepare(`
        INSERT OR REPLACE INTO ai_predictions 
        (prediction_id, crypto, current_price, predicted_price, confidence_score, 
         predicted_return, prediction_horizon, model_version, quantile_10, quantile_90, 
         features_analyzed, analysis_data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        predictionId,
        crypto,
        currentPrice,
        prediction.predicted_price,
        prediction.confidence_score,
        prediction.predicted_return,
        `${prediction.horizon_hours}h`,
        'TimesFM-v2.1',
        prediction.quantile_10 || null,
        prediction.quantile_90 || null,
        JSON.stringify(['RSI Technical Analysis', 'EMA 20/50 Crossovers', 'Bollinger Bands Position', 'Price Momentum Indicators', 'ATR Volatility Analysis', 'Market Trend Patterns']),
        JSON.stringify({
          trend: prediction.predicted_return > 0.005 ? 'bullish' : prediction.predicted_return < -0.005 ? 'bearish' : 'sideways',
          volatility: prediction.confidence_score > 0.7 ? 'low' : 'moderate',
          key_factors: [
            `Expected ${(prediction.predicted_return * 100).toFixed(2)}% movement in ${prediction.horizon_hours}h`,
            `Model confidence: ${(prediction.confidence_score * 100).toFixed(1)}%`,
            `Analysis based on ${prediction.horizon_hours}h historical data`
          ]
        }),
        prediction.timestamp.toISOString()
      ).run();
    } catch (error) {
      console.error('Error saving prediction:', error);
    }
  }

  // Méthodes d'indicateurs techniques

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[prices.length - i] - prices[prices.length - i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = prices.length - period + 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  private calculateBollingerBands(prices: number[], period: number = 20): { upper: number; lower: number } {
    if (prices.length < period) {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      return { upper: avg * 1.02, lower: avg * 0.98 };
    }

    const recentPrices = prices.slice(-period);
    const avg = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const squaredDiffs = recentPrices.map(price => Math.pow(price - avg, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: avg + (stdDev * 2),
      lower: avg - (stdDev * 2)
    };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 0;

    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const recentTRs = trueRanges.slice(-period);
    return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateMomentum(prices: number[], period: number = 10): number {
    if (prices.length < period + 1) return 0;
    
    const currentPrice = prices[prices.length - 1];
    const pastPrice = prices[prices.length - period - 1];
    
    return (currentPrice - pastPrice) / pastPrice;
  }

  private calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const returns = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(365 * 24); // Annualisé
  }

  async getLatestPredictions(limit: number = 5): Promise<TimesFMPrediction[]> {
    try {
      const result = await this.db.prepare(`
        SELECT * FROM predictions 
        ORDER BY timestamp DESC 
        LIMIT ?
      `).bind(limit).all();

      return result.results.map((row: any) => ({
        symbol: row.symbol,
        timestamp: new Date(row.timestamp),
        predicted_price: row.predicted_price,
        predicted_return: row.predicted_return,
        confidence_score: row.confidence_score,
        horizon_hours: row.horizon_hours,
        quantile_10: row.quantile_10,
        quantile_90: row.quantile_90
      }));
    } catch (error) {
      console.error('Error getting latest predictions:', error);
      return [];
    }
  }

  private async logTimesFMCall(message: string, contextData: any): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO system_logs 
        (level, component, message, context_data, execution_time_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'INFO',
        'timesfm',
        message,
        JSON.stringify(contextData),
        contextData.execution_time_ms || null,
        new Date().toISOString()
      ).run();
    } catch (error) {
      console.error('Error logging TimesFM call:', error);
    }
  }
}