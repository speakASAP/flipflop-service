# flipflop.statex.cz E-commerce Platform

Modern, fully automated e-commerce platform for selling diverse product categories in the Czech Republic.

## 🏗️ Architecture

The platform consists of 9 microservices:

### Main Platform Services

1. **API Gateway** (3001) - Request routing and authentication
2. **User Service** (3004) - Authentication and user management
3. **Product Service** (3002) - Product catalog and categories
4. **Order Service** (3003) - Shopping cart, orders, and payments
5. **Supplier Service** (3006) - Supplier integration and product sync
6. **AI Service** (3007) - AI shopping assistant (OpenRouter/Gemini)
7. **Analytics Service** (3008) - Sales and revenue analytics

### External Shared Services

**Note**: These are external shared production microservices used by multiple applications. They are not part of this project's deployment but must be running and accessible before deployment.

1. **Auth Microservice** (`https://auth.statex.cz`) - Centralized authentication service (user registration, login, JWT tokens, password reset)
2. **Notification Microservice** (`https://notifications.statex.cz`) - Multi-channel notifications (Email, Telegram, WhatsApp)
3. **Logging Microservice** (`https://logging.statex.cz`) - Centralized logging service
4. **Database Server** (`db-server-postgres`) - Shared PostgreSQL database server
5. **Nginx Microservice** - Reverse proxy and SSL termination for all applications

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
✅ User authentication and authorization (JWT via auth-microservice)
✅ Product catalog with search and filtering
✅ Shopping cart and checkout
✅ Payment processing (PayU)
✅ Order management and tracking
✅ Supplier integration and product synchronization
✅ AI shopping assistant
✅ Analytics and reporting
✅ Multi-channel notifications (Email, Telegram, WhatsApp)
✅ Centralized logging
✅ API Gateway with request routing

## 📦 Project Structure

```text
e-commerce/
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

All API requests go through the API Gateway at `http://localhost:3001/api`

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

All services should use the shared `AuthService` from `e-commerce/shared/auth/auth.service.ts` to:

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
- `DB_HOST`, `DB_PASSWORD` - Database configuration
- `PAYU_*` - PayU payment gateway credentials
- `OPENROUTER_API_KEY` - OpenRouter API key
- `SENDGRID_API_KEY` - SendGrid email API key

**Note**: JWT tokens are managed by auth-microservice. Services use the shared `AuthService` from `shared/auth/auth.service.ts` to interact with auth-microservice.

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 📞 Support

For issues and questions:

- Check documentation in `/docs`
