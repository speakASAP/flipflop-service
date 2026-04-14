# GOALS.md — flipflop-service

> ⚠️ IMMUTABLE BY AI. This file is the human-readable goal narrative. AI agents must not modify it. The database is the system of truth for active goals.

---

## Active Goal

**Title:** Launch checkout → first revenue

**Priority:** 1 (high)

**Description:**
Make checkout end-to-end functional with all four payment providers: PayU, PayPal, GP WebPay (Czech bank cards via GP bank RSA-SHA1), and Stripe (international cards).

Specific work required:

- Fix `DESCRIPTION: 'SPEAKASAP'` hardcoding in `payments-microservice/src/payments/providers/webpay/webpay.service.ts:329` → derive dynamically from `applicationId`
- Wire GP WebPay and Stripe into `flipflop-service` checkout flow alongside the existing PayU/PayPal routes
- Migrate `speakasap-portal` from its own Django WebPay implementation (`orders/webpay/`) to call `payments-microservice` HTTP client — the Django code must remain live until migration is verified end-to-end
- Verify all four providers end-to-end: payment initiation → webhook confirmation → order status = paid
- Stock deduction on payment success, release on failure or cancellation
- Order confirmation email via notifications-microservice on successful payment

**Success criteria:** At least one real test order completing the full payment flow for each provider (PayU, PayPal, GP WebPay, Stripe), with correct order status, stock update, and confirmation email.

**Constraints:**

- Free models only — no premium LLM usage without explicit human approval
- No pricing changes without human validation
- No order cancellation without human approval
- `speakasap-portal` Django WebPay code (`orders/webpay/`) must remain live until `payments-microservice` integration is verified end-to-end; only then deprecate
- `DESCRIPTION` field in `webpay.service.ts` must be derived from `applicationId` — never hardcoded
- Max 500k LLM units/month across all agents

**References:**

- Spec: `flipflop-service/SPEC.md` — Module 3 (Checkout & Payments ★)
- Plan: `flipflop-service/PLAN.md` — Phase 1, tasks T0a through T8

---

## Backlog Goals (future phases)

These goals are not active. They will be activated sequentially after Phase 1 completes.

### Phase 2 — Content & SEO

AI-generated product descriptions for top 50 SKUs. Meta title/description per product. Competitor pricing analysis for top 20 products. Sitemap generation.

### Phase 3 — Marketing Automation

Email campaign generation. Abandoned cart recovery sequences. Seasonal promotions.

### Phase 4 — Analytics & Reporting

Revenue month-over-month tracking. Conversion rate dashboard. Order fulfilment SLA tracking (target: < 48h).

### Phase 5 — Inventory Management

Real-time low-stock alerts, dead stock detection with AI markdown suggestions, and supplier performance scoring. All surfaced in the admin Inventory panel.

### Phase 6 — Customer Retention

Post-delivery review solicitation (7-day cron), loyalty points system (1 pt / 10 CZK), and AI-driven repeat purchase predictions. Admin retention panel.

### Phase 7 — Dynamic Pricing

AI-generated price suggestions (cheap tier via ai-microservice). Human-in-loop approval flow before any price change is applied. Max 30% change guard. Admin pricing panel.

### Phase 8 — Second Business Onboarding

Register `speakasap` as second orchestrated project in business-orchestrator. Activate first orchestration goal to prove multi-tenant coordinator isolation.

### Phase 9 — Project Closure

Final end-to-end validation, operational STATE.json, SYSTEM.md update, and HANDOFF.md ops runbook. Marks the flipflop automation programme as complete.
