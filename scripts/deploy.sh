#!/bin/bash
# 🚀 Script de déploiement ETH Trader sur Cloudflare Pages
# Automatise la création DB, migrations et déploiement

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Déploiement ETH Trader sur Cloudflare Pages"
echo "=============================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -f "wrangler.jsonc" ]; then
    print_error "Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
fi

# Vérifier Node.js et npm
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm n'est pas installé"
    exit 1
fi

# Vérifier wrangler
if ! command -v npx &> /dev/null; then
    print_error "npx n'est pas disponible"
    exit 1
fi

print_status "Installation des dépendances..."
npm install

print_status "Build du projet..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Le build a échoué - dossier dist manquant"
    exit 1
fi

print_success "Build terminé avec succès"

# Vérifier l'authentification Cloudflare
print_status "Vérification de l'authentification Cloudflare..."

if ! npx wrangler whoami 2>/dev/null; then
    print_warning "Authentification Cloudflare requise"
    echo ""
    echo "📋 ÉTAPES MANUELLES REQUISES:"
    echo "1. Aller dans l'onglet 'Deploy' de l'interface"
    echo "2. Configurer votre Cloudflare API Token"
    echo "3. Relancer ce script"
    echo ""
    exit 1
fi

print_success "Authentification Cloudflare OK"

# Créer la base de données D1 si elle n'existe pas
print_status "Configuration de la base de données D1..."

DB_EXISTS=$(npx wrangler d1 list 2>/dev/null | grep "eth-trader-production" || echo "")

if [ -z "$DB_EXISTS" ]; then
    print_status "Création de la base de données D1..."
    
    npx wrangler d1 create eth-trader-production
    
    print_warning "IMPORTANT: Copiez l'ID de la base de données dans wrangler.jsonc"
    print_warning "Puis relancez ce script"
    exit 1
else
    print_success "Base de données D1 existante trouvée"
fi

# Appliquer les migrations
print_status "Application des migrations..."

if [ -f "migrations/0001_initial_schema.sql" ]; then
    npx wrangler d1 migrations apply eth-trader-production
    print_success "Migrations appliquées"
else
    print_warning "Fichiers de migration non trouvés"
fi

# Configurer les secrets
print_status "Configuration des secrets..."

echo ""
echo "📋 CONFIGURATION DES SECRETS CLOUDFLARE:"
echo ""
echo "Secrets obligatoires:"
echo "1. npx wrangler secret put COINGECKO_API_KEY"
echo "   Valeur: CG-x5dWQp9xfuNgFKhSDsnipde4"
echo ""
echo "Secrets optionnels (pour notifications):"  
echo "2. npx wrangler secret put TELEGRAM_BOT_TOKEN"
echo "3. npx wrangler secret put TELEGRAM_CHAT_ID"
echo "4. npx wrangler secret put NOTIFICATION_EMAIL"
echo ""

read -p "Avez-vous configuré au minimum COINGECKO_API_KEY ? (y/N): " secrets_configured

if [ "$secrets_configured" != "y" ] && [ "$secrets_configured" != "Y" ]; then
    print_warning "Configurez les secrets puis relancez le déploiement"
    exit 1
fi

# Déploiement sur Cloudflare Pages
print_status "Déploiement sur Cloudflare Pages..."

# Utiliser meta_info pour le nom du projet si disponible, sinon eth-trader par défaut
PROJECT_NAME="eth-trader"

npx wrangler pages deploy dist --project-name "$PROJECT_NAME" --compatibility-date 2025-09-14

if [ $? -eq 0 ]; then
    print_success "🎉 Déploiement réussi!"
    echo ""
    echo "🌐 Votre application est disponible à:"
    echo "   Production: https://$PROJECT_NAME.pages.dev"
    echo "   Branch: https://main.$PROJECT_NAME.pages.dev"
    echo ""
    echo "📊 Endpoints principaux:"
    echo "   Health: https://$PROJECT_NAME.pages.dev/api/health"
    echo "   Dashboard: https://$PROJECT_NAME.pages.dev/"
    echo ""
    echo "⚙️  Prochaines étapes:"
    echo "1. Tester l'application sur l'URL de production"
    echo "2. Configurer les notifications Telegram (optionnel)"
    echo "3. Programmer les tâches automatiques"
    echo ""
    print_success "ETH Trader Pro est maintenant en ligne! 🚀"
else
    print_error "Échec du déploiement"
    exit 1
fi