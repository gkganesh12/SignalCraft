#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${WORKSPACE_ID:-}" ]]; then
  echo "WORKSPACE_ID is required"
  exit 1
fi

API_URL=${API_URL:-http://localhost:4000}

curl -s -X POST "$API_URL/webhooks/sentry?workspaceId=$WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  --data-binary @Docs/fixtures/sentry-webhook.json
