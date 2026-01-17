#!/bin/bash

# Script to update RunPayments credentials in Vercel production environment
# Run this from the kathy-cloud directory

echo "Updating RunPayments credentials in Vercel production..."

# Update API Key (Access Token)
vercel env rm RUNPAYMENTS_API_KEY production --yes 2>/dev/null || true
echo "tkn_ppc_rcrKPf64i8A3NVdy8B6gshEL6nX9Kn" | vercel env add RUNPAYMENTS_API_KEY production

# Add Refresh Token (if not exists)
vercel env rm RUNPAYMENTS_REFRESH_TOKEN production --yes 2>/dev/null || true
echo "tkn_ppc_rcrKPfGeZmuT4SSq1H8S1E8PXvCy8h" | vercel env add RUNPAYMENTS_REFRESH_TOKEN production

# Update CC_MID (Public Key)
vercel env rm RUNPAYMENTS_CC_MID production --yes 2>/dev/null || true
echo "15pQoiiZWBohgqrXMrrQp4X6" | vercel env add RUNPAYMENTS_CC_MID production

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "⚠️  IMPORTANT: You need to redeploy for changes to take effect:"
echo "   vercel --prod"
echo ""
echo "Or trigger a redeploy from the Vercel dashboard."
