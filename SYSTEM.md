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
