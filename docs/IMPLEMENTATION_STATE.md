# Implementation State

## Current Status

**Date:** 2026-06-29
**Mode:** Goal-driven orchestration enabled
**Active goal:** GOAL-09-smarty-checkout-reference-ux
**Goal status:** implemented, deployed, and production-smoked
**Current checkpoint:** GOAL-09 guest checkout, Smarty.cz reference documentation, optional account creation, delivery/payment/summary/upsell UI, bank-transfer QR behavior, guest-order route registration, server-side guest fee hardening, Vault-backed production bank-transfer secret wiring, owner-approved synthetic production guest order, and checkout-login return-loop prevention are implemented, deployed, and verified.


## 2026-06-29 - Checkout Login Return Loop Fix

Owner reported that clicking `Přihlaste se` from checkout delivery-details step returned them to the previous `Doprava a platba` step and could create a login loop for customers who thought they already had an account.

Implemented source changes:

- Checkout account prompt now redirects login/register to `/checkout?step=details` instead of bare `/checkout`.
- Checkout restores the delivery-details step from `step=details` after Auth callback return.
- Checkout account prompt now explicitly offers guest continuation, registration, and access recovery without leaving the current checkout step.
- FlipFlop login landing now shows both registration and `Obnovit přístup` links preserving the same checkout return target.
- Hosted Auth helper now builds shared password-reset URLs with `client_id=flipflop` and `return_url=https://flipflop.alfares.cz/auth/callback?next=/checkout?step=details`.
- Guest checkout verifier now asserts this redirect-step preservation contract.

Validation passed:

- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `git diff --check`
- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `./scripts/deploy.sh` completed successfully; all FlipFlop deployments rolled out and deploy HTTP checks passed.
- In-app Browser production QA: `/checkout?step=details` rendered `Kontaktní údaje`, login/register/reset links preserved `/checkout?step=details`, local `/login?redirect=%2Fcheckout%3Fstep%3Ddetails` showed registration and recovery options, and hosted Auth redirected to `auth.alfares.cz/login` with `client_id=flipflop`, generated `state`, and return URL `https://flipflop.alfares.cz/auth/callback?next=%2Fcheckout%3Fstep%3Ddetails`. Browser console warnings/errors were empty for the verified pages.

Intent compliance:

- Preserves guest checkout and optional account creation; no order, payment, price, stock, password, token, OAuth, database schema, or production user-data behavior was changed.
- Auth remains delegated to the shared hosted Auth surface.

## Current Intent Summary

Make FlipFlop production-ready and revenue-capable by serving the storefront, restoring coherent service routing, showing sellable products, supporting authenticated shopping, and completing checkout through PayU, PayPal, GP WebPay, and Stripe.

## Repository Notes

The remote repository had unrelated dirty files before this orchestration setup started:

```text
package.json
services/order-service/src/orders/orders.controller.ts
services/order-service/src/orders/orders.module.ts
shared/resilience/circuit-breaker.service.ts
scripts/smoke-checkout.js
services/order-service/src/orders/gateway-user.guard.ts
```

Orchestrator agents must not overwrite or revert those changes unless the owner explicitly asks.

## Completed In This Setup

- Started `GOAL-09-smarty-checkout-reference-ux` as a planning-only goal after
  owner correction that checkout must support purchase without mandatory
  registration and optional account creation by post-order magic link.
- Added Smarty.cz checkout reference documentation under
  `docs/reference/smarty-checkout/README.md`, tied to 13 reference screenshots
  in `docs/reference/smarty-checkout/screenshots/`.
- Added GOAL-09 planning artifacts:
  `implementation-goals/GOAL-09-smarty-checkout-reference-ux.md`,
  `.execution-plan.md`, `.context-package.md`, `.coding-prompt.md`, and
  `.validation-report.md`.
- Added IPS traceability artifacts for TASK-002 guest checkout:
  `11_tasks/TASK-002-smarty-checkout-reference-ux.md`,
  `22_goal_impact/GOAL-IMPACT-TASK-002-smarty-checkout-reference-ux.md`,
  `21_execution_plans/EP-TASK-002-smarty-checkout-reference-ux.md`,
  `13_context_packages/CP-TASK-002-smarty-checkout-reference-ux.md`,
  `14_prompts/PROMPT-TASK-002-smarty-checkout-reference-ux.md`, and
  `12_validation/VAL-TASK-002-smarty-checkout-reference-ux.md`.
- Added canonical Intent Preservation System baseline: constitution, vision, business case, domain model, system/subsystem, architecture, ADR, roadmap, milestone, feature, task, goal-impact record, execution plan, context package, coding prompt, validation report, audit checklist, project graph, and local gate scripts.
- Updated FlipFlop orchestrator and process docs so future coding must pass IPS pre-coding and strict documentation gates before code edits, and deployment-readiness before release closure.
- Validated IPS baseline locally: `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100, `python3 scripts/pre_coding_gate.py --root .` passed, `python3 scripts/deployment_readiness_gate.py --root .` passed, and `./scripts/next_goal.sh` preserved the no-active-goal/payment-follow-up state.
- Validated IPS baseline on remote `alfares:/home/ssf/Documents/Github/flipflop-service`: strict documentation audit passed 100/100, pre-coding gate passed with `reports/validation/ips-pre-coding-gate.json`, and deployment-readiness gate passed with `reports/validation/ips-deployment-readiness-gate.json`.
- Added standalone intent memory.
- Added Goalkeeper-style implementation orchestrator instructions.
- Added process gates and gap-filling rules.
- Added ordered implementation-goals backlog.
- Added active production-readiness goal artifacts.
- Updated root agent instructions to use the goal workflow.
- Validated live homepage, API routing, product API, Kubernetes services,
  authenticated cart add, and checkout initiation.
- Closed `GOAL-01-production-readiness` with accepted validation evidence.
- Created GOAL-02 execution plan, context package, coding prompt, and validation
  report.
- Checked production payment-provider readiness without exposing secret values.
- Fixed stale payment payload reuse in `shared/payments/payment.service.ts` by
  using request-scoped circuit breaker names for payment create/status/refund.
- Deployed FlipFlop and validated Stripe initiation now returns a Stripe
  Checkout URL for a Stripe order.
- Recorded owner-approved bypass for remaining GOAL-02 payment provider
  credential/webhook completion.
- Closed `GOAL-03-catalog-stock-storefront` after validating live catalog,
  category, product detail, warehouse-backed cart stock checks, and operational
  empty-catalog alert logging.
- Deployed product-service/frontend updates for category display names,
  catalog unavailable empty state, and explicit product-service
  `OPERATIONAL_ALERT` warnings.
- Started `GOAL-04-agent-content-seo`.
- Deployed catalog SEO pass-through from product-service to frontend metadata.
- Added an approval-first SEO draft generator that writes only
  `seoData.aiDraft.reviewStatus = "draft"` and refuses to generate or store
  fake AI content when `AI_SERVICE_TOKEN` is absent.
- Connected `AI_SERVICE_TOKEN` through Vault and ExternalSecrets without
  printing the secret value.
- Generated AI SEO drafts for the first three priority catalog products and
  verified each remains `reviewStatus: "draft"`.
- Tightened the draft generator to reject generated price, stock, delivery,
  warranty, safety, compliance, and discount claims.
- Closed `GOAL-04-agent-content-seo` with SEO pass-through, draft review state,
  and no-draft-publication evidence.
- Closed `GOAL-05-operational-closure` after validating homepage, product API,
  checkout smoke, cart stock enforcement, AI draft non-publication, monitoring,
  operational alert logging, and workload health.
- Added final operational runbook and handoff notes.
- Updated machine-readable `STATE.json` to show no active implementation goal
  and preserve the owner-bypassed payment provider risk.
- Started `GOAL-06-orders-hub-integration` after owner approval naming
  FlipFlop as the specific application for central Orders. Scope is the
  FlipFlop server-side `order-service` forwarding path, not provider
  credentials, provider webhook verification, price mutation, refund,
  cancellation, warehouse ownership, or catalog ownership.
- Implemented GOAL-06 server-side central Orders forwarding hardening:
  `shared/clients/order-client.service.ts` now uses `ORDERS_SERVICE_URL`
  for central Orders with compatibility for existing `ORDERS_MICROSERVICE_URL`,
  sends `orders.create.v1`, and maps central Orders HTTP 409 to
  `ORDER_IDEMPOTENCY_CONFLICT`. `order-service` now builds a bounded
  FlipFlop payload with stable `channel=flipflop`,
  `channelAccountId`, `externalOrderId=order.orderNumber`, nested totals,
  payment, shipping, and bounded customer/address fields, and records
  accepted/conflict/failed central forwarding status in local order metadata.
- Added explicit `ORDERS_SERVICE_URL=http://orders-microservice:3203` to
  `k8s/configmap.yaml` while preserving the existing `ORDERS_MICROSERVICE_URL`
  alias.
- Added `scripts/verify-orders-hub-integration.js` and
  `npm run verify:orders-hub-integration`.
- Deployed GOAL-06 after owner approval with `./scripts/deploy.sh`.
  Build and image push completed for all FlipFlop workloads. The initial
  rollout wait timed out while replacement pods were still pulling images from
  the local registry, but the current replacements later completed
  successfully and all six deployments reached ready state:
  `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`,
  `flipflop-cart-service`, `flipflop-order-service`, and
  `flipflop-user-service` are each 1/1 ready.
- Confirmed deployed order-service runtime wiring:
  `ORDERS_SERVICE_URL=http://orders-microservice:3203`,
  `ORDERS_MICROSERVICE_URL=http://orders-microservice:3203`, and
  local `ORDER_SERVICE_URL=http://flipflop-order-service:3003`.
- Validated post-deploy public homepage and product API. Re-ran
  `npm run verify:orders-hub-integration` successfully after deployment.
- Captured operational residuals after deployment: service health endpoints
  returned HTTP 200 with body status `degraded` due a logging dependency
  error while `logging-microservice` itself reported healthy.
- Fixed deployed runtime authorization for FlipFlop-to-Orders forwarding by
  storing an Orders-runtime-signed `ORDERS_SERVICE_TOKEN` in the FlipFlop
  Vault path, forcing ExternalSecret refresh, verifying the Kubernetes Secret
  against the central Orders runtime signing key without printing secret
  values, and restarting only `flipflop-order-service`.
- Proved central Orders auth from inside the deployed FlipFlop order-service
  pod: non-mutating `GET /api/orders?channel=flipflop` returned HTTP 200.
- Added GOAL-08 Leads lifecycle replay consumer source/config path for owner-selected Leads Goal 24 first consumer. `LeadsClientService` calls the guarded one-lead replay route as `flipflop-service`, clamps limit to 30, sends only internal service identity headers from env, and is statically verified by `npm run verify:leads-lifecycle-replay`. Not deployed.
- Proved live checkout and central Orders forwarding after deployment:
  `node scripts/smoke-checkout.js` created FlipFlop order
  `ORD-1781378332000-840` with pending Stripe payment and redirect URL; the
  local order metadata recorded `centralOrdersForwarding.status=accepted`
  and `centralOrderId=ae51a415-ded0-4bf9-ac4e-c9adcab97d80`; central
  Orders logged `operation=order.create`, `channel=flipflop`,
  `outcome=success`.
- Evaluated Leads Goal 26 cross-repo product-app adoption for FlipFlop after owner selection of FlipFlop as the Leads consumer. Reviewed Leads Goal 26 and product-app intake contract artifacts, searched FlipFlop editable source for existing lead/contact/newsletter/waitlist/inquiry submission paths, and recorded GOAL-07 as blocked because no existing path exists to adapt safely. No production lead submission, runtime code change, schema change, secret change, deployment, raw contact export, campaign execution, or AI/CRM export was performed.

## 2026-06-26 - Catalog Goal 17 Canonical Orders Product IDs

Catalog Goal 17 / FlipFlop channel workstream completed source validation without deployment.

- Updated central Orders forwarding in `services/order-service/src/orders/orders.service.ts` so central payload item `productId` is the canonical `Product.catalogProductId`, not the local FlipFlop product ID.
- Added explicit `[MISSING: catalogProductId]` blocking when an order item cannot be mapped to a Catalog product ID before forwarding.
- Preserved local `OrderItem.productId` as the FlipFlop local FK by stripping `catalogProductId` before Prisma order-item persistence.
- Updated `scripts/verify-orders-hub-integration.js` to assert canonical Catalog product ID forwarding and missing-ID blocking.
- Validation passed: `python3 scripts/pre_coding_gate.py --root .`, `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`, `npm run verify:orders-hub-integration`, `git diff --check`, and `cd services/order-service && npm run build`.
- Deployment was intentionally not run.

## Next Step

Active implementation goal: `GOAL-09-smarty-checkout-reference-ux`.

Owner bypass decision remains in force:

The owner deferred the remaining GOAL-02 payment provider setup and webhook
validation until after the whole project is implemented. PayU, PayPal, GP
WebPay, and Stripe webhook completion remain manual follow-up work and must not
be marked verified automatically.

Next implementation step: before code edits, classify the existing dirty guest-cart/checkout changes, inspect the auth-microservice magic-link or passwordless account contract, and choose the backend guest-order contract documented in `implementation-goals/GOAL-09-smarty-checkout-reference-ux.execution-plan.md`.

## Goal Register

| Goal | Status | Next action |
| --- | --- | --- |
| `GOAL-01-production-readiness` | done | closed with live validation evidence |
| `GOAL-02-checkout-payments` | blocked with owner-approved bypass | owner will finish provider credentials/webhooks manually after project implementation |
| `GOAL-03-catalog-stock-storefront` | done | closed with live catalog, storefront, stock, deploy, and alert evidence |
| `GOAL-04-agent-content-seo` | done | closed with draft AI content, review status, SEO metadata, and no-publish validation |
| `GOAL-05-operational-closure` | done | closed with final validation docs, monitoring notes, runbook, and handoff |
| `GOAL-06-orders-hub-integration` | done | closed with deployed live checkout and central Orders forwarding evidence |
| `GOAL-08-leads-lifecycle-replay-consumer` | done for source/config verification; not deployed | deploy only after integration-owner approval and Leads internal trust/token provisioning |
| `GOAL-07-leads-public-intake-adoption` | deployed | production smoke passed after owner approval |
| `GOAL-09-smarty-checkout-reference-ux` | done | closed with Smarty.cz reference docs, deployed guest checkout, Vault-backed bank-transfer QR, and approved synthetic production guest-order smoke |

## Owner Manual Follow-Up

- PayU production credentials are missing in the running payments pod.
- PayPal production credentials are missing in the running payments pod.
- GP WebPay production merchant/key/application/description config checked in
  the running payments pod is missing.
- Stripe webhook verification is blocked until `STRIPE_WEBHOOK_SECRET` or an
  approved verified callback path is configured.


## 2026-06-21 - Owner-Approved GOAL-07 Source Implementation

Owner approval reopened the previously blocked `GOAL-07-leads-public-intake-adoption` lane for a new FlipFlop public contact surface with visible consent copy.

Implemented source/config:

- Added public gateway route `POST /api/leads/contact` in `services/api-gateway/src/gateway/gateway.controller.ts`.
- Added bounded gateway DTO `services/api-gateway/src/gateway/dto/create-lead-contact.dto.ts`.
- Added server-side Leads public intake proxy in `services/api-gateway/src/gateway/gateway.service.ts` using `LEADS_PUBLIC_URL` and the Leads product-app contract.
- Added homepage lead-contact form `services/frontend/components/LeadContactForm.tsx` and frontend wrapper `services/frontend/lib/api/leads.ts`.
- Added `LEADS_PUBLIC_URL: "https://leads.alfares.cz"` to `k8s/configmap.yaml`.
- Added `scripts/verify-leads-public-intake.js` and `npm run verify:leads-public-intake` for synthetic/static validation.

Contract and privacy posture:

- Leads payload uses `sourceService: "flipflop"`, `sourceLabel: "support-contact"`, one `email` contact method, `preferredChannel: "email"`, consent source `flipflop-home-contact:v1`, ISO `consentCapturedAt`, and bounded metadata keys `intent`, `surface`, and `locale`.
- Browser code calls only FlipFlop `/api/leads/contact`; it does not use internal Kubernetes URLs or internal service tokens.
- No raw contact export, campaign execution, production lead submission, payment/order/price mutation, schema migration, or deployment was performed during source validation.

Validation passed:

- `npm run verify:leads-public-intake`
- `git diff --check`
- `cd services/api-gateway && npm run build`
- `cd services/frontend && npm run build`

Current checkpoint: GOAL-07 is deployed and production smoke passed. GOAL-02 payment-provider credentials/webhook follow-up remains pending separate readiness evidence.

## 2026-06-21 - GOAL-07 Production Deployment And Smoke

Owner approved production deployment and smoke for the completed GOAL-07 source.

Deployment command:

```bash
./scripts/deploy.sh
```

Deployment result:

- Deployment completed successfully in 517.80s.
- Built and pushed images for `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, and `flipflop-user-service`.
- Applied Kubernetes manifests; `flipflop-config` was updated with `LEADS_PUBLIC_URL`.
- Rollout completed for all six FlipFlop deployments.
- Deploy-script post checks for `/` and `/api/products?limit=1` passed.

Production smoke:

- `GET https://flipflop.alfares.cz/` returned HTTP 200.
- `GET https://flipflop.alfares.cz/api/products?limit=1` returned HTTP 200.
- `POST https://flipflop.alfares.cz/api/leads/contact` with one synthetic contact payload returned HTTP 200, `success: true`, Leads status `new`, `confirmationSent: true`, and a lead id was present.

Safety notes:

- The production lead smoke used a synthetic `example.invalid` contact and no raw contact value is recorded in this state file.
- No payment provider, order total, price, cancellation, database migration, object storage, campaign execution, AI/CRM export, or manual secret change was performed.
- Residual GOAL-02 payment-provider credential/webhook risk remains preserved.


## 2026-06-26 - GOAL-09 Bank-Transfer Vault Wiring

Owner confirmed that reusable bank-transfer account and IBAN values exist in the Alfares Kubernetes/Vault estate and approved using them for FlipFlop.

Implemented source/config:

- Added `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` to `k8s/external-secret.yaml`.
- Mapped both values from the existing Vault-backed `secret/prod/school-committee/payments` source used for QR payment generation elsewhere.
- Removed blank `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` entries from `k8s/configmap.yaml` so the ConfigMap cannot shadow Secret-provided runtime values.
- Hardened `scripts/verify-guest-checkout-ui.js` to assert the ExternalSecret mapping and blank-shadow prevention.

Validation and deployment:

- `git diff --check` passed.
- `npm run verify:guest-checkout-ui` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed.
- `./scripts/deploy.sh` completed successfully after applying ConfigMap and ExternalSecret updates.
- Kubernetes `ExternalSecret flipflop-service-secret` reported `Ready=True`.
- The generated Kubernetes Secret contains both bank-transfer keys, verified only by key presence and encoded length.
- The running `flipflop-order-service` process sees both env vars as present; values were not printed.

Remaining GOAL-09 completion gate:

- Run one owner-approved synthetic production guest-order submit smoke to prove order creation, redirect/payment-result behavior, and optional account intent end to end.

## 2026-06-26 - GOAL-09 Approved Production Guest-Order Smoke

Owner approved one synthetic production guest-order submit to close the final GOAL-09 completion gate.

Smoke result:

- Created order `ORD-1782491906806-976` through public `POST /api/orders/guest`.
- Used dedicated synthetic production SKU `CODEX-STOCK-TRACE-011`.
- Used guest checkout with `wantsAccount=true`.
- Used `paymentMethod=invoice`, which is the bank-transfer / zálohová faktura path.
- Response redirect pointed to `/payment-result`.
- Redirect contained non-empty bank account number, IBAN, variable symbol, and amount parameters; values were redacted.
- `/payment-result` returned HTTP 200.
- Database metadata confirmed `checkoutMode=guest`, `wantsAccount=true`, `accountActivation=magic-link-sent`, and central Orders forwarding `accepted`.
- Machine-readable evidence was saved to `reports/validation/guest-checkout-smoke/report-production-guest-order-smoke.json`.

GOAL-09 completion gates are closed.

## 2026-06-26 - GOAL-09 Guest Checkout And Smarty.cz Reference Flow

Owner requested removal of mandatory login/registration from checkout and asked to model the Czech checkout flow after Smarty.cz screenshots.

Current active goal: `GOAL-09-guest-checkout-smarty-flow`.

Reference evidence added:

- `docs/reference/smarty-checkout/USER_FLOW.md`
- `docs/reference/smarty-checkout/screenshots/01-add-to-cart-accessory-upsell-top.png` through `13-completion-payment-instructions-detail.png`

Subagent findings preserved:

- UX/reference explorer documented all 13 screenshots and extracted required checkout states.
- Code explorer found forced `/checkout` login redirect, authenticated-only `/api/orders*`, likely stale frontend payment initiation, and address route mismatch.

Execution decision:

- Implement guest-first checkout without marking payment as paid.
- Backend must recalculate prices and totals from product/order data.
- Guest order uses internal technical customer identity while real contact email is stored in order metadata and used for payment/notification where applicable.
- Optional registration remains a visible checkbox; purchase must not depend on registration.

Validation checkpoint before code edits:

- `python3 scripts/pre_coding_gate.py --root .` passed.
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` passed 100/100.

## 2026-06-26 - GOAL-09 Guest Checkout Implementation And Deployment Checkpoint

Implemented checkout changes:

- `/checkout` no longer requires an authenticated session before purchase.
- Guest cart data from browser storage can proceed through delivery, expedition, payment, delivery details, and order submission.
- Delivery/payment flow mirrors the owner-provided Smarty.cz reference structure: delivery method selection, expedition block, payment block, optional different delivery day, operator-tip upsell, sticky order summary, and final delivery data form.
- Optional registration is handled as a low-friction checkbox (`Chci vytvořit účet`); when selected, password fields appear, but purchase remains guest-first.
- Bank-transfer completion page includes variable-symbol/amount layout and an explicit QR placeholder.

Validation passed:

- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `git diff --check`
- `cd services/order-service && npm run build`
- `cd services/api-gateway && npm run build`
- `cd services/frontend && npm run build`

Deployment and smoke checkpoint:

- `./scripts/deploy.sh` rebuilt and applied all FlipFlop services, then timed out while waiting for rollout status.
- Direct follow-up rollout checks completed successfully for `flipflop-frontend`, `flipflop-order-service`, and `flipflop-service`.
- Kubernetes deployment readiness showed all six FlipFlop deployments at `1/1` ready/available/updated.
- `GET https://flipflop.alfares.cz/cart` returned HTTP 200.
- `GET https://flipflop.alfares.cz/checkout` returned HTTP 200.

Remaining explicit contract gap:

- `[MISSING: production bank account]` is required before generating a real bank-transfer QR code. The implementation intentionally does not hardcode dummy bank details or call a third-party QR generator with unverified payment data.

## 2026-06-26 - GOAL-09 Continuation Browser Smoke And Optional Account Correction

Additional checkout correction:

- Removed checkout password and password-confirmation fields from optional account creation.
- Removed pre-order `authApi.register` call from checkout; registration no longer blocks purchase.
- Added `wantsAccount` to the frontend guest-order payload and backend guest-order DTO.
- Guest order metadata now records `wantsAccount` and `accountActivation` (`magic-link-required` when selected) without pretending that a passwordless account API already exists.
- Added `status=created` handling on `/payment-result` so a missing redirect does not render a false failure page.

Non-mutating browser smoke evidence:

- Live browser flow used `https://flipflop.alfares.cz` with a synthetic 1 Kč product seeded into guest localStorage.
- Verified `/checkout` does not redirect to login.
- Verified delivery/payment step, different-day delivery control, operator-tip control, details form, optional account checkbox, and enabled final submit button.
- Final submit was intentionally not clicked because it would create a production order and forward to downstream order systems.
- Evidence files: `reports/validation/guest-checkout-smoke/report.json`, `01-delivery-payment.png`, `02-delivery-details-filled-guest.png`.

Remaining explicit gaps:

- `[MISSING: auth-microservice magic-link or passwordless account API]` prevents real post-order account activation.
- `[MISSING: production bank account]` prevents real bank-transfer QR generation.
- Owner-approved production guest order-submit smoke is still required before claiming end-to-end purchase completion.

Post-deploy continuation evidence:

- `./scripts/deploy.sh` completed successfully in 172.53s after rebuilding and rolling out all six FlipFlop services.
- Post-deploy browser smoke passed against `https://flipflop.alfares.cz`.
- Verified optional account checkbox is passwordless in checkout: no `input[type=password]` fields were present after checking `Chci vytvořit účet`.
- Evidence files: `reports/validation/guest-checkout-smoke/report-post-deploy.json`, `03-post-deploy-delivery-payment.png`, `04-post-deploy-details-passwordless.png`.

## 2026-06-26 - GOAL-09 Bank Transfer QR Contract And Smoke

Implemented QR payment behavior:

- Added frontend dependency `qrcode` for local client-side QR SVG generation on `/payment-result`.
- Added `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` runtime contract in `.env.example` and `k8s/configmap.yaml`.
- Order-service bank-transfer redirect now includes `bankAccountNumber` and `bankAccountIban` query parameters only when runtime env values are configured.
- Payment-result keeps explicit `[MISSING: production bank account]` and `[MISSING: production IBAN]` states when payment recipient config is absent.
- Payment-result renders a Czech QR Platba payload (`SPD*1.0*ACC:*AM:*CC:CZK*X-VS:*MSG:*`) when an IBAN, amount, and variable symbol are present.

Validation passed:

- `git diff --check`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`
- `node` QR package sanity check generated SVG output.

Deployment and live QR smoke:

- `./scripts/deploy.sh` completed successfully in 190.25s after applying ConfigMap updates and rolling out all six FlipFlop services.
- Live browser smoke verified missing-IBAN placeholder on bank-transfer completion URL.
- Live browser smoke verified a bank-transfer completion URL with a sample IBAN renders one local SVG QR element and no console/page errors.
- Evidence files: `reports/validation/guest-checkout-smoke/report-payment-qr.json`, `05-bank-transfer-missing-iban.png`, `06-bank-transfer-rendered-qr.png`.

Remaining explicit gaps:

- `[MISSING: production bank account]` and `[MISSING: production IBAN]` are still unset in production config; QR generation is implemented and verified with a sample IBAN but production payment recipient data must be supplied before live customers see a real QR.
- Owner-approved production guest order-submit smoke remains required before claiming a fully completed end-to-end purchase.

## 2026-06-26 - GOAL-09 Repeatable Non-Mutating Verifier

Added repeatable validation command:

```bash
npm run verify:guest-checkout-ui
```

Verifier scope:

- Checks checkout source contract for guest cart loading, no hard login redirect, no checkout password fields, no pre-order `authApi.register`, optional `wantsAccount`, Czech delivery/payment/expedition sections, different-day delivery, operator-tip upsell, and order summary.
- Checks frontend/backend guest-order contracts for `wantsAccount`, gateway `POST /api/orders/guest`, server-side product validation, and account activation metadata.
- Checks bank-transfer QR contract for local `qrcode` dependency, QR Platba payload fields, missing-production-IBAN state, and bank-transfer env contract.
- Checks required browser smoke evidence files under `reports/validation/guest-checkout-smoke/`.
- Checks saved post-deploy smoke reports for no login redirect, no checkout password inputs, non-mutating final-submit behavior, missing-IBAN placeholder, and QR SVG rendering.
- Checks live `/cart`, `/checkout`, `/payment-result?status=bank-transfer...`, and `/api/products?limit=1` endpoints return successful responses.

Validation result:

- `npm run verify:guest-checkout-ui` passed with `nonMutating: true`.

Remaining explicit gaps:

- Production `BANK_TRANSFER_ACCOUNT_NUMBER` and `BANK_TRANSFER_ACCOUNT_IBAN` are still required for customer-visible QR payment.
- Owner-approved real guest-order submit smoke remains required for end-to-end order creation evidence.

## 2026-06-26 - GOAL-09 Verifier Hardening And Checkout Fixes

Additional fixes from subagent audit:

- Fixed checkout marketing-consent checkbox to update the quoted `marketingConsent` form key and initialize it to `false`.
- Fixed untracked `/auth/callback` page syntax and wrapped `useSearchParams` in `Suspense` for Next.js build compatibility.
- Fixed shared auth magic-link helper syntax and exported `LeadsClientService` from shared index so order-service can compile with checkout follow-up integrations.
- Removed accidental order-service package-lock churn from validation side effects.
- Hardened `npm run verify:guest-checkout-ui` to catch the marketing-consent regression and current magic-link metadata states.

Validation passed after fixes:

- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `git diff --check`
- `python3 scripts/pre_coding_gate.py --root .`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`
- `python3 scripts/deployment_readiness_gate.py --root .`

## 2026-06-26 - GOAL-09 Guest Order Route And Fee Integrity Hardening

Subagent completion audit found two non-mutating gaps:

- Live `POST /api/orders/guest` returned 404 because `GuestOrdersController` was exported but not registered in `OrdersModule`.
- Guest checkout totals accepted client-provided `shippingCost`, and frontend sent `operatorTip` both as `operatorTip` and inside `shippingCost`.

Fixes:

- Registered `GuestOrdersController` in `services/order-service/src/orders/orders.module.ts`.
- Hardened `scripts/verify-guest-checkout-ui.js` to send a non-mutating invalid `POST /api/orders/guest` and fail if the route returns 404.
- Moved guest delivery fee, payment method allowlist, and operator-tip allowlist into order-service server-side helpers.
- Removed browser-computed `shippingCost` from the frontend guest order payload.
- Hardened the verifier to assert no browser-computed `shippingCost` and server-side delivery/payment/tip calculation helpers.

Validation passed:

- `git diff --check`
- `npm run verify:guest-checkout-ui`
- `cd services/frontend && npm run build`
- `cd services/order-service && npm run build`
- `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`

Deployment and live evidence:

- `./scripts/deploy.sh` completed successfully after rebuilding and rolling out all six FlipFlop services.
- All six deployments reached `1/1`: `flipflop-service`, `flipflop-frontend`, `flipflop-product-service`, `flipflop-cart-service`, `flipflop-order-service`, `flipflop-user-service`.
- Public endpoints returned `HTTP/2 200`: `/cart`, `/checkout`, and `/payment-result` with sample bank-transfer QR parameters.
- Non-mutating invalid guest order probe returned HTTP 400, proving the live guest order route is mounted and validation rejects empty payloads before order creation.

Remaining explicit gates:

- `[MISSING: production bank account]` and `[MISSING: production IBAN]` still need owner-provided runtime values.
- Owner-approved real production guest-order submit smoke remains required before claiming full end-to-end purchase completion.
