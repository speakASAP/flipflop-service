# FlipFlop — Ops Runbook

## Architecture overview
- NestJS microservices under `services/`: api-gateway, cart-service, frontend, order-service, product-service, supplier-service, user-service, warehouse-service
- PostgreSQL (`db-server-postgres:5432`, schema `public`)
- Redis (`db-server-redis:6379`) for sessions and task queue
- RabbitMQ for events between services
- AI inference via `ai-microservice:3380` (free -> cheap -> smart tier)

## Deployment
- Blue/green deployment: run `./scripts/deploy.sh` from `flipflop-service/`
- Ports: blue/green mappings defined in the compose files in this repository

## Orchestrator
- Project slug: `flipflop-v1` in `business-orchestrator` database
- Coordinator cycle runs every 5 minutes and spawns tasks from the active goal
- Monitor health with `bash business-orchestrator/scripts/orch-flipflop-health.sh`
- Trigger manually with `bash business-orchestrator/scripts/orch-trigger-cycle.sh flipflop-v1`

## Admin panel
- URL: `https://flipflop.statex.cz/admin`
- Panels: Revenue, Conversion, SLA, Low Stock, Dead Stock, Suppliers, Reviews, Loyalty, Repeat Buyers, AI Pricing

## Key DB queries
```sql
-- Active goal
SELECT title, status FROM goals
JOIN projects ON projects.id = goals.project_id
WHERE projects.slug = 'flipflop-v1' AND goals.status = 'active';

-- Recent task failures
SELECT type, error_message, created_at FROM tasks
WHERE project_id = (SELECT id FROM projects WHERE slug = 'flipflop-v1')
  AND status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

## Escalation
- Telegram: `@sergej_partizan`
- Critical failures: orchestrator escalation events routed to `notifications-microservice`
