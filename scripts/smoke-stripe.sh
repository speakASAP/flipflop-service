#!/usr/bin/env bash
# Smoke test: Stripe end-to-end (flipflop-service + payments-microservice contract)
#
# Usage:
#   TOKEN=<jwt> ORDER_ID=<order-uuid> PAYMENT_WEBHOOK_API_KEY=<key> bash scripts/smoke-stripe.sh
#
# Optional:
#   BASE_URL — api-gateway base (default http://localhost:3511)
#
# Requires:
#   curl; python3 for JSON (stdlib)
#
# Preconditions:
#   Order must have paymentMethod=stripe (create-payment does not accept a body override).
#
# Flow:
#   1) GET /api/orders/:ORDER_ID — read orderNumber and paymentMethod
#   2) POST /api/payu/create-payment/:ORDER_ID — same route as PayU; calls payments-ms with order paymentMethod
#   3) Assert redirectUri or clientSecret when present (current Stripe provider often returns neither)
#   4) Simulate merchant callback: POST /api/webhooks/payment-result with x-api-key (signature is on payments-ms /webhooks/stripe, not this URL)
#   5) GET order — assert paymentStatus is paid
#
# Note: Real Stripe CLI (`stripe trigger payment_intent.succeeded`) hits payments-microservice /webhooks/stripe
# only; use that path only when payments-ms is reachable with valid STRIPE_* test keys and webhook forwarding.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${TOKEN:?Set TOKEN to a JWT for a user who owns the order}"
: "${ORDER_ID:?Set ORDER_ID to flipflop order UUID}"
: "${PAYMENT_WEBHOOK_API_KEY:?Set PAYMENT_WEBHOOK_API_KEY (same as flipflop PAYMENT_WEBHOOK_API_KEY)}"

BASE_URL="${BASE_URL:-http://localhost:3511}"
BASE_URL="${BASE_URL%/}"

hdr_auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
hdr_webhook=(-H "Content-Type: application/json" -H "x-api-key: ${PAYMENT_WEBHOOK_API_KEY}")

echo "[1/5] GET order ${ORDER_ID}"
ORDER_JSON="$(curl -fsS "${hdr_auth[@]}" "${BASE_URL}/api/orders/${ORDER_ID}")" || {
  echo "FAIL: could not fetch order"
  exit 1
}

ORDER_NUMBER="$(printf '%s' "$ORDER_JSON" | python3 -c "import json,sys; j=json.load(sys.stdin); print(j.get('data',{}).get('orderNumber',''))")"
PM="$(printf '%s' "$ORDER_JSON" | python3 -c "import json,sys; j=json.load(sys.stdin); print(j.get('data',{}).get('paymentMethod',''))")"
if [[ "$PM" != "stripe" ]]; then
  echo "WARN: order paymentMethod is '${PM}', not stripe — create-payment will not use Stripe."
fi

echo "[2/5] POST create-payment"
PAY_JSON="$(curl -fsS "${hdr_auth[@]}" -X POST "${BASE_URL}/api/payu/create-payment/${ORDER_ID}")" || {
  echo "FAIL: create-payment request failed"
  exit 1
}

REDIR="$(printf '%s' "$PAY_JSON" | python3 -c "import json,sys; j=json.load(sys.stdin); d=j.get('data') or {}; print(d.get('redirectUri') or d.get('redirectUrl') or '')")"
if [[ -n "$REDIR" ]]; then
  echo "OK: redirectUri/redirectUrl present"
else
  echo "WARN: no redirectUri (Stripe provider may not expose checkout URL or client_secret yet)"
fi

echo "[3/5] POST payment-result (simulated completed callback)"
export ORDER_NUMBER
CALLBACK_BODY="$(python3 -c 'import json,os; print(json.dumps({"paymentId":"smoke-stripe-test","orderId":os.environ["ORDER_NUMBER"],"status":"completed","paymentMethod":"stripe"}))')"

curl -fsS "${hdr_webhook[@]}" -X POST "${BASE_URL}/api/webhooks/payment-result" \
  -d "$CALLBACK_BODY" >/dev/null || {
  echo "FAIL: payment-result webhook"
  exit 1
}

echo "[4/5] GET order again"
FINAL="$(curl -fsS "${hdr_auth[@]}" "${BASE_URL}/api/orders/${ORDER_ID}")" || {
  echo "FAIL: could not re-fetch order"
  exit 1
}

PS="$(printf '%s' "$FINAL" | python3 -c "import json,sys; j=json.load(sys.stdin); print(j.get('data',{}).get('paymentStatus',''))")"
echo "[5/5] paymentStatus=${PS}"
if [[ "$PS" != "paid" ]]; then
  echo "FAIL: expected paymentStatus paid, got '${PS}'"
  exit 1
fi

echo "PASS: smoke-stripe completed (callback simulation path)."
