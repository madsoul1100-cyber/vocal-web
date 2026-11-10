#!/usr/bin/env bash
# Build vocal-web on the EC2 box and publish it to nginx's web root.
#
#   cd ~/vocal-web && git pull && ./deploy/deploy.sh
#
# Build-time env is passed on the command line, which beats every .env* file
# (the repo's committed .env.local points at localhost and would otherwise win
# over .env.production).
set -euo pipefail

cd "$(dirname "$0")/.."

SITE_URL="${SITE_URL:-https://bharosa.my-leader.in}"
WEB_ROOT="${WEB_ROOT:-/var/www/bharosa}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-$SITE_URL/v1}"
export VITE_API_V2_BASE_URL="${VITE_API_V2_BASE_URL:-$SITE_URL/v2}"
export VITE_ORG_SLUG="${VITE_ORG_SLUG:-demo}"   # change if prod org slug differs

echo "==> API:  $VITE_API_BASE_URL"
echo "==> Org:  $VITE_ORG_SLUG"

npm ci || npm install
npm run build

echo "==> Publishing dist/ to $WEB_ROOT"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete dist/ "$WEB_ROOT"/
sudo chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || sudo chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || true

sudo nginx -t && sudo systemctl reload nginx
echo "==> Done: $SITE_URL"
