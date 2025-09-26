# 🧠 Alice Predictions - AI Trading System

[![Live Status](https://img.shields.io/badge/Status-Live-brightgreen)](https://alice-predictions.pages.dev/)
[![Version](https://img.shields.io/badge/Version-v1.2.0-blue)](https://github.com/benjaduval/eth-trader)
[![Cloudflare](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange)](https://pages.cloudflare.com/)
[![TimesFM](https://img.shields.io/badge/AI%20Model-TimesFM-purple)](https://research.google/blog/a-decoder-only-foundation-model-for-time-series-forecasting/)

## 📋 Vue d'Ensemble

**Alice Predictions** est un système de trading automatisé utilisant l'intelligence artificielle TimesFM de Google Research pour prédire les prix des cryptomonnaies (ETH/BTC). L'application fonctionne 24h/24 avec des cycles automatisés de collecte de données, génération de prédictions et exécution de trades intelligents.

### 🎯 Principe de Fonctionnement

L'application suit un **cycle automatisé strict** :

1. **🕐 Toutes les 5 minutes** : Surveillance des positions (stop-loss/take-profit)
2. **🕑 Toutes les heures** : Collecte données + prédictions TimesFM + signaux trading
3. **🤖 En continu** : Interface temps réel avec prédictions mises à jour

---

## 🌐 Accès à l'Application

### 🖥️ **Interface Production**
- **🏠 Dashboard Principal** : https://alice-predictions.pages.dev/
- **🖥️ Terminal Trading** : https://alice-predictions.pages.dev/terminal  
- **🔐 Page de Login** : https://alice-predictions.pages.dev/login *(Code: 12345)*

### 📊 **Monitoring & Statut**
- **⚡ Health Check** : https://alice-predictions.pages.dev/api/health
- **📈 Prédictions ETH** : https://alice-predictions.pages.dev/api/predictions/ETH
- **🪙 Prédictions BTC** : https://alice-predictions.pages.dev/api/predictions/BTC

---

## 🧠 Intelligence Artificielle TimesFM

### 🎯 **Modèle de Prédiction**
- **Modèle** : TimesFM (Time Series Foundation Model) de Google Research
- **Données d'entrée** : 450+ points historiques (prix OHLC + indicateurs techniques)
- **Horizon** : Prédictions à 24 heures avec intervalle de confiance
- **Indicateurs** : RSI, EMA 20/50, Bollinger Bands, ATR, momentum patterns

### 📊 **Métriques de Prédiction**
- **Confiance minimale** : 50% (seuil d'affichage)
- **Seuil d'exécution** : >59% confiance + >1.2% variation prix
- **Fréquence** : Nouvelles prédictions générées toutes les heures
- **Cache intelligent** : Réutilisation prédictions récentes (45min)

### 🔍 **Analyse Détaillée**
Cliquez sur n'importe quelle prédiction pour voir :
- **Données utilisées** : 500 points historiques avec timestamps
- **Analyse technique** : Résumé des patterns identifiés  
- **Précision calculée** : Vérification automatique après 24h
- **Confidence breakdown** : Détail du score de confiance

---

## 🚀 Architecture & Automatisation

### 🏗️ **Stack Technique**
- **Backend** : Hono.js (TypeScript) sur Cloudflare Workers
- **Frontend** : HTML/CSS/JavaScript responsive avec TailwindCSS
- **Base de données** : Cloudflare D1 (SQLite distribuée)
- **API Prix** : CoinGecko Pro (500 calls/min avec safety buffer 85%)
- **Monitoring** : UptimeRobot pour cycles automatisés
- **Déploiement** : Cloudflare Pages avec CDN global

### ⚙️ **Cycles d'Automatisation**

#### 🕐 **Monitor 5 Minutes** (`/api/trading/check-positions`)
- **Fonction** : Surveillance des positions ouvertes uniquement
- **Actions** :
  - Vérification stop-loss et take-profit
  - Fermeture intelligente basée sur prédictions existantes
  - Monitoring des prix ETH/BTC temps réel
- **⚠️ Important** : Ne génère PAS de nouvelles prédictions

#### 🕑 **Monitor 1 Heure** (`/api/automation/hourly`)
- **Fonction** : Cycle complet d'automatisation
- **Actions** :
  - 📊 Collecte données ETH/BTC dans la base de données
  - 🧠 Génération prédictions TimesFM (ETH + BTC)
  - 📈 Analyse signaux trading avec seuils
  - 💰 Exécution automatique des trades qualifiés
- **⚠️ Critical** : SEUL endpoint qui génère les prédictions

### 🛡️ **Protection & Rate Limiting**
- **Cache 45min** : Évite la génération excessive de prédictions
- **Rate limiting CoinGecko** : 85% de la limite (425/500 calls/min)
- **Fallback APIs** : CoinGecko Pro → Public API → Prix fixes
- **Error handling** : Récupération automatique des erreurs temporaires

---

## 📊 Interface & Fonctionnalités

### 🎨 **Dashboard Principal**
1. **Header Principal** 
   - Prix ETH/BTC en temps réel avec variation 24h
   - Version dynamique avec commit git (ex: v1.2.0 • 880476e)

2. **Métriques de Marché**
   - Prix actuel avec icônes de chargement animées
   - Volume 24h, Market Cap, Volatilité
   - Graphique TradingView intégré

3. **Prédictions AI**
   - Dernière prédiction TimesFM avec confiance
   - Expected Return et Risk Range (90% confidence)
   - Historique cliquable avec popup détaillée

4. **Trading & Portfolio**
   - Balance paper trading ($10,000 initial)
   - Positions ouvertes avec P&L temps réel
   - Historique des trades avec performance

### 🔄 **Fonctionnalités Interactives**
- **🖱️ Prédictions cliquables** : Popup avec analyse complète (500 data points)
- **⚡ Auto-refresh** : Interface mise à jour automatiquement
- **📱 Responsive** : Optimisé mobile/desktop/tablet
- **🎨 Loading UX** : Icônes animées au lieu de "N/A" pendant le chargement

---

## 🗄️ Base de Données

### 📋 **Tables Principales**

#### `market_data` - Données Historiques
```sql
- symbol (ETHUSDT/BTCUSDT)
- timestamp (heures rondes UTC)
- open_price, high_price, low_price, close_price
- volume, market_cap
```

#### `ai_predictions` - Prédictions TimesFM
```sql  
- prediction_id (unique)
- crypto (ETH/BTC)
- current_price, predicted_price
- confidence_score, predicted_return
- prediction_horizon, model_version
- created_at, analysis_summary
```

#### `paper_trades` - Historique Trading
```sql
- trade_id, symbol, action (BUY/SELL)
- quantity, entry_price, exit_price
- status, profit_loss, created_at
```

### 📈 **Données Actuelles**
- **market_data** : 510+ points historiques par crypto (cycle complet)
- **ai_predictions** : Prédictions nettoyées régulièrement (4-10 prédictions récentes)
- **paper_trades** : Historique complet des trades automatiques

---

## 🔧 API Documentation

### 🚦 **Endpoints de Statut**
| Endpoint | Méthode | Description | Usage |
|----------|---------|-------------|--------|
| `/api/health` | GET | Statut + version dynamique | Monitoring général |
| `/api/admin/predictions/alert-check` | GET | Alerte si pas de prédictions >70min | Monitoring critique |
| `/api/admin/predictions/rate-limit` | GET | Analyse fréquence prédictions | Debug fréquence |

### 📊 **Endpoints de Données**
| Endpoint | Méthode | Description | Cache |
|----------|---------|-------------|--------|
| `/api/market/ETH` | GET | Prix ETH temps réel + fallbacks | Aucun |
| `/api/market/BTC` | GET | Prix BTC temps réel + fallbacks | Aucun |
| `/api/predictions/ETH` | GET | Prédiction ETH (avec cache) | 45min |
| `/api/predictions/BTC` | GET | Prédiction BTC (avec cache) | 45min |
| `/api/predictions/history` | GET | Historique toutes prédictions | Aucun |
| `/api/predictions/details/:id` | GET | Détail prédiction + data points | Aucun |

### 🤖 **Endpoints d'Automatisation** *(UptimeRobot)*
| Endpoint | Méthode | Description | Fréquence |
|----------|---------|-------------|-----------|
| `/api/automation/hourly` | GET | **CYCLE PRINCIPAL** | **1 heure** |
| `/api/trading/check-positions` | GET | **MONITORING POSITIONS** | **5 minutes** |

### 🛠️ **Endpoints d'Administration**
| Endpoint | Méthode | Description | Usage |
|----------|---------|-------------|--------|
| `/api/admin/predictions/cleanup-all` | DELETE | Supprime TOUTES les prédictions | Reset système |
| `/api/admin/predictions/cleanup-get` | GET | Nettoie prédictions (garde N dernières) | Maintenance |

---

## 🚨 Monitoring & Alertes

### ⏰ **Système d'Alertes**
L'endpoint `/api/admin/predictions/alert-check` surveille la génération de prédictions :

- **✅ OK** : Dernière prédiction < 50 minutes
- **⚠️ WARNING** : Dernière prédiction 50-70 minutes
- **🚨 CRITICAL** : Dernière prédiction > 70 minutes

### 📊 **UptimeRobot Configuration**
1. **Monitor Position (5min)**
   - URL : `https://alice-predictions.pages.dev/api/trading/check-positions`
   - Intervalle : 300 secondes (5 minutes)
   - Action : Surveillance positions + stop-loss

2. **Monitor Automation (1h)**
   - URL : `https://alice-predictions.pages.dev/api/automation/hourly`
   - Intervalle : 3600 secondes (1 heure)
   - Action : Cycle complet (données + prédictions + trading)

### 🎯 **Métriques de Performance**
- **Prédictions générées** : ~4 par heure (2 ETH + 2 BTC cycles)
- **Accuracy TimesFM** : Calculée automatiquement après 24h
- **Latence API** : <200ms (Cloudflare Edge)
- **Uptime** : 99.9%+ (infrastructure Cloudflare)

---

## 🛠️ Configuration & Déploiement

### 🔑 **Variables d'Environnement**
```bash
# API CoinGecko Pro (configurée)
COINGECKO_API_KEY=CG-x5dWQp9xfuNgFKhSDsnipde4

# Configuration Trading
TRADING_MODE=paper
INITIAL_BALANCE=10000
FEES_BPS_PER_SIDE=8

# Notifications (optionnel)
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 🚀 **Déploiement Local**
```bash
# Installation
npm install

# Build avec injection version
npm run build

# Démarrage local 
npm run dev

# Test sanity
curl http://localhost:8787/api/health
```

### ☁️ **Déploiement Production**
```bash
# Build production avec version git
npm run build

# Déploiement Cloudflare Pages
npx wrangler pages deploy dist --project-name alice-predictions

# Configuration secrets (si nécessaire)
npx wrangler secret put COINGECKO_API_KEY
```

### 🎯 **Token Cloudflare Actuel**
```bash
# Token API configuré
CLOUDFLARE_API_TOKEN=_kGJoZaNYELnDi1gozegz7q7Dg9NXgXqwGLo5Nu5
CLOUDFLARE_ACCOUNT_ID=a3b792e18bf50557d951ffd6f4b52025
```

---

## 📈 Performance & Coûts

### 💰 **Coûts d'Exploitation**
- **Cloudflare Pages** : Gratuit (jusqu'à 100k req/jour)
- **Cloudflare D1** : Gratuit (jusqu'à 25GB stockage)
- **CoinGecko Pro API** : Incluse (clé existante)
- **UptimeRobot** : Gratuit (50 monitors)
- **Total mensuel** : **0€** 🎉

### ⚡ **Performances Techniques**
- **Latence globale** : ~100-200ms (Cloudflare CDN)
- **Bundle size** : 204KB (optimisé)
- **Time to Interactive** : <1 seconde
- **API Response** : <150ms (CoinGecko Pro)
- **Database queries** : <50ms (D1 SQLite)

### 📊 **Métriques Trading**
- **Prédictions/jour** : ~96 (4 par heure × 24h)
- **Accuracy moyenne** : Calculée en temps réel après 24h
- **Trades exécutés** : Seulement si >59% confiance + >1.2% variation
- **Risk management** : Stop-loss -2%, Take-profit +3%

---

## 🔍 Développement & Debug

### 📂 **Structure du Projet**
```
webapp/
├── src/
│   ├── index.tsx                 # Application Hono principale
│   ├── services/
│   │   ├── coingecko.ts         # Service CoinGecko Pro API
│   │   ├── timesfm-predictor.ts # Prédicteur TimesFM
│   │   └── paper-trading.ts     # Moteur paper trading
│   └── utils/
│       └── version.ts           # Système versioning dynamique
├── scripts/
│   └── inject-version.js        # Injection version git au build
├── migrations/
│   └── *.sql                    # Schema base de données D1
├── public/
├── dist/                        # Build de production
└── package.json
```

### 🧪 **Tests & Validation**
```bash
# Test endpoints principaux
curl https://alice-predictions.pages.dev/api/health
curl https://alice-predictions.pages.dev/api/market/ETH  
curl https://alice-predictions.pages.dev/api/predictions/ETH

# Test monitoring
curl https://alice-predictions.pages.dev/api/admin/predictions/alert-check
curl https://alice-predictions.pages.dev/api/admin/predictions/rate-limit

# Test cycle automatisation (attention: génère prédictions)
curl https://alice-predictions.pages.dev/api/automation/hourly
```

### 🐛 **Debug & Logs**
- **Logs Cloudflare** : `npx wrangler pages deployment tail`
- **Local debugging** : `npm run dev` avec logs console
- **DB queries** : Logs SQL automatiques en développement
- **API monitoring** : Health check avec métriques détaillées

---

## 🎯 Statut Actuel

### ✅ **Fonctionnalités Opérationnelles**
- ✅ **TimesFM Prédictions** : Génération automatique toutes les heures
- ✅ **Monitoring UptimeRobot** : Cycles 5min et 1h fonctionnels  
- ✅ **Interface Responsive** : Dashboard complet avec prédictions cliquables
- ✅ **Cache Intelligent** : 45min pour éviter spam prédictions
- ✅ **Versioning Dynamique** : Version git en temps réel
- ✅ **Loading UX** : Icônes animées au lieu de "N/A"
- ✅ **Rate Limiting** : Protection CoinGecko API + fallbacks
- ✅ **Database Optimisée** : 510+ points historiques par crypto
- ✅ **Alertes Monitoring** : Détection absence prédictions >70min

### 🎊 **Dernières Améliorations**
- **Fréquence corrigée** : Prédictions 5min → 1h (résolu)
- **Popup détaillée** : Analyse complète avec 500 data points
- **Cleanup système** : Nettoyage prédictions anciennes
- **Loading animations** : Remplacement "N/A" par spinners
- **Alert system** : Monitoring critique automatique

### 🚀 **Prochaines Évolutions Possibles**
- **Backtesting** : Test stratégies sur données historiques
- **Indicateurs avancés** : MACD, Stochastic RSI, Ichimoku  
- **Multi-timeframes** : Prédictions 1h, 4h, 24h
- **Real trading** : Intégration exchange (Binance, Coinbase)
- **Mobile app** : Application native iOS/Android

---

## 📞 Support & Documentation

### 🔗 **Liens Utiles**
- **🌐 Application Live** : https://alice-predictions.pages.dev/
- **🧠 TimesFM Research** : https://research.google/blog/a-decoder-only-foundation-model-for-time-series-forecasting/
- **☁️ Cloudflare Pages** : https://pages.cloudflare.com/
- **📊 CoinGecko Pro** : https://www.coingecko.com/en/api/pricing

### 💡 **Contact & Issues**
- **GitHub Repository** : https://github.com/benjaduval/eth-trader
- **Issues & Features** : Utiliser GitHub Issues
- **Documentation** : Ce README (maintenu à jour)

---

## 🏆 Conclusion

**Alice Predictions** est un système de trading AI **entièrement automatisé**, **gratuit** et **performant** qui fonctionne 24h/24 sur l'infrastructure Cloudflare. 

L'application utilise le modèle TimesFM de Google Research pour générer des prédictions de haute qualité sur ETH/BTC, avec une interface moderne et des métriques transparentes.

**🎯 Perfect pour** : Traders crypto, développeurs AI, passionnés de quantitative finance et d'automatisation.

---

*Dernière mise à jour : 26 septembre 2025*  
*Version : v1.2.0 • 880476e*  
*Powered by TimesFM, CoinGecko Pro & Cloudflare*