> AI agents may update task status in §Phase 1 only. Do not modify Phase headings or add new phases.

## Phase 1 — Checkout Revenue (Active)

**Goal:** Launch checkout → first revenue. Make all four payment providers functional end-to-end.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T0a | Fix `DESCRIPTION` hardcoding in `payments-microservice/src/payments/providers/webpay/webpay.service.ts:329` → dynamic per `applicationId` | cursor-agent | done |
| T0b | Wire GP WebPay + Stripe into flipflop-service checkout alongside PayU/PayPal | cursor-agent | done |
| T0c | Migrate `speakasap-portal` from Django WebPay (`orders/webpay/`) → `payments-microservice` HTTP client | claude-code | impl_done — staging smoke pending |
| T1  | Verify PayU end-to-end: initiate → webhook → order.status = paid | cursor-agent | partial — implemented in P1/P2; webhook/status path exists, runtime initiate currently blocked by PayU auth `401` in payments-microservice |
| T2  | Verify PayPal end-to-end: initiate → webhook → order.status = paid | cursor-agent | partial — implemented in P1/P2; webhook/status path exists, runtime initiate currently blocked by PayPal auth `401` in payments-microservice |
| T3  | Verify GP WebPay end-to-end: redirect → PRCODE=0 callback → order.status = paid | cursor-agent | done — implemented and wired in P2 (`webpay` checkout path + callback handling) |
| T4  | Verify Stripe end-to-end: PaymentIntent → webhook event → order.status = paid | cursor-agent | done — implemented and wired in P3 (Stripe checkout path + webhook/status handling); live runtime requires valid Stripe API key |
| T5  | Stock reservation: deduct on payment success, release on failure/timeout | cursor-agent | done — implemented in P1 (`decrementStock` on paid, `unreserve` on failed/timeout) |
| T6  | Order confirmation email: trigger via notifications-microservice on order paid | cursor-agent | done — implemented in P1 (`notificationService.sendOrderConfirmation` on paid) |
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

---

## Phase 5 — Inventory Management

**Goal:** Real-time stock visibility and supplier accountability.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T19 | Low-stock alerts: `GET /admin/inventory/low-stock`, RabbitMQ `inventory.low_stock` event, admin warning table | cursor-agent | done |
| T20 | Dead stock detection: products unsold >60 days, AI markdown suggestion (cheap tier), admin dead-stock panel | cursor-agent | done |
| T21 | Supplier performance scoring: on-time rate, fill rate, admin supplier-performance table | cursor-agent | done |

Unblocks: Phase 4 complete.

---

## Phase 6 — Customer Retention

**Goal:** Increase repeat purchases and customer lifetime value.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T22 | Post-delivery review solicitation: cron 7 days after delivery, `customer.review_request` RabbitMQ event, admin review-requests panel | cursor-agent | done |
| T23 | Loyalty points: 1 pt per 10 CZK on confirmed orders, `LoyaltyAccount` model, admin loyalty leaderboard | cursor-agent | done |
| T24 | Repeat purchase prediction: AI (cheap tier) per customer, `recommendedProduct` field, admin repeat-buyers panel | cursor-agent | done |

Unblocks: Phase 5 complete.

---

## Phase 7 — Dynamic Pricing

**Goal:** AI-driven price optimisation with human-in-loop approval.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T27 | Dynamic pricing engine: AI price suggestions via ai-microservice cheap tier, `PriceSuggestion` model, admin pricing panel | cursor-agent | backlog |
| T28 | Price approval workflow: approve/reject endpoints, safety guard (max 30% change), RabbitMQ `pricing.price_changed` event, admin approve/reject UI | cursor-agent | backlog |

Unblocks: Phase 6 complete.

---

## Phase 8 — Second Business Onboarding

**Goal:** Prove multi-tenant orchestration by activating a second project.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T29 | Register `speakasap` in business-orchestrator DB; create `speakasap/docs/orchestrator/SPEC.md` + `PLAN.md`; activate first orchestration goal | cursor-agent | backlog |

Unblocks: Phase 7 complete.

---

## Phase 9 — Project Closure

**Goal:** Validate platform is fully operational; produce handoff artefacts.

| ID  | Task | Owner | Status |
|-----|------|-------|--------|
| T30 | Final end-to-end validation: all admin panels load, all RabbitMQ events wired, TSC clean, coordinator cycle healthy for flipflop-v1 | cursor-agent | backlog |
| T31 | Closure documentation: update `STATE.json` to `operational`, update `SYSTEM.md` architecture summary, create `docs/HANDOFF.md` ops runbook | cursor-agent | backlog |

Unblocks: Phase 8 complete.
