# flipflop-service

Czech e-commerce platform (https://flipflop.alfares.cz) — AI-driven product management, pricing, and marketing.

## Stack

NestJS (backend) · Next.js SSR + Tailwind (frontend) · PostgreSQL · Redis  
Deployed: Kubernetes `statex-apps` namespace  
Secrets: Vault `secret/prod/flipflop` (injected via ESO)

## Services

| Service | Responsibility |
|---------|---------------|
| api-gateway | Entry point, JWT auth, routing |
| product-service | Product catalog |
| order-service | Orders, pricing |
| cart-service | Shopping cart |
| user-service | User management |
| warehouse-service | Stock management |
| frontend | Next.js SSR |

## External services

See `SYSTEM.md` → External Integrations table.

## Quick ops

```bash
./scripts/deploy.sh
kubectl get pods -n statex-apps -l app=flipflop
```

## Docs

| File | Purpose |
|------|---------|
| `SYSTEM.md` | Architecture + integrations |
| `PLAN.md` | Active tasks |
| `SPEC.md` | Technical specification |
| `docs/ENV_VARIABLES.md` | Env var reference (secrets in Vault) |
| `docs/SMART_DEPLOYMENT.md` | Deploy commands |
