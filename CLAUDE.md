# CLAUDE.md (flipflop-service)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## flipflop-service

**Purpose**: Automated Czech e-commerce platform (flipflop.statex.cz) — AI-driven product management, pricing, and marketing.  
**Domain**: https://flipflop.statex.cz  
**Stack**: NestJS (backend) · Next.js SSR + Tailwind (frontend) · PostgreSQL · Redis

### Key constraints
- Never publish pricing changes without validation
- Never cancel customer orders without human approval
- Czech consumer law compliance: 14-day return right must be honored
- LLM budget cap: 500k units/month across all AI tasks
- Escalation: @sergej_partizan on Telegram

### Success metrics
- Revenue growth MoM · Conversion rate > 2% · Order fulfillment < 48h

### Integration chain
catalog-microservice (products) → flipflop-service → customer  
orders-microservice (order state) ← flipflop-service  
warehouse-microservice (stock) ← flipflop-service  
ai-microservice (product descriptions, SEO) ← flipflop-service

### Quick ops
```bash
docker compose logs -f
./scripts/deploy.sh
```
