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

  async predictNextHours(
    symbol: string = 'ETHUSDT', 
    horizonHours: number = 24,
    currentPrice: number
  ): Promise<TimesFMPrediction> {
    try {
      // Récupérer les données historiques récentes
      const historicalData = await this.getHistoricalData(symbol, 168); // 7 jours
      
      if (historicalData.length < 20) {
        // Pas assez de données, retourner une prédiction neutre
        return this.createNeutralPrediction(symbol, currentPrice, horizonHours);
      }

      // Calculer les indicateurs techniques
      const indicators = this.calculateTechnicalIndicators(historicalData);
      
      // Analyser les patterns et tendances
      const trendAnalysis = this.analyzeTrend(historicalData);
      
      // Générer la prédiction
      const prediction = this.generatePrediction(
        symbol, 
        currentPrice, 
        horizonHours, 
        indicators, 
        trendAnalysis
      );

      // Sauvegarder en base
      await this.savePrediction(prediction);
      
      return prediction;
    } catch (error) {
      console.error('Error in TimesFM prediction:', error);
      return this.createNeutralPrediction(symbol, currentPrice, horizonHours);
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
    // Logique de prédiction basée sur les indicateurs
    let predictedReturn = 0;
    let confidence = 0.5; // Base confidence
    
    // Facteur RSI
    if (indicators.rsi > 70) {
      predictedReturn -= 0.02; // Surachat, baisse probable
      confidence += 0.1;
    } else if (indicators.rsi < 30) {
      predictedReturn += 0.02; // Survente, hausse probable  
      confidence += 0.1;
    }
    
    // Facteur EMA
    if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
      predictedReturn += 0.01; // Tendance haussière
      confidence += 0.1;
    } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
      predictedReturn -= 0.01; // Tendance baissière
      confidence += 0.1;
    }
    
    // Facteur Bollinger Bands
    if (currentPrice > indicators.bollingerUpper) {
      predictedReturn -= 0.015; // Prix au-dessus de la bande supérieure
    } else if (currentPrice < indicators.bollingerLower) {
      predictedReturn += 0.015; // Prix en dessous de la bande inférieure
    }
    
    // Facteur tendance
    if (trend.direction === 'bullish') {
      predictedReturn += trend.strength * 0.02;
      confidence += 0.1;
    } else if (trend.direction === 'bearish') {
      predictedReturn -= trend.strength * 0.02;
      confidence += 0.1;
    }
    
    // Facteur volatilité
    const volAdjustment = Math.min(indicators.volatility * horizonHours / 24, 0.5);
    predictedReturn *= (1 + volAdjustment);
    
    // Ajuster selon l'horizon temporel
    const timeMultiplier = Math.sqrt(horizonHours / 24);
    predictedReturn *= timeMultiplier;
    
    // Limiter les prédictions
    predictedReturn = Math.max(-0.1, Math.min(0.1, predictedReturn));
    confidence = Math.max(0.3, Math.min(0.9, confidence));
    
    const predictedPrice = currentPrice * (1 + predictedReturn);
    
    return {
      symbol,
      timestamp: new Date(),
      predicted_price: predictedPrice,
      predicted_return: predictedReturn,
      confidence_score: confidence,
      horizon_hours: horizonHours,
      quantile_10: predictedPrice * 0.95, // 5% de baisse max probable
      quantile_90: predictedPrice * 1.05   // 5% de hausse max probable
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
      await this.db.prepare(`
        INSERT INTO predictions 
        (symbol, timestamp, predicted_price, predicted_return, confidence_score, 
         horizon_hours, quantile_10, quantile_90)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        prediction.symbol,
        prediction.timestamp.toISOString(),
        prediction.predicted_price,
        prediction.predicted_return,
        prediction.confidence_score,
        prediction.horizon_hours,
        prediction.quantile_10 || null,
        prediction.quantile_90 || null
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
}