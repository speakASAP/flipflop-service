# GOAL 06 Validation Report: Orders Hub Integration

## Status

Implemented, validated, deployed, and live-smoke proven on 2026-06-13.
Deployment completed for all FlipFlop workloads. Runtime authorization was
corrected with an Orders-runtime-signed `ORDERS_SERVICE_TOKEN`, the
ExternalSecret was refreshed, only `flipflop-order-service` was restarted, and
final checkout smoke proved central Orders forwarding in production.

## Commands

```bash
python3 scripts/pre_coding_gate.py --root .
python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues
npm run verify:orders-hub-integration
cd services/order-service && npm run build
git diff --check
rg -n "(Bearer [A-Za-z0-9_./+=:-]{12,}|client_secret|private_key|apiKey|cardNumber|cardToken|providerPayload|providerResponse)" shared/clients/order-client.service.ts services/order-service/src/orders/orders.service.ts scripts/verify-orders-hub-integration.js implementation-goals/GOAL-06-orders-hub-integration* docs/IMPLEMENTATION_STATE.md
./scripts/deploy.sh
npm run verify:orders-hub-integration
curl -fsSI https://flipflop.alfares.cz/
curl -fsS 'https://flipflop.alfares.cz/api/products?limit=1'
node scripts/smoke-checkout.js
central Orders auth probe from the deployed order-service pod
FlipFlop local order metadata evidence query
central Orders log evidence query for ORD-1781378332000-840
```

## Results

- IPS pre-coding gate: PASS; report written to `reports/validation/ips-pre-coding-gate.json`.
- Strict documentation audit: PASS; score 100/100.
- Orders Hub integration verifier: PASS; contract version, `ORDERS_SERVICE_URL`, stable idempotency fields, nested totals/payment/shipping payload, bounded address forwarding, no central customer-note forwarding, and idempotency-conflict surfacing all passed.
- Kubernetes config alias: PASS; `k8s/configmap.yaml` now exposes `ORDERS_SERVICE_URL=http://orders-microservice:3203` and the client remains compatible with the existing `ORDERS_MICROSERVICE_URL`.
- Order-service build: PASS.
- Whitespace diff check: PASS after removing Markdown trailing spaces.
- Sensitive/provider-term scan: reviewed. Matches were only the verifier's forbidden-term list, not forwarded payload fields or secret values.
- Deployment: PASS after delayed rollout completion. `./scripts/deploy.sh`
  built and pushed all FlipFlop images, applied manifests, configured the
  ConfigMap and ExternalSecret, and triggered restarts for
  `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`,
  `flipflop-cart-service`, `flipflop-order-service`, and
  `flipflop-user-service`. The script's rollout wait initially timed out
  while pods were still pulling from the local registry, but the current
  replacement pods later reached 1/1 ready for all six deployments.
- Deployed image evidence: running order-service image ID
  `localhost:5000/flipflop-order-service@sha256:773a6cad6064d1af3106733fa7ce617a1af4f5aaa97e14c8478397bba732afb9`.
- Post-deploy verifier: PASS; `npm run verify:orders-hub-integration` passed
  against the deployed source state.
- Public runtime checks: PASS; homepage returned HTTP 200 and the public
  product API returned product data.
- Runtime wiring: PASS; deployed order-service has
  `ORDERS_SERVICE_URL=http://orders-microservice:3203`,
  `ORDERS_MICROSERVICE_URL=http://orders-microservice:3203`, and local
  `ORDER_SERVICE_URL=http://flipflop-order-service:3003`.
- Workload health: PARTIAL; all service health endpoints returned HTTP 200,
  but bodies reported `degraded` due a logging dependency error.
  `logging-microservice` itself returned healthy.
- Runtime authorization: PASS. The deployed FlipFlop order-service pod has
  `ORDERS_SERVICE_TOKEN` projected, and a non-mutating in-cluster probe to
  central Orders returned HTTP 200 without exposing token values.
- Checkout smoke: PASS. `node scripts/smoke-checkout.js` created
  `ORD-1781378332000-840` with pending Stripe payment and a redirect URL.
- Central Orders forwarding: PASS. FlipFlop local metadata recorded
  `centralOrdersForwarding.status=accepted` and
  `centralOrderId=ae51a415-ded0-4bf9-ac4e-c9adcab97d80`; central Orders logs
  recorded `operation=order.create`, `channel=flipflop`, and
  `outcome=success` for the same smoke order.

## Intent Compliance Report

- Original intent preserved: FlipFlop remains the owner-approved storefront application feeding central Orders from the server-side order-service.
- Shared-service boundary preserved: Orders receives bounded sales-channel order snapshots; Payments remains payment identity/reconciliation owner; Warehouse remains stock truth; Catalog remains product truth.
- Idempotency contract preserved: FlipFlop sends `orders.create.v1`, `channel=flipflop`, stable `channelAccountId`, and stable `externalOrderId=order.orderNumber`.
- Runtime wiring clarified: the central Orders client no longer uses local `ORDER_SERVICE_URL`; it uses `ORDERS_SERVICE_URL`, then existing `ORDERS_MICROSERVICE_URL`, then `ORDER_HUB_SERVICE_URL`, then the in-cluster central Orders default.
- Payment safety preserved: no provider credential, provider webhook, payment capture, refund, cancellation, price, discount, or order-total behavior was changed.
- Sensitive-data boundary preserved: central forwarding now uses bounded customer/address fields and does not forward raw local delivery-address records, customer notes, raw provider payloads, card data, tokens, or secrets.
- Remaining blockers: none for GOAL-06. PayU, PayPal, GP WebPay, and Stripe
  webhook/provider follow-up risks remain as previously recorded under the
  owner-approved GOAL-02 bypass, outside this goal.
- Next step: return to H8 candidate application integration decisions and pick
  the next application/service to migrate into central Orders.


## 2026-07-01 Goal 7.2 Recheck Addendum

Status: Orders-auth source fix complete, Warehouse runtime-blocked, and no live order mutation performed.

Commands:

```bash
git status --short --branch
npm run verify:orders-hub-integration
node --check scripts/smoke-orders-readiness.js
cd shared && npm run build
cd services/order-service && npm run build
RUN_LIVE_ORDERS_SMOKE=1 node scripts/smoke-orders-readiness.js
```

Results:

- Source verifier: PASS. The current source sends `orders.create.v1`, keeps stable channel/idempotency fields, authenticates to Orders through `x-internal-service-token` and `x-service-name=flipflop-service`, uses canonical Catalog product ids, and requires exactly one Warehouse reservation authority id.
- Sanitized smoke runner: PASS for syntax and blocker recording. It writes only sanitized metadata to `reports/validation/orders-readiness-smoke/report-latest.json` and uses a non-mutating invalid create request to prove Orders auth reaches validation.
- Build checks: PASS for `shared` and `services/order-service`.
- Live smoke: NOT RUN. The runner exited before mutation with `liveSmokeRun=false`.
- Runtime blockers:
  - Deploy status: `./scripts/deploy.sh` built and pushed images, then timed out while replacement pods were still pulling images; recreating only the stuck replacement pods completed rollout, and all six FlipFlop deployments reached `1/1` ready/available.
  - Public post-deploy checks: `GET https://flipflop.alfares.cz/` returned HTTP 200 and `GET https://flipflop.alfares.cz/api/products?limit=1` returned HTTP 200.
  - Post-deploy readiness smoke: `RUN_LIVE_ORDERS_SMOKE=1 node scripts/smoke-orders-readiness.js` stopped before mutation; Orders create auth reached validation with HTTP 400.
  - `[MISSING: warehouseId]` because the in-pod Warehouse probe returned HTTP 401 and no `DEFAULT_WAREHOUSE_ID` is configured.
  - `[MISSING: WAREHOUSE_SERVICE_TOKEN accepted by warehouse-microservice]` because no dedicated Warehouse token is projected and the available token did not authorize `/api/warehouses`.
- Unknowns preserved:
  - `[UNKNOWN: approved Auth/Vault runtime path for a FlipFlop-to-Warehouse service principal token with the Warehouse-required role]`

Sanitized report:

- `reports/validation/orders-readiness-smoke/report-latest.json`

Intent Compliance Report:

- Vision preserved: FlipFlop remains a production storefront using shared Orders and Warehouse services, not a local-only order silo.
- Goal impact preserved: readiness is now machine-actionable without printing secrets, token values, customer data, raw ids, or order numbers.
- System boundary preserved: this lane did not edit Orders, Warehouse, Catalog, Leads, Marketing, or unrelated FlipFlop service behavior.
- Feature/task preserved: the central Orders create/idempotency/Warehouse-reservation smoke is prepared and gated; Orders auth now passes the non-mutating create-route probe, while Warehouse prerequisites block execution.
- Validation preserved: source verification and focused builds passed; live mutation is blocked until the exact `[MISSING: ...]` markers are resolved.
