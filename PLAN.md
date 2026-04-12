> AI agents may update task status in §Phase 1 only. Do not modify Phase headings or add new phases.

## Phase 1 — Checkout Revenue (Active)

**Goal:** Launch checkout → first revenue. Make all four payment providers functional end-to-end.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T0a | Fix `DESCRIPTION` hardcoding in `payments-microservice/src/payments/providers/webpay/webpay.service.ts:329` → dynamic per `applicationId` | cursor-agent | pending |
| T0b | Wire GP WebPay + Stripe into flipflop-service checkout alongside PayU/PayPal | cursor-agent | pending |
| T0c | Migrate `speakasap-portal` from Django WebPay (`orders/webpay/`) → `payments-microservice` HTTP client | claude-code | pending |
| T1  | Verify PayU end-to-end: initiate → webhook → order.status = paid | cursor-agent | pending |
| T2  | Verify PayPal end-to-end: initiate → webhook → order.status = paid | cursor-agent | pending |
| T3  | Verify GP WebPay end-to-end: redirect → PRCODE=0 callback → order.status = paid | cursor-agent | pending |
| T4  | Verify Stripe end-to-end: PaymentIntent → webhook event → order.status = paid | cursor-agent | pending |
| T5  | Stock reservation: deduct on payment success, release on failure/timeout | cursor-agent | pending |
| T6  | Order confirmation email: trigger via notifications-microservice on order paid | cursor-agent | pending |
| T7  | Payment failure UX: user-facing error message + retry path for all providers | cursor-agent | pending |
| T8  | Checkout conversion audit: measure cart abandonment rate baseline | cursor-agent | pending |

**Phase 1 completion criterion:** At least one test order completes the full payment flow for each of the four providers (PayU, PayPal, GP WebPay, Stripe) with correct order confirmation email received.

---

## Phase 2 — Content & SEO

**Goal:** AI-generated product content for all active SKUs.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T9  | Write AI product descriptions for top 50 SKUs | orchestrator-worker | backlog |
| T10 | Generate SEO meta (title/description/keywords) per product page | orchestrator-worker | backlog |
| T11 | Competitor price analysis for top 20 products | orchestrator-worker | backlog |
| T12 | Generate and publish sitemap.xml | cursor-agent | backlog |

Unblocks: Phase 1 complete.

---

## Phase 3 — Marketing Automation

**Goal:** AI-driven email campaigns and abandoned cart recovery.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T13 | Generate email campaign for seasonal sale | orchestrator-worker | backlog |
| T14 | Abandoned cart recovery email sequence | orchestrator-worker | backlog |
| T15 | Promotional discount code generation and tracking | orchestrator-worker | backlog |

Unblocks: Phase 2 complete.

---

## Phase 4 — Analytics & Reporting

**Goal:** Revenue visibility and SLA tracking.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T16 | Revenue MoM tracking dashboard | orchestrator-worker | backlog |
| T17 | Conversion rate monitoring (target > 2%) | orchestrator-worker | backlog |
| T18 | Order fulfilment SLA tracking (target < 48h) | orchestrator-worker | backlog |

Unblocks: Phase 3 complete.
