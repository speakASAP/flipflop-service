# flipflop.statex.cz flipflop Platform

Modern, fully automated flipflop platform for selling diverse product categories in the Czech Republic.

## 🏗️ Architecture

The platform consists of 9 microservices:

### Main Platform Services

1. **API Gateway** (${API_GATEWAY_PORT:-3511}) - Request routing and authentication
2. **User Service** (${USER_SERVICE_PORT:-3504}) - Authentication and user management
3. **Product Service** (${PRODUCT_SERVICE_PORT:-3502}) - Product catalog and categories
4. **Order Service** (${ORDER_SERVICE_PORT:-3503}) - Shopping cart, orders, and payments
5. **Supplier Service** (${SUPPLIER_SERVICE_PORT:-3506}) - Supplier integration and product sync
6. **AI Service** (${AI_SERVICE_PORT:-3507}) - AI shopping assistant (OpenRouter/Gemini)
7. **Analytics Service** (${ANALYTICS_SERVICE_PORT:-3508}) - Sales and revenue analytics

**Note**: All ports are configured in `flipflop/.env`. The values shown are defaults.

## 🔌 Port Configuration

**Port Range**: 35xx (flipflop application)

Services use host ports in the 35xx range, mapping to standard container ports:

| Service | Host Port | Container Port | .env Variable | Description |
| ------- | --------- | -------------- | ------------- | ----------- |
| **Frontend** | `${FRONTEND_PORT:-3500}` | `3000` | `FRONTEND_PORT` (flipflop/.env) | Next.js frontend application |
| **API Gateway** | `${API_GATEWAY_PORT:-3511}` | `3011` | `API_GATEWAY_PORT` (flipflop/.env) | Main API gateway for routing |
| **Product Service** | `${PRODUCT_SERVICE_PORT:-3502}` | `3002` | `PRODUCT_SERVICE_PORT` (flipflop/.env) | Product catalog management |
| **Order Service** | `${ORDER_SERVICE_PORT:-3503}` | `3003` | `ORDER_SERVICE_PORT` (flipflop/.env) | Order processing |
| **User Service** | `${USER_SERVICE_PORT:-3504}` | `3004` | `USER_SERVICE_PORT` (flipflop/.env) | User management |
| **Warehouse Service** | `${WAREHOUSE_SERVICE_PORT:-3505}` | `3005` | `WAREHOUSE_SERVICE_PORT` (flipflop/.env) | Warehouse management |
| **Supplier Service** | `${SUPPLIER_SERVICE_PORT:-3506}` | `3006` | `SUPPLIER_SERVICE_PORT` (flipflop/.env) | Supplier integration |
| **AI Service** | `${AI_SERVICE_PORT:-3507}` | `3007` | `AI_SERVICE_PORT` (flipflop/.env) | AI shopping assistant |
| **Analytics Service** | `${ANALYTICS_SERVICE_PORT:-3508}` | `3008` | `ANALYTICS_SERVICE_PORT` (flipflop/.env) | Analytics and reporting |
| **Cart Service** | `${CART_SERVICE_PORT:-3509}` | `3009` | `CART_SERVICE_PORT` (flipflop/.env) | Shopping cart management |

**Note**: All ports are configured in `flipflop/.env`. The values shown are defaults. All ports are exposed on `127.0.0.1` only (localhost) for security. External access is provided via nginx-microservice reverse proxy.

### External Shared Services

**Note**: These are external shared production microservices used by multiple applications. They are not part of this project's deployment but must be running and accessible before deployment.

1. **Auth Microservice** (`https://auth.statex.cz`) - Centralized authentication service (user registration, login, JWT tokens, password reset)
2. **Notification Microservice** (`https://notifications.statex.cz`) - Multi-channel notifications (Email, Telegram, WhatsApp)
3. **Logging Microservice** (`https://logging.statex.cz`) - Centralized logging service
4. **Payment Microservice** (`https://payments.statex.cz`) - Centralized payment processing (PayPal, Stripe, PayU, Fio Banka, ComGate)
5. **Database Server** (`db-server-postgres`) - Shared PostgreSQL database server
6. **Redis Server** (`db-server-redis`) - Shared Redis cache server
7. **Nginx Microservice** - Reverse proxy and SSL termination for all applications

## 🛠️ Technology Stack

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **Caching**: Redis
- **Payment**: PayU (Czech Republic)
- **AI**: OpenRouter API (Google Gemini 2.0 Flash)
- **Notifications**: SendGrid, Telegram, WhatsApp
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (external)

## ✨ Features

✅ **Centralized Authentication** - Uses shared auth-microservice for all authentication operations
✅ **Centralized Payments** - Uses shared payments-microservice for payment processing
✅ **Centralized Notifications** - Uses shared notifications-microservice for multi-channel notifications
✅ **Centralized Logging** - Uses shared logging-microservice for centralized log collection
✅ User authentication and authorization (JWT via auth-microservice)
✅ Product catalog with search and filtering
✅ Shopping cart and checkout
✅ Payment processing via payments-microservice (PayU, PayPal, Stripe, etc.)
✅ Order management and tracking
✅ Supplier integration and product synchronization
✅ AI shopping assistant
✅ Analytics and reporting
✅ Multi-channel notifications (Email, Telegram, WhatsApp via notifications-microservice)
✅ API Gateway with request routing

## 📦 Project Structure

```text
flipflop/
├── services/              # Microservices
│   ├── api-gateway/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   ├── supplier-service/
│   ├── ai-service/
│   └── analytics-service/
├── shared/               # Shared libraries
│   ├── entities/        # TypeORM entities
│   ├── database/        # Database configuration
│   ├── logger/          # Logging utilities
│   └── utils/           # Utility functions
├── scripts/             # Management scripts
├── docs/                # Documentation
└── docker-compose.yml   # Docker configuration
```

## 🌐 API Endpoints

All API requests go through the API Gateway at `http://localhost:${API_GATEWAY_PORT:-3511}/api` (port configured in `flipflop/.env`)

**Main endpoints:**

- `/auth/*` - Authentication (delegated to auth-microservice)
  - Registration, login, token validation, password reset/change handled by auth-microservice
  - Services use shared `AuthService` from `shared/auth/auth.service.ts`
- `/users/*` - User management
- `/products/*` - Product catalog
- `/cart/*` - Shopping cart
- `/orders/*` - Order management
- `/payu/*` - Payment processing
- `/suppliers/*` - Supplier management
- `/ai/*` - AI assistant
- `/analytics/*` - Analytics

**Authentication Integration**:

All services should use the shared `AuthService` from `flipflop/shared/auth/auth.service.ts` to:

- Register users: `authService.register(registerDto)`
- Login users: `authService.login(loginDto)`
- Validate tokens: `authService.validateToken(token)`
- Refresh tokens: `authService.refreshToken(refreshToken)`
- Change passwords: `authService.changePassword(userId, passwordChangeDto)` (when implemented in services)

## 🔐 Environment Variables

Configure services via `.env` files.

**Key variables:**

- `AUTH_SERVICE_URL` - Auth microservice URL (REQUIRED)
  - Production: `https://auth.statex.cz`
  - Docker/Development: `http://auth-microservice:3370`
- `NOTIFICATION_SERVICE_URL` - Notification microservice URL (REQUIRED)
  - Production: `https://notifications.statex.cz`
  - Docker/Development: `http://notifications-microservice:3368`
- `LOGGING_SERVICE_URL` - Logging microservice URL (REQUIRED)
  - Production: `https://logging.statex.cz`
  - Docker/Development: `http://logging-microservice:3367`
- `PAYMENT_SERVICE_URL` - Payment microservice URL (REQUIRED)
  - Production: `https://payments.statex.cz`
  - Docker/Development: `http://payments-microservice:3468`
- `PAYMENT_API_KEY` - API key for payment microservice (REQUIRED)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `REDIS_HOST`, `REDIS_PORT` - Redis cache configuration
- `OPENROUTER_API_KEY` - OpenRouter API key

**Note**:

- JWT tokens are managed by auth-microservice. Services use the shared `AuthService` from `shared/auth/auth.service.ts` to interact with auth-microservice.
- Payments are processed via payments-microservice. Services use the shared `PaymentService` from `shared/payments/payment.service.ts`.
- Notifications are sent via notifications-microservice. Services use the shared `NotificationService` from `shared/notifications/notification.service.ts`.
- Logs are sent to logging-microservice. Services use the shared `LoggerService` from `shared/logger/logger.service.ts`.

See [docs/ENV_VARIABLES.md](./docs/ENV_VARIABLES.md) for complete environment variable reference.

## 🔧 Troubleshooting

### Zombie Processes in Frontend Container

**Issue**: Frontend container (`flipflop-service-frontend-blue` or `flipflop-service-frontend-green`) generates zombie processes.

**Root Cause**: Container was built with an older Dockerfile that didn't include `tini` as PID 1, or healthcheck was spawning child processes.

**Solution**:

1. **Rebuild the container** with the current Dockerfile (which includes `tini`):
   ```bash
   cd /path/to/flipflop-service
   docker-compose -f docker-compose.blue.yml build frontend
   # or for green:
   docker-compose -f docker-compose.green.yml build frontend
   ```

2. **Restart the container**:
   ```bash
   docker-compose -f docker-compose.blue.yml up -d frontend
   # or for green:
   docker-compose -f docker-compose.green.yml up -d frontend
   ```

3. **Verify tini is running as PID 1**:
   ```bash
   docker exec flipflop-service-frontend-blue cat /proc/1/cmdline | tr '\0' ' '
   # Should show: /usr/bin/tini -- node server.js
   ```

**Prevention**: The Dockerfile now includes:
- `tini` installed and configured as PID 1 (line 29, 48)
- Healthcheck uses `curl` instead of complex node commands (simpler, no child processes)

**Note**: If you see zombie processes, the container needs to be rebuilt. The current Dockerfile configuration prevents this issue.

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 📞 Support

For issues and questions:

- Check documentation in `/docs`
