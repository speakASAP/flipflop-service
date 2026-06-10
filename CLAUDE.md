# CLAUDE.md (flipflop-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/flipflop-service -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```


---

## flipflop-service

**Purpose**: Automated Czech e-commerce platform (flipflop.alfares.cz) — AI-driven product management, pricing, and marketing.  
**Domain**: https://flipflop.alfares.cz  
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

**Ops**: `kubectl logs -n statex-apps deploy/flipflop-api-gateway --tail=100` · `./scripts/deploy.sh`
