#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if [[ -z "${CLERK_ID:-}" && -z "${EMAIL:-}" ]]; then
  echo "Set CLERK_ID or EMAIL to lookup the user"
  exit 1
fi

filter=""
if [[ -n "${CLERK_ID:-}" ]]; then
  filter="\"clerkId\" = '${CLERK_ID}'"
else
  filter="\"email\" = '${EMAIL}'"
fi

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 <<SQL
\echo 'User lookup'
SELECT id, "clerkId", email, "workspaceId", role FROM "User" WHERE ${filter};
\echo 'Workspace lookup'
SELECT w.id, w.name FROM "Workspace" w
JOIN "User" u ON u."workspaceId" = w.id
WHERE ${filter};
SQL
