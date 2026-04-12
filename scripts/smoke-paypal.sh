#!/usr/bin/env bash
# Smoke test: PayPal end-to-end (flipflop-service)
#
# Prerequisites:
#   - Order ORDER_ID exists for the JWT user and has paymentMethod=paypal (set on create-order).
#   - payments-microservice configured with PAYPAL_* (create-payment calls PayPal REST).
#
# Usage:
#   BASE_URL=http://localhost:3011 TOKEN=<jwt> ORDER_ID=<uuid> bash scripts/smoke-paypal.sh
#
# Optional:
#   PAYMENT_WEBHOOK_API_KEY — if api-gateway expects X-API-Key on /api/webhooks/payment-result.
#
# Steps:
#   1) POST /api/payu/create-payment/:ORDER_ID (legacy route; forwards to order-service).
#   2) Assert data.redirectUri looks like PayPal (sandbox or live).
#   3) POST /api/webhooks/payment-result with status=completed (simulates payments callback).
#   4) GET /api/orders/:ORDER_ID and assert paymentStatus=paid.
#
# Note: Step 3 does not exercise PayPal IPN; it validates flipflop webhook + order update path only.

set -euo pipefail

: "${TOKEN?set TOKEN to a flipflop JWT}"
: "${ORDER_ID?set ORDER_ID to order UUID}"

BASE_URL="${BASE_URL:-http://localhost:3011}"
BASE_URL="${BASE_URL%/}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

auth_hdr=( -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" )

create_json="$(curl -sfS -X POST "${BASE_URL}/api/payu/create-payment/${ORDER_ID}" "${auth_hdr[@]}" -d '{}')"
if ! echo "${create_json}" | jq -e '.success == true' >/dev/null 2>&1; then
  echo "FAIL: create-payment unsuccessful: ${create_json}" >&2
  exit 1
fi

redirect="$(echo "${create_json}" | jq -r '.data.redirectUri // empty')"
if [[ -z "${redirect}" ]]; then
  echo "FAIL: missing data.redirectUri in create-payment response: ${create_json}" >&2
  exit 1
fi

if [[ "${redirect}" != *"sandbox.paypal.com"* && "${redirect}" != *"www.paypal.com"* ]]; then
  echo "FAIL: redirectUri is not a known PayPal host: ${redirect}" >&2
  exit 1
fi

order_json="$(curl -sfS "${BASE_URL}/api/orders/${ORDER_ID}" "${auth_hdr[@]}")"
order_number="$(echo "${order_json}" | jq -r '.data.orderNumber // empty')"
if [[ -z "${order_number}" ]]; then
  echo "FAIL: could not read orderNumber from GET /api/orders/${ORDER_ID}: ${order_json}" >&2
  exit 1
fi

payment_id="smoke-paypal-$(date +%s)"

webhook_hdr=( -H "Content-Type: application/json" )
if [[ -n "${PAYMENT_WEBHOOK_API_KEY:-}" ]]; then
  webhook_hdr+=( -H "X-API-Key: ${PAYMENT_WEBHOOK_API_KEY}" )
fi

curl -sfS -X POST "${BASE_URL}/api/webhooks/payment-result" "${webhook_hdr[@]}" \
  -d "{\"paymentId\":\"${payment_id}\",\"orderId\":\"${order_number}\",\"status\":\"completed\"}" \
  >/dev/null

final="$(curl -sfS "${BASE_URL}/api/orders/${ORDER_ID}" "${auth_hdr[@]}")"
ps="$(echo "${final}" | jq -r '.data.paymentStatus // empty')"
if [[ "${ps}" != "paid" ]]; then
  echo "FAIL: expected paymentStatus paid, got: ${ps}" >&2
  echo "${final}" | jq . >&2
  exit 1
fi

echo "PASS: redirectUri present (${redirect:0:64}...); webhook simulation left paymentStatus=paid."
