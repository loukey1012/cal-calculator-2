#!/usr/bin/env bash
# Deploys the Edge Functions (supabase/functions) and their secrets to dev or production.
# Usage: bash scripts/deploy-functions.sh dev|prod. Secrets come from .env.secrets.local.
set -euo pipefail

case "${1:-}" in
  dev) REF=pbmximodvdiqtrexuwlq ;;
  prod) REF=gbpzugmxglxvfvtpqqfb ;;
  *)
    echo "Usage: bash scripts/deploy-functions.sh dev|prod" >&2
    exit 1
    ;;
esac

cd "$(dirname "$0")/.."
set -a
. ./.env.secrets.local
set +a

for name in VAPID_SUBJECT VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY; do
  if [ -z "${!name:-}" ]; then
    echo "Missing $name in .env.secrets.local" >&2
    exit 1
  fi
done

pnpm exec supabase secrets set --project-ref "$REF" \
  VAPID_SUBJECT="$VAPID_SUBJECT" \
  VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY"

for dir in supabase/functions/*/; do
  name=$(basename "$dir")
  # _shared holds code the functions import, not a function
  [ "$name" = "_shared" ] && continue
  pnpm exec supabase functions deploy "$name" --project-ref "$REF" --use-api
done
echo "Functions deployed to $1 ($REF)."
