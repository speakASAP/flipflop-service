# External Microservices Integration Summary

This document summarizes the integration of external shared microservices into the flipflop platform.

## ✅ Integration Status

All external microservices are **fully integrated** and being used throughout the platform.

### 1. Auth Microservice ✅

**Status**: Fully Integrated

**Service URL**:

- Production: `https://auth.alfares.cz`
- Docker Network: `http://auth-microservice:3370`

**Implementation**:

- Service: `shared/auth/auth.service.ts`
- Module: `shared/auth/auth.module.ts`
- Used by: All services requiring authentication

**Features Used**:

- User registration
- User login
- JWT token validation
- Token refresh
- Password reset (via auth-microservice)

**Environment Variable**: `AUTH_SERVICE_URL`

---

### 2. Notification Microservice ✅

**Status**: Fully Integrated

**Service URL**:

- Production: `https://notifications.alfares.cz`
- Docker Network: `http://notifications-microservice:3368`

**Implementation**:

- Service: `shared/notifications/notification.service.ts`
- Module: `shared/notifications/notification.module.ts`
- Used by: `order-service` for order confirmations and status updates

**Features Used**:

- Email notifications (flipflop.cz sender identity; **planned migration from SendGrid to AWS SES**—see notifications-microservice channel registry)
- Telegram notifications
- WhatsApp notifications
- Order confirmation notifications
- Payment confirmation notifications
- Order status update notifications
- Shipment tracking notifications

**Environment Variable**: `NOTIFICATION_SERVICE_URL`

---

### 3. Logging Microservice ✅

**Status**: Fully Integrated

**Service URL**:

- Production: `https://logging.alfares.cz`
- Docker Network: `http://logging-microservice:3367`

**Implementation**:

- Service: `shared/logger/logger.service.ts`
- Utility: `shared/logger/logger.util.ts`
- Used by: All services for centralized logging

**Features Used**:

- Centralized log collection
- Dual logging (local + remote)
- Non-blocking log transmission
- Log level filtering (error, warn, info, debug)

**Environment Variable**: `LOGGING_SERVICE_URL`

**Note**: Logs are sent to both local files and the logging microservice for redundancy.

---

### 4. Payment Microservice ✅

**Status**: Fully Integrated

**Service URL**:

- Production: `https://payments.alfares.cz`
- Docker Network: `http://payments-microservice:3468`

**Implementation**:

- Service: `shared/payments/payment.service.ts`
- Module: `shared/payments/payment.module.ts`
- Used by: `order-service` for payment processing

**Features Used**:

- Payment creation
- Payment status checking
- Refund processing (full and partial)
- Multiple payment method support (PayU, PayPal, Stripe, Fio Banka, ComGate)

**Environment Variables**:

- `PAYMENT_SERVICE_URL` — base URL for REST calls (for example `https://payments.alfares.cz` or `http://payments-microservice:3468` on Docker network).
- `PAYMENT_API_KEY` — value sent as `X-API-Key` on every outbound request to payments-microservice. When `payments-microservice` has **`API_KEYS`** set (comma-separated allowlist), this value must **match one entry exactly**. Add each legitimate client key to `API_KEYS` on the payment service, then restart payments-microservice.
- `API_GATEWAY_URL`, `PAYMENT_WEBHOOK_API_KEY`, `FLIPFLOP_INTERNAL_SERVICE_SECRET` — used by flipflop checkout and application callbacks from payments; see [ENV_VARIABLES.md](./ENV_VARIABLES.md).

---

### 5. Database Server ✅

**Status**: Fully Integrated

**Server**:

- Production: `db-server-postgres` (Docker network)
- Development: `localhost` (via SSH tunnel)

**Implementation**:

- Service: `shared/database/prisma.service.ts`
- Module: `shared/database/prisma.module.ts`
- Used by: All services requiring database access

**Features Used**:

- PostgreSQL database access via Prisma ORM
- Automatic DATABASE_URL construction from DB_* variables
- Connection pooling
- Query logging

**Environment Variables**:

- `DB_HOST` (production: `db-server-postgres`, development: `localhost`)
- `DB_PORT` (default: `5432`)
- `DB_USER` (default: `dbadmin`)
- `DB_PASSWORD` (required)
- `DB_NAME` (default: `flipflop`)
- `DATABASE_URL` (auto-constructed if not set)

**Note**: PrismaService automatically constructs `DATABASE_URL` from `DB_*` variables if not explicitly set.

---

### 6. Redis Server ✅

**Status**: Fully Integrated

**Server**:

- Production: `db-server-redis` (Docker network)
- Development: `localhost` (via SSH tunnel)

**Implementation**:

- Config: `shared/redis/redis.config.ts`
- Module: `shared/redis/redis.module.ts`
- Used by: Services requiring caching

**Environment Variables**:

- `REDIS_HOST` (production: `db-server-redis`, development: `localhost`)
- `REDIS_PORT` (default: `6379`)
- `REDIS_PASSWORD` (optional)
- `REDIS_DB` (default: `0`)

---

## 📋 Environment Variables Summary

### Required Variables

All services require these environment variables:

```bash
# External Microservices
AUTH_SERVICE_URL=https://auth.alfares.cz
NOTIFICATION_SERVICE_URL=https://notifications.alfares.cz
LOGGING_SERVICE_URL=https://logging.alfares.cz
PAYMENT_SERVICE_URL=https://payments.alfares.cz
PAYMENT_API_KEY=<one-of-payments-microservice-API_KEYS>

# Database
DB_HOST=db-server-postgres
DB_PORT=5432
DB_USER=dbadmin
DB_PASSWORD=<your-password>
DB_NAME=flipflop

# Redis (optional)
REDIS_HOST=db-server-redis
REDIS_PORT=6379
```

### Development Variables

For local development, use:

```bash
# Use production URLs or Docker network URLs
AUTH_SERVICE_URL=https://auth.alfares.cz
# or
AUTH_SERVICE_URL=http://auth-microservice:3370

# Database via SSH tunnel
DB_HOST=localhost
REDIS_HOST=localhost
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for complete reference.

---

## 🔧 Code Integration Examples

### Using Auth Service

```typescript
import { AuthService } from '@flipflop/shared';

@Injectable()
export class MyService {
  constructor(private readonly authService: AuthService) {}

  async validateUser(token: string) {
    return await this.authService.validateToken(token);
  }
}
```

### Using Notification Service

```typescript
import { NotificationService } from '@flipflop/shared';

@Injectable()
export class MyService {
  constructor(private readonly notificationService: NotificationService) {}

  async sendOrderConfirmation(email: string, orderNumber: string, total: number) {
    return await this.notificationService.sendOrderConfirmation(
      email,
      orderNumber,
      total,
      'email'
    );
  }
}
```

### Using Payment Service

```typescript
import { PaymentService } from '@flipflop/shared';

@Injectable()
export class MyService {
  constructor(private readonly paymentService: PaymentService) {}

  async createPayment(orderId: string, amount: number, currency: string) {
    return await this.paymentService.createPayment({
      orderId,
      amount,
      currency,
      method: 'payu',
    });
  }
}
```

### Using Logger Service

```typescript
import { LoggerService } from '@flipflop/shared';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {}

  async doSomething() {
    this.logger.log('Doing something', { context: 'MyService' });
  }
}
```

### Using Database (Prisma)

```typescript
import { PrismaService } from '@flipflop/shared';

@Injectable()
export class MyService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    return await this.prisma.user.findMany();
  }
}
```

---

## 🚀 Deployment Checklist

Before deploying, ensure:

- [ ] All external microservices are running and accessible
- [ ] Environment variables are set correctly in `.env`
- [ ] `AUTH_SERVICE_URL` points to production auth-microservice
- [ ] `NOTIFICATION_SERVICE_URL` points to production notifications-microservice
- [ ] `LOGGING_SERVICE_URL` points to production logging-microservice
- [ ] `PAYMENT_SERVICE_URL` points to production payments-microservice
- [ ] `payments-microservice` `API_KEYS` includes flipflop’s `PAYMENT_API_KEY` (and any other callers), and payments was restarted after changes
- [ ] `PAYMENT_API_KEY` matches one entry in that allowlist
- [ ] (Checkout) `API_GATEWAY_URL`, `FLIPFLOP_INTERNAL_SERVICE_SECRET`, and optional `PAYMENT_WEBHOOK_API_KEY` align with [ENV_VARIABLES.md](./ENV_VARIABLES.md)
- [ ] Database connection is configured (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- [ ] Redis connection is configured (if using caching)
- [ ] All services can reach external microservices (network connectivity)
- [ ] Health checks are passing for all external dependencies

---

## 📚 Related Documentation

- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Complete environment variables reference
- [README.md](../README.md) - Main project documentation
- [Statex Microservices Ecosystem README](../../README.md) - External microservices documentation

---

**Last Updated**: 2026-04-12
**Status**: All microservices fully integrated ✅
