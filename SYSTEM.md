# System: flipflop-service

## Architecture

NestJS + PostgreSQL + Redis + Next.js frontend. Deployed on Kubernetes (`statex-apps` namespace).

- Backend services: api-gateway, product-service, order-service, cart-service, user-service, warehouse-service
- Frontend: Next.js SSR + Tailwind
- AI: product descriptions, SEO via ai-microservice

## External Integrations

| Service | URL | Usage |
|---------|-----|-------|
| auth-microservice | https://auth.alfares.cz | User auth / JWT |
| notifications-microservice | https://notifications.alfares.cz | Order emails |
| logging-microservice | https://logging.alfares.cz | Centralized logs |
| payments-microservice | https://payments.alfares.cz | PayU, PayPal, Stripe, GP WebPay |
| catalog-microservice | https://catalog.alfares.cz | Product data |
| warehouse-microservice | https://warehouse.alfares.cz | Stock |
| orders-microservice | https://orders.alfares.cz | Order processing; ecosystem owner for product pricing |
| ai-microservice | https://ai.alfares.cz | AI tasks (cheap tier) |

## Current State

## Ops

```bash
kubectl get pods -n statex-apps -l app=flipflop
./scripts/orch-status.sh
./scripts/orch-trigger-cycle.sh flipflop-v1
```
