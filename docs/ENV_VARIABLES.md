# Environment Variables Reference

This document lists all required and optional environment variables for the flipflop platform, organized by microservice and environment (production vs development).

## 📋 Quick Reference

### Production Environment Variables

```bash
# ============================================
# Application Configuration
# ============================================
NODE_ENV=production
SERVICE_NAME=flipflop
# DOMAIN is used by nginx-microservice for auto-registry generation (required for correct SSL certificate paths)
DOMAIN=flipflop.statex.cz

# ============================================
# External Shared Microservices
# ============================================

# Auth Microservice (https://auth.statex.cz)
AUTH_SERVICE_URL=https://auth.statex.cz

# Notification Microservice (https://notifications.statex.cz)
NOTIFICATION_SERVICE_URL=https://notifications.statex.cz

# Logging Microservice (https://logging.statex.cz)
LOGGING_SERVICE_URL=https://logging.statex.cz

# Payment Microservice (https://payments.statex.cz)
PAYMENT_SERVICE_URL=https://payments.statex.cz
PAYMENT_API_KEY=<your-payment-api-key>

# ============================================
# Database Server (Shared PostgreSQL)
# ============================================
# For Docker network access (production)
DB_HOST=db-server-postgres
DB_PORT=${DB_SERVER_PORT:-5432}  # From database-server/.env
DB_USER=dbadmin
DB_PASSWORD=<your-db-password>
DB_NAME=flipflop

# Prisma requires DATABASE_URL (constructed from above or set directly)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public

# ============================================
# Redis Cache (Shared Redis)
# ============================================
# For Docker network access (production)
REDIS_HOST=db-server-redis
REDIS_PORT=${REDIS_SERVER_PORT:-6379}  # From database-server/.env
REDIS_PASSWORD=<your-redis-password-if-set>
REDIS_DB=0

# ============================================
# Service Ports (Container Ports)
# Note: Host ports are 35xx range (3500, 3502-3509, 3511) as per README.md
# All ports configured in flipflop/.env - values shown are defaults
# ============================================
API_GATEWAY_PORT=3011  # Container port (Host port: 3511)
USER_SERVICE_PORT=3004  # Container port (Host port: 3504)
PRODUCT_SERVICE_PORT=3002  # Container port (Host port: 3502)
ORDER_SERVICE_PORT=3003  # Container port (Host port: 3503)
CART_SERVICE_PORT=3005  # Container port (Host port: 3505)
WAREHOUSE_SERVICE_PORT=3009  # Container port (Host port: 3509)
FRONTEND_PORT=3000  # Container port (Host port: 3500)

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=info
LOG_TIMESTAMP_FORMAT=YYYY-MM-DD HH:mm:ss

# ============================================
# Payment Gateway (PayU)
# ============================================
PAYU_POS_ID=<your-payu-pos-id>
PAYU_CLIENT_ID=<your-payu-client-id>
PAYU_CLIENT_SECRET=<your-payu-client-secret>
PAYU_MERCHANT_POS_ID=<your-payu-merchant-pos-id>
PAYU_API_URL=https://secure.payu.com/api/v2_1

# ============================================
# AI Service (OpenRouter)
# ============================================
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ============================================
# Email Service (SendGrid) - Optional, notifications use external microservice
# ============================================
SENDGRID_API_KEY=<your-sendgrid-api-key-if-needed>
SENDGRID_FROM_EMAIL=noreply@flipflop.cz

# ============================================
# Frontend Configuration
# ============================================
API_URL=https://flipflop.statex.cz/api
NEXT_PUBLIC_API_URL=https://flipflop.statex.cz/api
```

### Development Environment Variables

```bash
# ============================================
# Application Configuration
# ============================================
NODE_ENV=development
SERVICE_NAME=flipflop
# DOMAIN is used by nginx-microservice for auto-registry generation (required for correct SSL certificate paths)
DOMAIN=flipflop.statex.cz

# ============================================
# External Shared Microservices
# ============================================

# Auth Microservice
# Option 1: Use production URL (if accessible)
AUTH_SERVICE_URL=https://auth.statex.cz
# Option 2: Use Docker network (if running locally)
# AUTH_SERVICE_URL=http://auth-microservice:${PORT:-3370}  # port configured in auth-microservice/.env

# Notification Microservice
# Option 1: Use production URL (if accessible)
NOTIFICATION_SERVICE_URL=https://notifications.statex.cz
# Option 2: Use Docker network (if running locally)
# NOTIFICATION_SERVICE_URL=http://notifications-microservice:${PORT:-3368}  # port configured in notifications-microservice/.env

# Logging Microservice
# Option 1: Use production URL (if accessible)
LOGGING_SERVICE_URL=https://logging.statex.cz
# Option 2: Use Docker network (if running locally)
# LOGGING_SERVICE_URL=http://logging-microservice:${PORT:-3367}  # port configured in logging-microservice/.env

# Payment Microservice
# Option 1: Use production URL (if accessible)
PAYMENT_SERVICE_URL=https://payments.statex.cz
# Option 2: Use Docker network (if running locally)
# PAYMENT_SERVICE_URL=http://payments-microservice:${SERVICE_PORT:-3468}  # port configured in payments-microservice/.env
PAYMENT_API_KEY=<your-payment-api-key>

# ============================================
# Database Server (Shared PostgreSQL)
# ============================================
# For local development via SSH tunnel
DB_HOST=localhost
DB_PORT=${DB_SERVER_PORT:-5432}  # From database-server/.env
DB_USER=dbadmin
DB_PASSWORD=<your-db-password>
DB_NAME=flipflop

# Prisma requires DATABASE_URL (constructed from above or set directly)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public

# ============================================
# Redis Cache (Shared Redis)
# ============================================
# For local development via SSH tunnel
REDIS_HOST=localhost
REDIS_PORT=${REDIS_SERVER_PORT:-6379}  # From database-server/.env
REDIS_PASSWORD=<your-redis-password-if-set>
REDIS_DB=0

# ============================================
# Service Ports (Container Ports)
# Note: Host ports are 35xx range (3500, 3502-3509, 3511) as per README.md
# All ports configured in flipflop/.env - values shown are defaults
# ============================================
API_GATEWAY_PORT=3011  # Container port (Host port: 3511)
USER_SERVICE_PORT=3004  # Container port (Host port: 3504)
PRODUCT_SERVICE_PORT=3002  # Container port (Host port: 3502)
ORDER_SERVICE_PORT=3003  # Container port (Host port: 3503)
CART_SERVICE_PORT=3005  # Container port (Host port: 3505)
WAREHOUSE_SERVICE_PORT=3009  # Container port (Host port: 3509)
FRONTEND_PORT=3000  # Container port (Host port: 3500)

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=debug
LOG_TIMESTAMP_FORMAT=YYYY-MM-DD HH:mm:ss

# ============================================
# Payment Gateway (PayU) - Use test credentials
# ============================================
PAYU_POS_ID=<your-payu-test-pos-id>
PAYU_CLIENT_ID=<your-payu-test-client-id>
PAYU_CLIENT_SECRET=<your-payu-test-client-secret>
PAYU_MERCHANT_POS_ID=<your-payu-test-merchant-pos-id>
PAYU_API_URL=https://secure.snd.payu.com/api/v2_1

# ============================================
# AI Service (OpenRouter)
# ============================================
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ============================================
# Email Service (SendGrid) - Optional
# ============================================
SENDGRID_API_KEY=<your-sendgrid-api-key-if-needed>
SENDGRID_FROM_EMAIL=noreply@flipflop.cz

# ============================================
# Frontend Configuration
# ============================================
API_URL=http://localhost:3011/api
NEXT_PUBLIC_API_URL=http://localhost:3011/api
```

## 📝 Variable Descriptions

### External Shared Microservices

| Variable | Required | Description | Production | Development |
|----------|----------|-------------|------------|-------------|
| `AUTH_SERVICE_URL` | Yes | Auth microservice URL | `https://auth.statex.cz` | `https://auth.statex.cz` or `http://auth-microservice:${PORT:-3370}` (port configured in `auth-microservice/.env`) |
| `NOTIFICATION_SERVICE_URL` | Yes | Notification microservice URL | `https://notifications.statex.cz` | `https://notifications.statex.cz` or `http://notifications-microservice:${PORT:-3368}` (port configured in `notifications-microservice/.env`) |
| `LOGGING_SERVICE_URL` | Yes | Logging microservice URL | `https://logging.statex.cz` | `https://logging.statex.cz` or `http://logging-microservice:${PORT:-3367}` (port configured in `logging-microservice/.env`) |
| `PAYMENT_SERVICE_URL` | Yes | Payment microservice URL | `https://payments.statex.cz` | `https://payments.statex.cz` or `http://payments-microservice:${SERVICE_PORT:-3468}` (port configured in `payments-microservice/.env`) |
| `PAYMENT_API_KEY` | Yes | API key for payment microservice | `<your-api-key>` | `<your-api-key>` |

### Database Configuration

| Variable | Required | Description | Production | Development |
|----------|----------|-------------|------------|-------------|
| `DB_HOST` | Yes | Database hostname | `db-server-postgres` | `localhost` (via SSH tunnel) |
| `DB_PORT` | Yes | Database port | `${DB_SERVER_PORT:-5432}` | `${DB_SERVER_PORT:-5432}` (port configured in `database-server/.env`) |
| `DB_USER` | Yes | Database username | `dbadmin` | `dbadmin` |
| `DB_PASSWORD` | Yes | Database password | `<secret>` | `<secret>` |
| `DB_NAME` | Yes | Database name | `flipflop` | `flipflop` |
| `DATABASE_URL` | Yes | Prisma connection string | Auto-constructed or set directly | Auto-constructed or set directly |

**Note**: `DATABASE_URL` can be constructed from `DB_*` variables or set directly. Format: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`

### Redis Configuration

| Variable | Required | Description | Production | Development |
|----------|----------|-------------|------------|-------------|
| `REDIS_HOST` | No | Redis hostname | `db-server-redis` | `localhost` (via SSH tunnel) |
| `REDIS_PORT` | No | Redis port | `6379` | `6379` |
| `REDIS_PASSWORD` | No | Redis password (if set) | `<secret>` | `<secret>` |
| `REDIS_DB` | No | Redis database number | `0` | `0` |

### Service Ports

**Note**: These are container ports. Host ports are in the 35xx range (3500, 3502-3509, 3511) as per README.md.

| Variable | Required | Description | Container Port | Host Port |
|----------|----------|-------------|----------------|-----------|
| `API_GATEWAY_PORT` | No | API Gateway port | `3011` | `3511` |
| `USER_SERVICE_PORT` | No | User Service port | `3004` | `3504` |
| `PRODUCT_SERVICE_PORT` | No | Product Service port | `3002` | `3502` |
| `ORDER_SERVICE_PORT` | No | Order Service port | `3003` | `3503` |
| `CART_SERVICE_PORT` | No | Cart Service port | `3005` | `3505` |
| `WAREHOUSE_SERVICE_PORT` | No | Warehouse Service port | `3009` | `3509` |
| `FRONTEND_PORT` | No | Frontend port | `3000` | `3500` |

### Logging Configuration

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `LOG_LEVEL` | No | Logging level (error/warn/info/debug) | `info` |
| `LOG_TIMESTAMP_FORMAT` | No | Timestamp format | `YYYY-MM-DD HH:mm:ss` |

### Payment Gateway (PayU)

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYU_POS_ID` | Yes | PayU Point of Sale ID |
| `PAYU_CLIENT_ID` | Yes | PayU Client ID |
| `PAYU_CLIENT_SECRET` | Yes | PayU Client Secret |
| `PAYU_MERCHANT_POS_ID` | Yes | PayU Merchant POS ID |
| `PAYU_API_URL` | Yes | PayU API URL (production or sandbox) |

### AI Service (OpenRouter)

| Variable | Required | Description | URL |
|----------|----------|-------------|-----|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key | `https://openrouter.ai/api/v1` |
| `OPENROUTER_BASE_URL` | No | OpenRouter API base URL | `https://openrouter.ai/api/v1` |

### Frontend Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL (exposed to browser) |

## 🔐 Security Notes

1. **Never commit `.env` files** to version control
2. **Use `.env.example`** to document variable names (without values)
3. **Use strong passwords** for database and Redis
4. **Rotate API keys** regularly
5. **Use HTTPS** for all production microservice URLs
6. **Use SSH tunnels** for local database access instead of exposing ports

## 🚀 Setup Instructions

### Production Setup

1. Copy `.env.example` to `.env`
2. Fill in all required variables with production values
3. Ensure `DATABASE_URL` is set or will be constructed from `DB_*` variables
4. Verify all microservice URLs point to production endpoints
5. Set `NODE_ENV=production`

### Development Setup

1. Copy `.env.example` to `.env`
2. Fill in all required variables with development/test values
3. Set up SSH tunnel for database access:

   ```bash
   # Ports configured in database-server/.env: DB_SERVER_PORT (default: 5432), REDIS_SERVER_PORT (default: 6379)
   ssh -L ${DB_SERVER_PORT:-5432}:localhost:${DB_SERVER_PORT:-5432} statex
   ssh -L ${REDIS_SERVER_PORT:-6379}:localhost:${REDIS_SERVER_PORT:-6379} statex
   ```

4. Set `DB_HOST=localhost` and `REDIS_HOST=localhost`
5. Set `NODE_ENV=development`
6. Use production microservice URLs or local Docker network URLs

## 📚 Related Documentation

- [README.md](../README.md) - Main project documentation
- [MICROSERVICES_USAGE_AUDIT.md](./MICROSERVICES_USAGE_AUDIT.md) - Microservice usage audit
- [Statex Microservices Ecosystem README](../../README.md) - External microservices documentation
