#!/bin/bash

# Script de reconstruction immédiate de la base de données
# 510 points exactement, dernière: 25/09/2025 11h UTC+2 (09h UTC)

echo "🚀 RECONSTRUCTION BASE DE DONNÉES - 510 POINTS"
echo "📅 Référence: 25/09/2025 11h UTC+2 (09h UTC)"
echo "🎯 Objectif: 510 points ETH + 510 points BTC"
echo ""

BASE_URL="https://alice-predictions.pages.dev"

# Vérifier état actuel
echo "📊 État actuel de la base de données:"
curl -s "$BASE_URL/api/debug/timesfm-data-coverage" | jq '.eth_coverage.total_hours_in_db, .btc_coverage.total_hours_in_db'

echo ""
echo "🔄 Tentative de déclenchement des cycles d'automation en rafale..."
echo "(Cette méthode va tenter d'accumuler plus de données via automation)"

# Déclencher 20 cycles d'automation pour forcer l'accumulation
success_count=0
for i in $(seq 1 20); do
    echo -n "Cycle $i/20... "
    
    response=$(curl -s "$BASE_URL/api/automation/hourly")
    success=$(echo "$response" | jq -r '.success // false')
    
    if [ "$success" = "true" ]; then
        eth_accumulated=$(echo "$response" | jq -r '.data_collection.eth.accumulated // false')
        btc_accumulated=$(echo "$response" | jq -r '.data_collection.btc.accumulated // false')
        
        if [ "$eth_accumulated" = "true" ] || [ "$btc_accumulated" = "true" ]; then
            echo "✅ Données accumulées"
            ((success_count++))
        else
            echo "⏸️  Pas d'accumulation (normal si heure non ronde)"
        fi
    else
        echo "❌ Échec"
    fi
    
    # Délai court entre cycles
    sleep 1
done

echo ""
echo "📈 Résultat: $success_count cycles avec accumulation de données"

# Vérifier l'état final
echo ""
echo "📊 État final de la base de données:"
coverage=$(curl -s "$BASE_URL/api/debug/timesfm-data-coverage")
eth_total=$(echo "$coverage" | jq -r '.eth_coverage.total_hours_in_db')
btc_total=$(echo "$coverage" | jq -r '.btc_coverage.total_hours_in_db')

echo "ETH: $eth_total heures"
echo "BTC: $btc_total heures"

# Tester les prédictions
echo ""
echo "🔮 Test des prédictions après accumulation:"
prediction_result=$(curl -s "$BASE_URL/api/predictions/ETH")
prediction_success=$(echo "$prediction_result" | jq -r '.success')

if [ "$prediction_success" = "true" ]; then
    predicted_price=$(echo "$prediction_result" | jq -r '.predicted_price')
    confidence=$(echo "$prediction_result" | jq -r '.confidence')
    echo "✅ PRÉDICTIONS DÉBLOQUÉES!"
    echo "   Prix prédit ETH: $$(echo "$predicted_price" | cut -d'.' -f1)"
    echo "   Confiance: $(echo "scale=1; $confidence * 100" | bc)%"
else
    error=$(echo "$prediction_result" | jq -r '.error')
    available=$(echo "$prediction_result" | jq -r '.data_points_available // 0')
    required=$(echo "$prediction_result" | jq -r '.required_minimum // 100')
    echo "❌ Prédictions toujours bloquées:"
    echo "   $error"
    echo "   Disponible: ${available}h / Requis: ${required}h"
fi

echo ""
echo "🎯 OBJECTIF FINAL: 510 points de données"
echo "📋 STATUT: $eth_total/510 points ETH, $btc_total/510 points BTC"

# Calcul progression
if [ "$eth_total" != "null" ] && [ "$eth_total" -gt 0 ]; then
    progress=$(echo "scale=1; $eth_total * 100 / 510" | bc)
    echo "📊 PROGRESSION: ${progress}% complété"
    
    if [ "$eth_total" -ge 510 ]; then
        echo "🏆 MISSION ACCOMPLIE - Base de données complète!"
    else
        remaining=$((510 - eth_total))
        echo "⏰ Restant: ${remaining} heures à collecter"
        echo "💡 L'automation UptimeRobot continue à collecter 1h/heure automatiquement"
    fi
fi

echo ""
echo "🏁 Reconstruction terminée: $(date)"