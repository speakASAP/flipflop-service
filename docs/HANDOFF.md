# flipflop-service — Handoff Document

**Created:** 2026-04-15 | **Programme:** Business Orchestrator P1–P10

---

## Architecture

flipflop-service is a Czech e-commerce platform (clothing) composed of NestJS microservices:

| Service | Port | Responsibility |
|---------|------|----------------|
| api-gateway | 3369 | Entry point, JWT auth, routing |
| order-service | 336x | Orders, payments, pricing |
| warehouse-service | 336x | Stock management |
| notification-service | 336x | Email + SMS |
| admin-panel | static | Admin UI (served by api-gateway) |

**Database:** PostgreSQL with Prisma ORM
**Queue:** RabbitMQ (exchanges: order.events, pricing.events, review.events)
**AI:** Routes through ai-microservice:3380 (cheap tier only)

---

## Deployment

Blue/green deployment via `scripts/deploy.sh`:

```bash
cd /home/ssf/Documents/Github/flipflop-service
./scripts/deploy.sh   # deploys to active port (3369 or 3370)
```

Health check: `curl http://localhost:3369/health`

---

## Orchestrator Integration

The business-orchestrator coordinates AI tasks for flipflop-v1:

- **Coordinator:** runs every 5 minutes, creates AI tasks from goal breakdown
- **Worker:** dispatches tasks to ai-microservice, validates outputs
- **Project slug:** `flipflop-v1`
- **SPEC:** `flipflop-service/docs/orchestrator/SPEC.md`
- **PLAN:** `flipflop-service/docs/orchestrator/PLAN.md`

Trigger a manual coordinator cycle:
```bash
./scripts/orch-trigger-cycle.sh flipflop-v1
```

---

## Admin Panel

URL: `http://localhost:3369/admin`

| Panel | Feature |
|-------|---------|
| Mrtvé zásoby | Dead stock identification |
| Výstrahy skladu | Low stock alerts |
| Věrnostní body | Loyalty account management |
| Žádosti o recenzi | Review request queue |
| Cenové návrhy AI | AI price suggestions (approve/reject) |
| Opakované nákupy | Repeat purchase analysis |

---

## Key DB Queries

```sql
-- Active goals
SELECT id, title, status, completion_pct FROM business_orchestrator.goals WHERE status = 'active';

-- Recent tasks
SELECT id, type, status, created_at FROM business_orchestrator.tasks ORDER BY created_at DESC LIMIT 20;

-- Price suggestions pending
SELECT id, product_name, current_price, suggested_price, change_percent FROM price_suggestions WHERE status = 'pending';
```

---

## Escalation

All critical alerts route to Telegram via notifications-microservice. Check `ESCALATION_TELEGRAM_CHAT_ID` in `.env`.

For human intervention: review tasks in `validation` status via orchestrator dashboard.
