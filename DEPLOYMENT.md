# 🚀 Déploiement Alice Predictions sur Cloudflare Pages

## 📋 Configuration Requise

### 1. Secrets Cloudflare à Configurer

Vous devez configurer ces secrets dans votre dashboard Cloudflare ou via Wrangler CLI :

```bash
# Secret obligatoire - CoinGecko Pro API
npx wrangler secret put COINGECKO_API_KEY
# Valeur: CG-bsLZ4jVKKU72L2Jmn2jSgioV

# Variables d'environnement (wrangler.toml les contient déjà)
TRADING_MODE=paper
INITIAL_BALANCE=10000
FEES_BPS_PER_SIDE=8
VOLATILITY_TARGET=0.30
NODE_ENV=production
```

### 2. Base de Données D1

```bash
# La base de données est configurée dans wrangler.toml :
# database_id = "568a62ac-792b-4622-99ae-48f24b00f94c"
# Il faut s'assurer que les migrations sont appliquées en production
```

## 🚀 Instructions de Déploiement

### Option 1: Déploiement via Cloudflare Dashboard (Recommandé)

1. **Connecter le Repo GitHub**
   - Aller sur https://dash.cloudflare.com/ → Pages
   - Créer nouveau projet → Connect Git Repository
   - Sélectionner `benjaduval/eth-trader`
   - Nom du projet: `alice-predictions`

2. **Configuration Build**
   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: (laisser vide)
   ```

3. **Variables d'Environnement**
   - Ajouter `COINGECKO_API_KEY` = `CG-bsLZ4jVKKU72L2Jmn2jSgioV`
   - Les autres variables sont dans wrangler.toml

4. **Configuration D1 Database**
   - Lier la base D1 existante avec l'ID: `568a62ac-792b-4622-99ae-48f24b00f94c`
   - Nom de binding: `DB`

### Option 2: Déploiement via Wrangler CLI

```bash
# Configurer Wrangler (si pas déjà fait)
npx wrangler login

# Configurer la clé API CoinGecko
npx wrangler secret put COINGECKO_API_KEY
# Entrer: CG-bsLZ4jVKKU72L2Jmn2jSgioV

# Builder et déployer
npm run build
npx wrangler pages deploy dist --project-name alice-predictions

# Vérifier le déploiement
curl https://alice-predictions.pages.dev/api/health
```

## ✅ Vérifications Post-Déploiement

### Tests API Automatiques

```bash
# Test endpoints principaux
curl "https://alice-predictions.pages.dev/api/health"
curl "https://alice-predictions.pages.dev/api/market/ETH"  
curl "https://alice-predictions.pages.dev/api/market/BTC"
curl "https://alice-predictions.pages.dev/api/predictions/ETH"
curl "https://alice-predictions.pages.dev/api/predictions/BTC"

# Test endpoints automation (UptimeRobot ready)
curl "https://alice-predictions.pages.dev/api/automation/hourly"
curl "https://alice-predictions.pages.dev/api/trading/check-positions"

# Test interface utilisateur
open https://alice-predictions.pages.dev/
# Code d'accès: 12345
```

### Vérifications Fonctionnelles

- ✅ Interface de connexion accessible
- ✅ Terminal AI charge correctement
- ✅ Données ETH/BTC temps réel via CoinGecko Pro
- ✅ Prédictions TimesFM avec 450+ points historiques
- ✅ Endpoints d'automation répondent correctement
- ✅ Base de données D1 connectée

## 🔄 Configuration UptimeRobot (Automation)

Une fois le déploiement réussi, configurer UptimeRobot :

### Monitors Requis

1. **Hourly Automation Cycle**
   ```
   URL: https://alice-predictions.pages.dev/api/automation/hourly
   Type: HTTP(s)
   Interval: 60 minutes
   Alert: Email if down > 5 minutes
   ```

2. **Position Monitoring (5 minutes)**
   ```
   URL: https://alice-predictions.pages.dev/api/trading/check-positions
   Type: HTTP(s) 
   Interval: 5 minutes
   Alert: Email if down > 2 minutes
   ```

3. **Health Check (General)**
   ```
   URL: https://alice-predictions.pages.dev/api/health
   Type: HTTP(s)
   Interval: 5 minutes
   Alert: Email if down > 1 minute
   ```

## 📊 Fonctionnalités Automatiques Activées

### Cycle Horaire (`/api/automation/hourly`)
1. **Collecte données** - ETH/BTC via CoinGecko Pro API
2. **Génération prédictions** - TimesFM avec 450+ points historiques  
3. **Signaux trading** - Seuils >59% confiance + >1.2% variation
4. **Exécution automatique** - Trades si seuils respectés
5. **Logging complet** - Traçabilité dans D1 database

### Monitoring 5 Minutes (`/api/trading/check-positions`)
1. **Vérification positions** - Stop-loss/take-profit automatiques
2. **Fermeture intelligente** - Basée sur nouvelles prédictions TimesFM  
3. **Gestion risques** - Positions faible confiance (<40%)
4. **Métriques temps réel** - P&L, win rate, drawdown

## 🎯 Application 100% Automatique

Après déploiement + UptimeRobot:
- ⏰ **Collecte automatique** - Données ETH/BTC toutes les heures
- 🤖 **Prédictions automatiques** - TimesFM analyse technique continue
- 📈 **Trading automatique** - Exécution si seuils >59%/1.2% respectés
- 🔍 **Monitoring continu** - Positions vérifiées toutes les 5 minutes
- 📊 **Interface temps réel** - Dashboard accessible 24/7

## 🚨 Support de Déploiement

Si vous rencontrez des problèmes:

1. **Vérifier les logs Cloudflare Pages** dans le dashboard
2. **Tester les secrets** avec `npx wrangler secret list`
3. **Vérifier D1 database** avec `npx wrangler d1 info eth-trader-production`
4. **Valider le build** localement avec `npm run build`

L'application est maintenant prête pour un déploiement production complet ! 🚀