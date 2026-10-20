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

for name in VAPID_SUBJECT VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY PUSH_TICK_SECRET; do
  if [ -z "${!name:-}" ]; then
    echo "Missing $name in .env.secrets.local" >&2
    exit 1
  fi
done

pnpm exec supabase secrets set --project-ref "$REF" \
  VAPID_SUBJECT="$VAPID_SUBJECT" \
  VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY" \
  PUSH_TICK_SECRET="$PUSH_TICK_SECRET"

# what the push-tick cron job reads (see the notification_schedule migration)
put_vault_secret() {
  pnpm exec supabase db query --linked --project-ref "$REF" "do \$\$ begin
    if exists (select 1 from vault.secrets where name = '$1') then
      perform vault.update_secret((select id from vault.secrets where name = '$1'), '$2');
    else
      perform vault.create_secret('$2', '$1');
    end if;
  end \$\$;" >/dev/null
}
put_vault_secret push_tick_url "https://$REF.supabase.co/functions/v1/push-tick"
put_vault_secret push_tick_secret "$PUSH_TICK_SECRET"

for dir in supabase/functions/*/; do
  name=$(basename "$dir")
  # _shared holds code the functions import, not a function
  [ "$name" = "_shared" ] && continue
  # push-tick checks its own secret (called by pg_cron, not by a signed-in person)
  flags=()
  [ "$name" = "push-tick" ] && flags=(--no-verify-jwt)
  pnpm exec supabase functions deploy "$name" --project-ref "$REF" --use-api "${flags[@]}"
done
echo "Functions deployed to $1 ($REF)."
