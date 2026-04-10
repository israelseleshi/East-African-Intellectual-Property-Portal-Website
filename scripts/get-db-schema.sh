#!/usr/bin/env bash
set -euo pipefail

# Fetch MySQL schema over SSH safely
# Requires environment variables (no hardcoded secrets):
#   TPMS_SSH_USER, TPMS_SSH_HOST, TPMS_SSH_PORT, TPMS_SSH_KEY
#   TPMS_DB_USER, TPMS_DB_PASS, TPMS_DB_NAME

: "${TPMS_SSH_USER:?Missing TPMS_SSH_USER}"
: "${TPMS_SSH_HOST:?Missing TPMS_SSH_HOST}"
: "${TPMS_SSH_KEY:?Missing TPMS_SSH_KEY}"
: "${TPMS_DB_USER:?Missing TPMS_DB_USER}"
: "${TPMS_DB_PASS:?Missing TPMS_DB_PASS}"
: "${TPMS_DB_NAME:?Missing TPMS_DB_NAME}"

TPMS_SSH_PORT="${TPMS_SSH_PORT:-22}"

if [[ ! -f "$TPMS_SSH_KEY" ]]; then
  echo "SSH key not found: $TPMS_SSH_KEY" >&2
  exit 1
fi

echo "Fetching schema from database: $TPMS_DB_NAME"

ssh -i "$TPMS_SSH_KEY" -p "$TPMS_SSH_PORT" -o StrictHostKeyChecking=no "${TPMS_SSH_USER}@${TPMS_SSH_HOST}" \
  "mysql -u '$TPMS_DB_USER' -p'$TPMS_DB_PASS' '$TPMS_DB_NAME' -e 'SHOW TABLES'"

echo "Tip: use scripts/get-db-schema.ps1 for JSON export into docs/database_schema.json"
