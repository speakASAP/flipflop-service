#!/usr/bin/env bash
# Smoke test: GP WebPay flow against flipflop api-gateway (no live GP WebPay browser step).
# Prerequisites: jq, curl; order must exist with paymentMethod=webpay (create-payment uses DB field).
#
# Usage:
#   TOKEN=<jwt> ORDER_ID=<order-uuid> bash scripts/smoke-webpay.sh
# Optional:
#   BASE_URL=https://flipflop.example/api   # default: http://127.0.0.1:3000
#   PAYMENT_WEBHOOK_API_KEY=<key>         # if api-gateway validates X-API-Key on webhooks
#
# Real path: POST /api/payu/create-payment/:orderId (JwtAuthGuard). AGENT doc /api/orders/... is not wired.

set -euo pipefail

: "${TOKEN:?set TOKEN (Bearer JWT)}"
: "${ORDER_ID:?set ORDER_ID (internal order UUID)}"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
BASE_URL="${BASE_URL%/}"

hdr_auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
hdr_webhook=(-H "Content-Type: application/json")
if [[ -n "${PAYMENT_WEBHOOK_API_KEY:-}" ]]; then
  hdr_webhook+=(-H "X-API-Key: ${PAYMENT_WEBHOOK_API_KEY}")
fi

echo "[1/4] POST create-payment (webpay from order row)..."
pay_json="$(curl -fsS -X POST "${BASE_URL}/api/payu/create-payment/${ORDER_ID}" "${hdr_auth[@]}")"

if [[ "$(echo "${pay_json}" | jq -r '.success // false')" != "true" ]]; then
  echo "create-payment failed: ${pay_json}" >&2
  exit 1
fi

redirect_uri="$(echo "${pay_json}" | jq -r '.data.redirectUri // empty')"
if [[ -z "${redirect_uri}" ]]; then
  echo "missing data.redirectUri: ${pay_json}" >&2
  exit 1
fi

echo "[2/4] Assert GP WebPay redirect DESCRIPTION is not literal placeholder..."
desc="$(python3 -c "
from urllib.parse import urlparse, parse_qs, unquote
import os
q = parse_qs(urlparse(os.environ['U']).query)
v = (q.get('DESCRIPTION') or [''])[0]
print(unquote(v))
" U="${redirect_uri}")"
if [[ "${desc}" == "DESCRIPTION" ]]; then
  echo "DESCRIPTION param is still hardcoded placeholder" >&2
  exit 1
fi
if [[ -z "${desc}" ]]; then
  echo "DESCRIPTION missing from redirect URL" >&2
  exit 1
fi
echo "DESCRIPTION value (decoded): ${desc}"

echo "[3/4] Simulate payments-microservice JSON callback (completed == PRCODE=0 path)..."
order_json="$(curl -fsS "${BASE_URL}/api/orders/${ORDER_ID}" "${hdr_auth[@]}")"
order_number="$(echo "${order_json}" | jq -r '.data.orderNumber // empty')"
payment_id="$(echo "${order_json}" | jq -r '.data.paymentTransactionId // empty')"
if [[ -z "${order_number}" ]]; then
  echo "could not read orderNumber" >&2
  exit 1
fi
if [[ -z "${payment_id}" ]]; then
  echo "could not read paymentTransactionId" >&2
  exit 1
fi

webhook_body="$(jq -n \
  --arg pid "${payment_id}" \
  --arg oid "${order_number}" \
  '{paymentId:$pid, orderId:$oid, status:"completed", paymentMethod:"webpay", metadata:{PRCODE:0, SRCODE:0, simulated:true}}')"

curl -fsS -X POST "${BASE_URL}/api/webhooks/payment-result" "${hdr_webhook[@]}" -d "${webhook_body}" >/dev/null

echo "[4/4] Assert order paymentStatus=paid..."
final="$(curl -fsS "${BASE_URL}/api/orders/${ORDER_ID}" "${hdr_auth[@]}")"
pstatus="$(echo "${final}" | jq -r '.data.paymentStatus // empty')"
if [[ "${pstatus}" != "paid" ]]; then
  echo "expected paymentStatus=paid, got: ${pstatus} full=${final}" >&2
  exit 1
fi

echo "PASS: webpay create-payment + simulated completed webhook; order is paid."
