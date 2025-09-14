/**
 * Service de notifications adapté pour Cloudflare Workers
 * Support Telegram et Email via Fetch API
 */

import type { CloudflareBindings } from '../types/cloudflare';

interface NotificationConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  emailUser?: string;
  emailPassword?: string;
  notificationEmail?: string;
}

interface TradeNotification {
  action: string;
  price: number;
  confidence: number;
  quantity?: number;
  pnl?: number;
  symbol: string;
}

export class NotificationService {
  private config: NotificationConfig;

  constructor(env: CloudflareBindings) {
    this.config = {
      telegramBotToken: env.TELEGRAM_BOT_TOKEN,
      telegramChatId: env.TELEGRAM_CHAT_ID,
      emailUser: env.EMAIL_USER,
      emailPassword: env.EMAIL_PASSWORD,
      notificationEmail: env.NOTIFICATION_EMAIL
    };
  }

  async sendTradeAlert(trade: TradeNotification): Promise<boolean> {
    const results: boolean[] = [];

    // Envoyer via Telegram si configuré
    if (this.config.telegramBotToken && this.config.telegramChatId) {
      results.push(await this.sendTelegramNotification(trade));
    }

    // Envoyer via Email si configuré (utilise un service tiers pour éviter SMTP sur Workers)
    if (this.config.notificationEmail) {
      results.push(await this.sendEmailNotification(trade));
    }

    return results.length > 0 && results.some(r => r);
  }

  async sendSystemAlert(level: string, component: string, message: string): Promise<boolean> {
    if (level !== 'ERROR' && level !== 'CRITICAL') {
      return true; // Ignorer les messages non critiques
    }

    const alertMessage = `🚨 ETH Trader System Alert

**Level**: ${level}
**Component**: ${component}
**Time**: ${new Date().toISOString()}
**Message**: ${message}`;

    return this.sendRawMessage(alertMessage);
  }

  async sendDailyReport(metrics: any): Promise<boolean> {
    const reportMessage = this.formatDailyReport(metrics);
    return this.sendRawMessage(reportMessage);
  }

  private async sendTelegramNotification(trade: TradeNotification): Promise<boolean> {
    try {
      if (!this.config.telegramBotToken || !this.config.telegramChatId) {
        return false;
      }

      const message = this.formatTelegramMessage(trade);
      const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      if (response.ok) {
        console.log('✅ Notification Telegram envoyée');
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Erreur Telegram:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur Telegram:', error);
      return false;
    }
  }

  private async sendEmailNotification(trade: TradeNotification): Promise<boolean> {
    try {
      // Utiliser un service d'email via webhook (ex: Mailgun, SendGrid, etc.)
      // Pour la démo, nous utiliserons un webhook générique ou loggerons simplement
      
      console.log('📧 Email notification (simulé):', {
        to: this.config.notificationEmail,
        subject: `ETH Trader - Signal ${trade.action.toUpperCase()}`,
        body: this.formatEmailMessage(trade)
      });

      // TODO: Implémenter avec un vrai service email
      // const response = await fetch('https://api.mailgun.net/v3/YOUR_DOMAIN/messages', { ... });
      
      return true; // Simulé pour la démo
    } catch (error) {
      console.error('❌ Erreur Email:', error);
      return false;
    }
  }

  private async sendRawMessage(message: string): Promise<boolean> {
    let success = false;

    // Telegram
    if (this.config.telegramBotToken && this.config.telegramChatId) {
      try {
        const url = `https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.telegramChatId,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        if (response.ok) success = true;
      } catch (error) {
        console.error('Telegram error:', error);
      }
    }

    return success;
  }

  private formatTelegramMessage(trade: TradeNotification): string {
    const emoji = this.getActionEmoji(trade.action);
    const confidenceBar = this.getConfidenceBar(trade.confidence);
    
    return `${emoji} *ETH Trader Signal*

*Action*: ${trade.action.toUpperCase()}
*Prix ETH*: $${trade.price.toFixed(2)}
*Confiance*: ${(trade.confidence * 100).toFixed(1)}% ${confidenceBar}
${trade.quantity ? `*Quantité*: ${trade.quantity.toFixed(4)} ETH` : ''}
${trade.pnl !== undefined ? `*P&L*: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : ''}

*Time*: ${new Date().toLocaleString('fr-FR')}
*Mode*: Paper Trading

_Powered by TimesFM & CoinGecko Pro_`;
  }

  private formatEmailMessage(trade: TradeNotification): string {
    return `Signal de Trading ETH

Action: ${trade.action.toUpperCase()}
Prix: $${trade.price.toFixed(2)}
Confiance: ${(trade.confidence * 100).toFixed(1)}%
${trade.quantity ? `Quantité: ${trade.quantity.toFixed(4)} ETH` : ''}
${trade.pnl !== undefined ? `P&L: ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : ''}

Timestamp: ${new Date().toISOString()}
Mode: Paper Trading

--
ETH Trader Pro
Powered by TimesFM & CoinGecko Pro`;
  }

  private formatDailyReport(metrics: any): string {
    return `📊 *ETH Trader - Rapport Quotidien*

*Performance:*
• P&L Net: $${(metrics.net_pnl || 0).toFixed(2)}
• Total Trades: ${metrics.total_trades || 0}
• Win Rate: ${((metrics.win_rate || 0) * 100).toFixed(1)}%
• Profit Factor: ${(metrics.profit_factor || 0).toFixed(2)}

*Risque:*
• Max Drawdown: ${((metrics.max_drawdown || 0) * 100).toFixed(1)}%
• Sharpe Ratio: ${(metrics.sharpe_ratio || 0).toFixed(2)}

*Balance:*
• Balance Actuelle: $${(metrics.current_balance || 10000).toFixed(2)}

_${new Date().toLocaleDateString('fr-FR')}_`;
  }

  private getActionEmoji(action: string): string {
    switch (action.toLowerCase()) {
      case 'buy': return '🚀';
      case 'sell': return '📉';
      case 'hold': return '⏸️';
      default: return '📊';
    }
  }

  private getConfidenceBar(confidence: number): string {
    const bars = Math.round(confidence * 5);
    const filled = '█'.repeat(bars);
    const empty = '░'.repeat(5 - bars);
    return `${filled}${empty}`;
  }

  // Méthodes utilitaires pour validation
  isTelegramConfigured(): boolean {
    return !!(this.config.telegramBotToken && this.config.telegramChatId);
  }

  isEmailConfigured(): boolean {
    return !!this.config.notificationEmail;
  }

  async testNotifications(): Promise<{ telegram: boolean; email: boolean }> {
    const testTrade: TradeNotification = {
      action: 'test',
      price: 3500,
      confidence: 0.85,
      symbol: 'ETHUSDT'
    };

    const telegramSuccess = this.isTelegramConfigured() 
      ? await this.sendTelegramNotification(testTrade)
      : false;

    const emailSuccess = this.isEmailConfigured()
      ? await this.sendEmailNotification(testTrade) 
      : false;

    return {
      telegram: telegramSuccess,
      email: emailSuccess
    };
  }
}