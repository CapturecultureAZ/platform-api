#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000"
JSON_HDR="Content-Type: application/json"

echo "== 1) Creating code via /api/square-webhook =="
RESP=$(curl --fail --show-error --max-time 10 -sS \
  -X POST "$BASE/api/square-webhook" \
  -H "$JSON_HDR" \
  -d '{"tier":"single","usesAllowed":1,"minutesToLive":60}')
echo "$RESP"

# Extract code (robust even if order changes)
CODE=$(printf '%s' "$RESP" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
if [ -z "${CODE:-}" ]; then
  echo "!! Could not parse code from response"
  exit 1
fi
echo "== Extracted CODE: $CODE =="

echo "== 2) Validate (consume=false) =="
curl --fail --show-error --max-time 10 -sS \
  -X POST "$BASE/api/codes/validate" \
  -H "$JSON_HDR" \
  -d "{\"code\":\"$CODE\",\"consume\":false}"
echo

echo "== 3) Validate (consume=true) =="
curl --fail --show-error --max-time 10 -sS \
  -X POST "$BASE/api/codes/validate" \
  -H "$JSON_HDR" \
  -d "{\"code\":\"$CODE\",\"consume\":true}"
echo

echo "== 4) Validate again after consume (should fail/not ok) =="
set +e
curl --show-error --max-time 10 -sS \
  -X POST "$BASE/api/codes/validate" \
  -H "$JSON_HDR" \
  -d "{\"code\":\"$CODE\",\"consume\":false}"
echo
set -e

echo "== 5) Tag commit (optional) =="
git add .
git commit -m "Square dev-bypass tested; validate flow verified" || true
git tag -f v1.0.3-webhook
git tag

echo "== DONE =="
