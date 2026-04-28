# flipflop-service Ops Runbook

**Programme:** Business Orchestrator P1–P10 — complete (2026-04-15)

## Deployment

```bash
./scripts/deploy.sh

or cd ../nginx-microservice && ./scripts/blue-green/deploy-smart.sh flipflop
```

## Health

```bash
kubectl get pods -n statex-apps -l app=flipflop
curl https://flipflop.alfares.cz/health
```

## Orchestrator

Project slug: `flipflop-v1` | Coordinator: every 5 min

```bash
./scripts/orch-status.sh
./scripts/orch-trigger-cycle.sh flipflop-v1
```

## Admin Panel

URL: `https://flipflop.alfares.cz/admin`  
Panels: Dead stock · Low stock alerts · Loyalty points · Review queue · AI price suggestions · Repeat purchase analysis

## Escalation

Critical alerts → Telegram via notifications-microservice (`ESCALATION_TELEGRAM_CHAT_ID` in Vault).
