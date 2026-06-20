#!/usr/bin/env bash
set -e

# Deploy Frontend to Vercel
# Requires VERCEL_TOKEN and VERCEL_PROJECT environment variables.
# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
  echo "Installing Vercel CLI..."
  npm i -g vercel
fi

# Deploy
vercel --prod --token "$VERCEL_TOKEN" --confirm --scope "$VERCEL_PROJECT"
