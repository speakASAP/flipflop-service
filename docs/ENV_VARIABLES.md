# Environment Variables

All secrets live in Vault: `secret/prod/flipflop`  
K8s injects them automatically via External Secrets Operator → `statex-apps` namespace.  
For local dev: `vault kv get secret/prod/flipflop` or use SSH tunnel + `.env`.

> See `../shared/docs/ENV_FILE_STANDARD.md` for ecosystem-wide rules.

## Variable Reference


| Variable                                                                         | Required | Description                                       |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `NODE_ENV`                                                                       | Yes      | `production` / `development`                      |
| `DATABASE_URL`                                                                   | Yes      | Prisma connection string (injected from Vault)    |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`                                   | Yes      | Redis cache                                       |
| `AUTH_SERVICE_URL`                                                               | Yes      | `https://auth.alfares.cz`                         |
| `NOTIFICATION_SERVICE_URL`                                                       | Yes      | `https://notifications.alfares.cz`                |
| `LOGGING_SERVICE_URL`                                                            | Yes      | `https://logging.alfares.cz`                      |
| `PAYMENT_SERVICE_URL`                                                            | Yes      | `https://payments.alfares.cz`                     |
| `PAYMENT_API_KEY`                                                                | Yes      | Outbound key for payments-microservice            |
| `FLIPFLOP_INTERNAL_SERVICE_SECRET`                                               | Yes      | api-gateway → order-service internal header       |
| `PAYU_POS_ID` / `PAYU_CLIENT_ID` / `PAYU_CLIENT_SECRET` / `PAYU_MERCHANT_POS_ID` | Yes      | PayU credentials                                  |
| `OPENROUTER_API_KEY`                                                             | Yes      | AI tasks via OpenRouter                           |
| `NEXT_PUBLIC_API_URL`                                                            | Yes      | Public API base URL                               |
| `API_GATEWAY_URL`                                                                | Yes      | `https://flipflop.alfares.cz` (no trailing slash) |
| `DOMAIN`                                                                         | Yes      | `flipflop.alfares.cz`                             |
