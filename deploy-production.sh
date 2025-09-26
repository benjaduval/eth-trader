#!/bin/bash

# Deploy Alice Predictions to Cloudflare Pages Production
# Using direct API token authentication

set -e

echo "🚀 Starting deployment to alice-predictions.pages.dev..."

# Set the API token
export CLOUDFLARE_API_TOKEN="_kGJoZaNYELnDi1gozegz7q7Dg9NXgXqwGLo5Nu5"
export CF_API_TOKEN="_kGJoZaNYELnDi1gozegz7q7Dg9NXgXqwGLo5Nu5"
export CLOUDFLARE_ACCOUNT_ID="a3b792e18bf50557d951ffd6f4b52025"

# Build the project
echo "📦 Building project..."
npm run build

# Deploy using wrangler with direct token
echo "🚀 Deploying to Cloudflare Pages..."

# Try multiple approaches for authentication
npx wrangler pages deploy dist --project-name alice-predictions --env production 2>/dev/null || \
npx wrangler pages deploy dist --project-name alice-predictions 2>/dev/null || \
WRANGLER_API_TOKEN="_kGJoZaNYELnDi1gozegz7q7Dg9NXgXqwGLo5Nu5" npx wrangler pages deploy dist --project-name alice-predictions || \
echo "❌ Direct deployment failed. Manual deployment via Cloudflare dashboard required."

echo "✅ Deployment process completed!"