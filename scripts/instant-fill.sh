#!/bin/bash

# Script d'urgence pour remplir immédiatement 100+ heures de données
# Utilise l'automation existante de manière répétée avec delays

BASE_URL="https://alice-predictions.pages.dev"
CYCLES=20  # 20 cycles pour essayer d'accumuler plus de données

echo "🚀 REMPLISSAGE URGENT - $CYCLES cycles d'automation"
echo "📅 Début: $(date)"

for i in $(seq 1 $CYCLES); do
    echo ""
    echo "🔄 Cycle $i/$CYCLES"
    
    # Déclencher automation ETH/BTC
    response=$(curl -s "$BASE_URL/api/automation/hourly")
    
    # Extraire infos
    success=$(echo "$response" | jq -r '.success // false')
    eth_price=$(echo "$response" | jq -r '.data_collection.eth.price // "N/A"')
    eth_accumulated=$(echo "$response" | jq -r '.data_collection.eth.accumulated // false')
    
    if [ "$success" = "true" ]; then
        echo "✅ ETH: $eth_price USD (accumulated: $eth_accumulated)"
    else
        echo "❌ Échec cycle $i"
    fi
    
    # Délai entre cycles
    if [ $i -lt $CYCLES ]; then
        echo "⏸️  Pause 3s..."
        sleep 3
    fi
done

echo ""
echo "📊 Vérification données finales..."
curl -s "$BASE_URL/api/debug/timesfm-data-coverage" | jq '.eth_coverage.total_hours_in_db, .btc_coverage.total_hours_in_db'

echo ""
echo "🏁 Terminé: $(date)"