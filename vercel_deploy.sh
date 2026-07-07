#!/usr/bin/env bash

# ------------------------------------------------------------
# Automated Vercel deployment script
# ------------------------------------------------------------
# This script assumes you have the Vercel CLI installed globally
# (npm i -g vercel) or will use npx if not.
# It also expects a VERCEL_TOKEN environment variable with a
# personal access token that has permission to manage the project.
# ------------------------------------------------------------
set -e

# Config – adjust if needed
PROJECT_DIR="$(pwd)"
FRONTEND_URL="https://giai-bong-da-doan-phuong-tung-thien.vercel.app"
API_URL="https://giai-bong-da-doan-phuong-backend.onrender.com/api"
RENDER_API_URL="https://giai-bong-da-doan-phuong-backend.onrender.com"
UPLOAD_URL="https://giai-bong-da-doan-phuong-backend.onrender.com"

# Ensure Vercel CLI is available
if ! command -v vercel &>/dev/null; then
  echo "Vercel CLI not found, using npx…"
  VERCEL_CMD="npx vercel@latest"
else
  VERCEL_CMD="vercel"
fi

# Check for token
if [ -z "${VERCEL_TOKEN}" ]; then
  echo "Error: VERCEL_TOKEN environment variable is not set."
  echo "Create a token at https://vercel.com/account/settings/tokens and export it before running this script."
  exit 1
fi

# Helper to add / update an env var for the production environment
set_env() {
  local key=$1
  local value=$2
  echo "Ensuring ${key} is set to the correct value…"
  # Remove existing variable if it exists (ignore errors)
  ${VERCEL_CMD} env rm ${key} production --yes || true
  # Add the variable with the value in non‑interactive mode
  ${VERCEL_CMD} env add ${key} production --value "${value}" --yes
}

# Alias add_env to set_env for compatibility with later calls
add_env() {
  set_env "$@"
}

# Add required env vars (they will be overwritten if they already exist)
add_env NEXT_PUBLIC_API_URL "${API_URL}"
add_env NEXT_PUBLIC_RENDER_API_URL "${RENDER_API_URL}"
add_env NEXT_PUBLIC_UPLOAD_URL "${UPLOAD_URL}"
add_env NEXT_PUBLIC_FRONTEND_URL "${FRONTEND_URL}"
add_env VITE_API_URL "${RENDER_API_URL}"


# Deploy to production
echo "Deploying to Vercel (production)..."
  ${VERCEL_CMD} --prod --yes

echo "✅ Deployment triggered. Check the Vercel dashboard for status."
