#!/bin/bash

# ETH Trader Pro - Script de Déploiement Production
# ================================================

echo "🚀 ETH Trader Pro - Déploiement Production"
echo "=========================================="
echo ""

# Vérification des prérequis
echo "📋 Vérification des prérequis..."

if [ ! -d "dist" ]; then
    echo "❌ Dossier dist/ non trouvé. Exécution du build..."
    npm run build
fi

echo "✅ Build de production prêt"
echo ""

# Vérification de l'authentification Cloudflare
echo "🔐 Vérification de l'authentification Cloudflare..."

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  CLOUDFLARE_API_TOKEN non configuré"
    echo ""
    echo "📌 Options de déploiement disponibles :"
    echo ""
    echo "1️⃣  Via Interface Web Cloudflare (RECOMMANDÉ) :"
    echo "   🌐 https://dash.cloudflare.com/"
    echo "   📂 Pages > Create project > Connect GitHub"
    echo "   🔗 Repository : https://github.com/benjaduval/eth-trader"
    echo "   🌿 Branch : main"
    echo ""
    echo "2️⃣  Via CLI avec authentification :"
    echo "   npx wrangler auth login"
    echo "   npx wrangler pages deploy dist --project-name eth-trader-pro"
    echo ""
    echo "3️⃣  Via API Token :"
    echo "   export CLOUDFLARE_API_TOKEN=<your_token>"
    echo "   bash deploy.sh"
    echo ""
    exit 1
fi

# Déploiement automatique si token disponible
echo "✅ Token Cloudflare détecté"
echo "🚀 Déploiement en cours..."

npx wrangler pages deploy dist --project-name eth-trader-pro

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DÉPLOIEMENT RÉUSSI !"
    echo ""
    echo "🌐 Application disponible à :"
    echo "   https://eth-trader-pro.pages.dev"
    echo ""
    echo "⚙️  Configuration post-déploiement requise :"
    echo "   1. Variables d'environnement dans Cloudflare Dashboard"
    echo "   2. Configuration de la base D1"
    echo "   3. Secrets (COINGECKO_API_KEY)"
    echo ""
    echo "📖 Voir DEPLOY_PRODUCTION.md pour les détails"
else
    echo ""
    echo "❌ Échec du déploiement"
    echo "📖 Consultez DEPLOY_PRODUCTION.md pour les alternatives"
fi