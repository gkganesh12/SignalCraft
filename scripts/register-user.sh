#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${API_URL:-}" ]]; then
  API_URL="http://localhost:5050"
fi

if [[ -z "${CLERK_ID:-}" || -z "${EMAIL:-}" ]]; then
  echo "CLERK_ID and EMAIL are required"
  exit 1
fi

WORKSPACE_NAME=${WORKSPACE_NAME:-SignalCraft Workspace}

payload=$(cat <<JSON
{"clerkId":"${CLERK_ID}","email":"${EMAIL}","workspaceName":"${WORKSPACE_NAME}"}
JSON
)

curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "$payload"
