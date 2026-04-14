# System: flipflop-service

## Architecture

NestJS + PostgreSQL + Redis + Next.js frontend. Blue/green deployment.

- Backend: product, cart, order, user, payment modules
- Frontend: Next.js SSR + Tailwind
- AI: product descriptions, SEO via ai-microservice

## Integrations

| Service | Usage |
|---------|-------|
| auth-microservice:3370 | User auth |
| database-server:5432 | PostgreSQL |
| logging-microservice:3367 | Logs |
| notifications-microservice:3368 | Order emails |
| payments-microservice:3468 | PayU, PayPal |
| catalog-microservice:3200 | Product data |
| warehouse-microservice:3201 | Stock |
| orders-microservice:3203 | Order processing |
| ai-microservice:3380 | Product AI tasks |

## Current State
<!-- AI-maintained -->
Stage: active

## Known Issues
<!-- AI-maintained -->
- None

## Programme Status (as of 2026-04-14)

All automation phases complete. The platform is managed by `business-orchestrator` (project slug `flipflop-v1`). The orchestrator runs coordinator cycles every 5 minutes; tasks are spawned, executed by worker agents, and validated before being marked done.

### Completed phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Checkout & Payments (PayU, PayPal, GP WebPay, Stripe) | ✅ |
| 2 | AI Content & SEO (product descriptions, meta tags, competitor pricing) | ✅ |
| 3 | Marketing Automation (email campaigns, abandoned cart, discount codes) | ✅ |
| 4 | Analytics & Reporting (revenue dashboard, conversion, SLA) | ✅ |
| 5 | Inventory Management (low-stock alerts, dead stock, supplier scoring) | ✅ |
| 6 | Customer Retention (review solicitation, loyalty points, repeat purchase AI) | ✅ |
| 7 | Dynamic Pricing (AI price suggestions, approval workflow) | ✅ |

### Ops commands

```bash
# Orchestrator health
cd business-orchestrator && bash scripts/orch-flipflop-health.sh

# Trigger coordinator cycle manually
bash scripts/orch-trigger-cycle.sh flipflop-v1

# Full platform validation
bash scripts/orch-final-validation.sh
```
