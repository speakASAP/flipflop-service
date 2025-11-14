# FlipFlop.cz E-commerce Platform

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

### External Services

1. **Notification Microservice** (3010) - Multi-channel notifications
2. **Logging Microservice** (3009) - Centralized logging

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

✅ User authentication and authorization (JWT)
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

- `/auth/*` - Authentication
- `/users/*` - User management
- `/products/*` - Product catalog
- `/cart/*` - Shopping cart
- `/orders/*` - Order management
- `/payu/*` - Payment processing
- `/suppliers/*` - Supplier management
- `/ai/*` - AI assistant
- `/analytics/*` - Analytics

## 🔐 Environment Variables

Configure services via `.env` files.

**Key variables:**

- `JWT_SECRET` - JWT signing secret
- `DB_HOST`, `DB_PASSWORD` - Database configuration
- `PAYU_*` - PayU payment gateway credentials
- `OPENROUTER_API_KEY` - OpenRouter API key
- `SENDGRID_API_KEY` - SendGrid email API key

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 📞 Support

For issues and questions:

- Check documentation in `/docs`
