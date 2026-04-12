#!/usr/bin/env bash
# Smoke test: PayU end-to-end (via flipflop api-gateway → order-service → payments-ms).
#
# Prerequisites:
# - Order ORDER_ID (UUID) must exist for the JWT user and should have paymentMethod=payu
#   (create-payment does not accept a body; it uses the order row's paymentMethod).
# - Step 1 calls payments-microservice, which may call PayU OAuth/order APIs (sandbox or prod per PAYU_* on payments-ms).
#
# Usage:
#   BASE_URL=http://localhost:3011 TOKEN=<jwt> ORDER_ID=<uuid> [PAYMENT_WEBHOOK_API_KEY=key] bash scripts/smoke-payu.sh
#
# Optional:
#   BASE_URL - api-gateway base URL (default: http://localhost:3011)
#   PAYMENT_WEBHOOK_API_KEY - if flipflop PAYMENT_WEBHOOK_API_KEY is set, pass the same value (X-API-Key on webhook).

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3011}"
BASE_URL="${BASE_URL%/}"

if [[ -z "${TOKEN:-}" ]]; then
  echo "ERROR: set TOKEN to a valid JWT (Bearer)." >&2
  exit 1
fi
if [[ -z "${ORDER_ID:-}" ]]; then
  echo "ERROR: set ORDER_ID to the order UUID." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required to parse JSON responses." >&2
  exit 1
fi

die() {
  echo "ERROR: $*" >&2
  exit 1
}

# --- 1) Initiate payment (legacy route: /api/payu/create-payment/:orderId) ---
tmp_create="$(mktemp)"
tmp_get="$(mktemp)"
tmp_hook="$(mktemp)"
tmp_final="$(mktemp)"
trap 'rm -f "$tmp_create" "$tmp_get" "$tmp_hook" "$tmp_final"' EXIT

code="$(curl -sS -o "$tmp_create" -w "%{http_code}" -X POST \
  "$BASE_URL/api/payu/create-payment/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")"
if [[ "$code" != "200" ]]; then
  die "create-payment HTTP $code: $(cat "$tmp_create")"
fi

redirect_uri="$(python3 -c '
import json,sys
with open(sys.argv[1]) as f:
    d=json.load(f)
if not d.get("success"):
    print("create-payment success=false: "+json.dumps(d)[:500], file=sys.stderr)
    sys.exit(1)
data=d.get("data") or {}
uri=data.get("redirectUri") or data.get("redirectUrl") or ""
print(uri)
' "$tmp_create")"

if [[ -z "$redirect_uri" ]]; then
  die "create-payment response missing redirectUri/redirectUrl: $(cat "$tmp_create")"
fi

case "$redirect_uri" in
  https://secure.payu.com/*|https://secure.snd.payu.com/*) ;;
  *) die "redirect URI not PayU (expected https://secure.payu.com/... or https://secure.snd.payu.com/...): $redirect_uri" ;;
esac
echo "OK: create-payment returned PayU redirect URL."

# --- 2) Resolve business order number (webhook body orderId = orderNumber, not UUID) ---
code="$(curl -sS -o "$tmp_get" -w "%{http_code}" -X GET \
  "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")"

if [[ "$code" != "200" ]]; then
  die "get order HTTP $code: $(cat "$tmp_get")"
fi

order_number="$(python3 -c '
import json,sys
with open(sys.argv[1]) as f:
    d=json.load(f)
if not d.get("success"):
    print("get order success=false", file=sys.stderr)
    sys.exit(1)
data=d.get("data") or {}
print(data.get("orderNumber") or "")
' "$tmp_get")"

if [[ -z "$order_number" ]]; then
  die "get order missing orderNumber: $(cat "$tmp_get")"
fi

# --- 3) Simulate payments callback: POST /api/webhooks/payment-result ---
hook_headers=(-H "Content-Type: application/json")
if [[ -n "${PAYMENT_WEBHOOK_API_KEY:-}" ]]; then
  hook_headers+=(-H "X-API-Key: $PAYMENT_WEBHOOK_API_KEY")
fi

payment_id="smoke-payu-$(date +%s)"
code="$(curl -sS -o "$tmp_hook" -w "%{http_code}" -X POST "$BASE_URL/api/webhooks/payment-result" \
  "${hook_headers[@]}" \
  -d "$(python3 -c 'import json,sys; print(json.dumps({"orderId":sys.argv[1],"paymentId":sys.argv[2],"status":"completed"}))' "$order_number" "$payment_id")")"

if [[ "$code" != "200" ]]; then
  die "payment-result webhook HTTP $code: $(cat "$tmp_hook")"
fi
echo "OK: payment-result webhook accepted (HTTP 200)."

# --- 4) Assert order paid ---
code="$(curl -sS -o "$tmp_final" -w "%{http_code}" -X GET \
  "$BASE_URL/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")"

if [[ "$code" != "200" ]]; then
  die "final get order HTTP $code: $(cat "$tmp_final")"
fi

pay_status="$(python3 -c '
import json,sys
with open(sys.argv[1]) as f:
    d=json.load(f)
data=d.get("data") or {}
print(data.get("paymentStatus") or "")
' "$tmp_final")"

if [[ "$pay_status" != "paid" ]]; then
  die "expected paymentStatus=paid, got: $pay_status ($(cat "$tmp_final"))"
fi

echo "OK: GET /api/orders/$ORDER_ID shows paymentStatus=paid."
echo "Smoke PayU: PASS"
