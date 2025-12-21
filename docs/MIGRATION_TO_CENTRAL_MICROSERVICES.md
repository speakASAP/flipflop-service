# Migration to Central Microservices

This document tracks the migration of flipflop-service from allegro database dependency to central catalog-microservice and warehouse-microservice.

## Status: In Progress

## Changes Made

### 1. API Clients Created ✅

- `shared/clients/catalog-client.service.ts` - Fetches products from catalog-microservice
- `shared/clients/warehouse-client.service.ts` - Fetches stock from warehouse-microservice
- `shared/clients/order-client.service.ts` - Forwards orders to orders-microservice
- `shared/clients/clients.module.ts` - NestJS module for clients

### 2. RabbitMQ Subscriber Created ✅

- `shared/rabbitmq/stock-events.subscriber.ts` - Subscribes to stock.updated events
- `shared/rabbitmq/rabbitmq.module.ts` - NestJS module for RabbitMQ

## Migration Steps

### Step 1: Update Services

**Services to Update:**
- `services/supplier-service/src/allegro/allegro-integration.service.ts`
  - Replace direct PostgreSQL queries to allegro database with CatalogClientService calls
  - Remove ALLEGRO_DB_NAME dependency
- `services/product-service/src/products/products.service.ts`
  - Update to fetch products from catalog-microservice
  - Update to fetch stock from warehouse-microservice
- `services/warehouse-service/src/warehouse.service.ts`
  - Replace with WarehouseClientService calls
- `services/order-service/src/order.service.ts`
  - Forward orders to orders-microservice via OrderClientService

### Step 2: Update Product Model

**Current State:**
- `Product` model in Prisma schema stores products locally

**Target State:**
- Keep Product model for FlipFlop-specific data (variants, local pricing overrides)
- Add `catalogProductId` field to reference catalog-microservice product
- Fetch product data from catalog-microservice when needed

**Action:**
1. Add `catalogProductId` field to Product model (optional UUID)
2. Keep local Product for FlipFlop-specific customizations
3. Update services to fetch base product data from catalog-microservice

### Step 3: Remove Allegro Database Dependency

**Current:**
- `AllegroIntegrationService` connects directly to allegro database
- Uses `ALLEGRO_DB_NAME` environment variable

**Target:**
- Remove direct database connection
- Use catalog-microservice and warehouse-microservice APIs

**Action:**
- Remove PostgreSQL pool from AllegroIntegrationService
- Replace all queries with API calls
- Remove `ALLEGRO_DB_NAME` from environment variables

### Step 4: Environment Variables

Add to `.env`:
```
CATALOG_SERVICE_URL=http://catalog-microservice:3200
WAREHOUSE_SERVICE_URL=http://warehouse-microservice:3201
ORDER_SERVICE_URL=http://orders-microservice:3203
RABBITMQ_URL=amqp://guest:guest@statex_rabbitmq:5672
```

Remove:
```
ALLEGRO_DB_NAME=allegro  # No longer needed
```

### Step 5: Update Module Imports

Add to service modules:
```typescript
imports: [
  // ... existing imports
  ClientsModule,
  RabbitMQModule,
]
```

## Testing Checklist

- [ ] Products fetched from catalog-microservice
- [ ] Stock fetched from warehouse-microservice
- [ ] Stock events received via RabbitMQ
- [ ] Product stock updated in real-time
- [ ] Orders forwarded to orders-microservice
- [ ] No direct connection to allegro database
- [ ] Cart checkout checks stock via warehouse-microservice

## Rollback Plan

If issues occur:
1. Restore ALLEGRO_DB_NAME environment variable
2. Remove ClientsModule and RabbitMQModule imports
3. Restore direct PostgreSQL queries in AllegroIntegrationService
4. Keep using allegro database for products

## Notes

- Product model in Prisma schema should be kept for FlipFlop-specific data
- Add `catalogProductId` to link to central catalog
- Keep ProductVariant model (FlipFlop-specific variants)
- Remove dependency on allegro database completely

