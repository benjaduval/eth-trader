# 🚀 Guide de Déploiement en Production - ETH Trader Pro

## ✅ Statut Actuel
- ✅ Code fusionné dans la branche `main`
- ✅ Build de production généré (`dist/` folder)
- ✅ Configuration Cloudflare Pages prête (`wrangler.jsonc`)
- ✅ Toutes les améliorations intégrées et testées

## 🌐 Déploiement Cloudflare Pages (Recommandé)

### Option 1: Interface Web Cloudflare (Recommandée)

1. **Aller sur Cloudflare Dashboard** : https://dash.cloudflare.com/
2. **Pages > Create a project**
3. **Connect to Git** 
   - Repository: `https://github.com/benjaduval/eth-trader`
   - Branch: `main`
   - Project name: `eth-trader-pro`

4. **Build Configuration** :
   ```
   Framework preset: None
   Build command: npm run build
   Build output directory: dist
   Root directory: / 
   ```

5. **Environment Variables** (à ajouter dans Settings > Environment variables) :
   ```
   TRADING_MODE=paper
   INITIAL_BALANCE=10000
   FEES_BPS_PER_SIDE=8
   VOLATILITY_TARGET=0.30
   ```

6. **Secrets** (à ajouter dans Settings > Environment variables - Encrypted) :
   ```
   COINGECKO_API_KEY=CG-x5dWQp9xfuNgFKhSDsnipde4
   ```

7. **D1 Database** :
   - Database name: `eth-trader-production`
   - Database ID: `568a62ac-792b-4622-99ae-48f24b00f94c`
   - Binding: `DB`

### Option 2: CLI Wrangler (Si token API disponible)

```bash
# 1. Authentification
npx wrangler auth login

# 2. Configuration des secrets
npx wrangler secret put COINGECKO_API_KEY

# 3. Déploiement
npx wrangler pages deploy dist --project-name eth-trader-pro
```

## 🔧 Configuration Post-Déploiement

### Variables d'environnement requises :
- `COINGECKO_API_KEY` : CG-x5dWQp9xfuNgFKhSDsnipde4 (secret)
- `TRADING_MODE` : paper
- `INITIAL_BALANCE` : 10000
- `FEES_BPS_PER_SIDE` : 8
- `VOLATILITY_TARGET` : 0.30

### Base de données D1 :
La base de données est déjà configurée avec l'ID : `568a62ac-792b-4622-99ae-48f24b00f94c`

## 🎯 Fonctionnalités Déployées

### ✅ Améliorations Incluses dans cette Version :

1. **Navigation ETH/BTC** : Onglets fonctionnels intégrés au JavaScript
2. **Données CoinGecko** : Volume 24h, market cap et volatilité réels
3. **Tendance TimesFM** : Analyse BULLISH/BEARISH/NEUTRAL intelligente  
4. **Portfolio complet** : Trades ouverts/fermés avec historique détaillé
5. **Trades visibles** : Positions en cours ultra-visibles avec animations
6. **Popup détaillées** : Détails complets des prédictions TimesFM
7. **400+ points de données** : TimesFM optimisé avec 21 jours d'historique

### 🔗 URLs de Production :

Une fois déployé, l'application sera disponible à :
- **URL principale** : `https://eth-trader-pro.pages.dev`
- **URL custom** : Configurable dans Cloudflare Dashboard

### 🧪 Tests Post-Déploiement :

Après déploiement, vérifier :
1. **Navigation ETH/BTC** fonctionne
2. **Données de marché** s'affichent correctement
3. **Prédictions TimesFM** se génèrent
4. **Popup détaillées** s'ouvrent sur clic
5. **Portfolio** affiche les positions/trades
6. **API endpoints** répondent correctement

## 📊 Monitoring Production

### Métriques à surveiller :
- Temps de réponse API CoinGecko
- Nombre de prédictions générées/jour
- Taux de succès des requêtes
- Utilisation de la base D1

### Logs utiles :
```bash
npx wrangler pages deployment tail --project-name eth-trader-pro
```

## 🔄 Mises à jour Futures

Pour déployer des mises à jour :
1. Pusher sur la branche `main`
2. Cloudflare Pages redéploie automatiquement
3. Ou utiliser `npx wrangler pages deploy dist`

---

**Statut** : ✅ Prêt pour déploiement en production
**Repository** : https://github.com/benjaduval/eth-trader (branche main à jour)
**Build** : ✅ `dist/` folder généré et testé