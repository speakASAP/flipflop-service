#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh — Post-deploy smoke test for flipflop-service
# =============================================================================
# Usage:
#   ./scripts/smoke-test.sh
#
# Tests all microservice health endpoints + key API routes through the gateway.
# Exits 0 on all pass, 1 if any check fails.
#
# Env vars (loaded from .env automatically):
#   API_GATEWAY_PORT    — host port for api-gateway (default 3511 green / 3010 blue)
#   PRODUCT_SERVICE_PORT, ORDER_SERVICE_PORT, USER_SERVICE_PORT,
#   CART_SERVICE_PORT, WAREHOUSE_SERVICE_PORT, SUPPLIER_SERVICE_PORT
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step()  { echo -e "${CYAN}▶ $*${NC}"; }
ok()    { echo -e "${GREEN}✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }
fail_check() { echo -e "${RED}✗ $*${NC}"; }

# ── Load .env ─────────────────────────────────────────────────────────────────
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    key="${line%%=*}"; val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
    [[ -z "${!key+x}" ]] && export "$key"="$val"
  done < "$PROJECT_ROOT/.env"
fi

# ── Detect active green/blue ports ────────────────────────────────────────────
_active_port() {
  local base_name="$1" green_host="$2" blue_host="$3"
  for color in green blue; do
    local container="${base_name}-${color}"
    if docker ps --filter "name=^${container}$" --filter "health=healthy" \
         --format "{{.Names}}" 2>/dev/null | grep -q "^${container}$"; then
      docker inspect "${container}" \
        --format '{{range $p, $c := .NetworkSettings.Ports}}{{if $c}}{{(index $c 0).HostPort}}{{end}}{{end}}' \
        2>/dev/null | tr -d '\n'
      return
    fi
  done
  echo "${green_host}"  # fallback
}

GW_PORT=$(_active_port "flipflop-service-api-gateway"    "${API_GATEWAY_PORT:-3511}"      "3010")
PP_PORT=$(_active_port "flipflop-service-product-service" "${PRODUCT_SERVICE_PORT:-3502}"  "3502")
OP_PORT=$(_active_port "flipflop-service-order-service"   "${ORDER_SERVICE_PORT:-3503}"    "3503")
US_PORT=$(_active_port "flipflop-service-user-service"    "${USER_SERVICE_PORT:-3504}"     "3504")
WH_PORT=$(_active_port "flipflop-service-warehouse-service" "${WAREHOUSE_SERVICE_PORT:-3505}" "3505")
SU_PORT=$(_active_port "flipflop-service-supplier-service" "${SUPPLIER_SERVICE_PORT:-3506}"  "3506")
CA_PORT=$(_active_port "flipflop-service-cart-service"    "${CART_SERVICE_PORT:-3509}"     "3509")

GW_URL="http://localhost:${GW_PORT}"

PASS=0; FAIL=0

# ── Check helper ──────────────────────────────────────────────────────────────
_check() {
  local label="$1" url="$2" expect_key="${3:-}" auth_header="${4:-}"

  local args=(-sf -w "\n__HTTP_CODE:%{http_code}" --max-time 8)
  [[ -n "$auth_header" ]] && args+=(-H "$auth_header")

  local out http_code body
  out=$(curl "${args[@]}" "$url" 2>/dev/null || true)
  http_code=$(echo "$out" | grep "__HTTP_CODE:" | sed 's/__HTTP_CODE://')
  body=$(echo "$out" | grep -v "__HTTP_CODE:")

  if [[ "${http_code}" =~ ^2 ]]; then
    if [[ -n "${expect_key}" ]]; then
      if echo "${body}" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  top = d if isinstance(d, dict) else (d[0] if isinstance(d, list) and d else {})
  assert '${expect_key}' in top
except: sys.exit(1)
" 2>/dev/null; then
        ok "${label} [HTTP ${http_code}]"
        PASS=$((PASS+1))
      else
        fail_check "${label} [HTTP ${http_code}] — key '${expect_key}' missing"
        FAIL=$((FAIL+1))
      fi
    else
      ok "${label} [HTTP ${http_code}]"
      PASS=$((PASS+1))
    fi
  else
    fail_check "${label} FAILED [HTTP ${http_code:-no-response}]"
    FAIL=$((FAIL+1))
  fi
}

# ── Health: per-service ───────────────────────────────────────────────────────
step "Microservice health checks"
_check "api-gateway   /health (port ${GW_PORT})" "http://localhost:${GW_PORT}/health"  "status"
_check "product-svc   /health (port ${PP_PORT})" "http://localhost:${PP_PORT}/health"  "status"
_check "order-svc     /health (port ${OP_PORT})" "http://localhost:${OP_PORT}/health"  "status"
_check "user-svc      /health (port ${US_PORT})" "http://localhost:${US_PORT}/health"  "status"
_check "warehouse-svc /health (port ${WH_PORT})" "http://localhost:${WH_PORT}/health"  "status"
_check "supplier-svc  /health (port ${SU_PORT})" "http://localhost:${SU_PORT}/health"  "status"
_check "cart-svc      /health (port ${CA_PORT})" "http://localhost:${CA_PORT}/health"  "status"

# ── API gateway routes ────────────────────────────────────────────────────────
echo ""
step "API gateway routes (via port ${GW_PORT})"
_check "GET /api/products"   "${GW_URL}/api/products?limit=1"    "success"
_check "GET /api/categories" "${GW_URL}/api/categories"           "success"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
step "Results: ${PASS} passed, ${FAIL} failed"
if [[ ${FAIL} -eq 0 ]]; then
  ok "All checks passed"
  exit 0
else
  warn "${FAIL} check(s) failed — service may be degraded"
  exit 1
fi
