#!/usr/bin/env bash
# Pushes pending migrations to PRODUCTION, then links the CLI back to dev, also when the push
# fails. Prove every migration on dev first (pnpm test:db). Passwords: .env.secrets.local.
set -euo pipefail

PROD_REF=gbpzugmxglxvfvtpqqfb
DEV_REF=pbmximodvdiqtrexuwlq

cd "$(dirname "$0")/.."
set -a
. ./.env.secrets.local
set +a

relink_dev() {
  pnpm exec supabase link --project-ref "$DEV_REF" -p "$DEV_DB_PASSWORD" >/dev/null
  echo "CLI linked to dev again ($(cat supabase/.temp/project-ref))."
}
trap relink_dev EXIT

pnpm exec supabase link --project-ref "$PROD_REF" -p "$PROD_DB_PASSWORD" >/dev/null
echo "Pending on production:"
pnpm exec supabase db push --linked --dry-run -p "$PROD_DB_PASSWORD"
pnpm exec supabase db push --linked --yes -p "$PROD_DB_PASSWORD"
