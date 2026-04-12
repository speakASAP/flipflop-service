# flipflop-service — Platform Specification

> ⚠️ Human-editable sections are marked. AI agents may append to §Current State per module only.

---

## Overview

FlipFlop (flipflop.statex.cz) is an automated Czech e-commerce platform selling diverse product categories, powered by a NestJS backend with modular services, a Next.js SSR frontend, and AI-driven product management, pricing, and marketing. The platform integrates with shared ecosystem microservices for authentication, payments, cataloguing, warehousing, and order processing. Business goals are conversion rate > 2% and order fulfilment < 48 hours.

---

## Module 1: Products & Catalogue

> ⚠️ Human-editable

### Data Models

**Product** (Prisma): `id`, `catalogProductId` (link to catalog-microservice), `name`, `sku`, `description`, `shortDescription`, `price`, `compareAtPrice`, `mainImageUrl`, `imageUrls`, `videoUrls`, `stockQuantity`, `trackInventory`, `isActive`, `brand`, `manufacturer`, `attributes`, `rating`, `reviewCount`, `seoTitle`, `seoDescription`, `seoKeywords`, `createdAt`, `updatedAt`

**Category** (Prisma): `id`, `name`, `slug`, `description`, `imageUrl`, `parentId` (self-referential tree), `sortOrder`, `isActive`

**ProductVariant** (Prisma): `id`, `productId`, `sku`, `name`, `options` (JSON), `price`, `compareAtPrice`, `stockQuantity`, `imageUrl`, `isActive`

**ProductCategory** (Prisma): join table linking `Product` ↔ `Category`

### SEO Fields

Every `Product` record carries three SEO fields stored in PostgreSQL:

- `seoTitle` — page `<title>` override (max 255 chars)
- `seoDescription` — `<meta name="description">` content
- `seoKeywords` — comma-separated keywords (max 255 chars)

These fields are rendered by the Next.js SSR frontend into page `<head>` for each product detail page.

### catalog-microservice Sync

`catalog-microservice:3200` is the master product catalogue. flipflop products optionally reference `catalogProductId`. Sync flow:

1. Catalog pushes product data events (name, images, attributes, pricing signals) to flipflop via HTTP or message queue.
2. flipflop `product-service` upserts `Product` records, never overwriting locally customised `price` without human approval.
3. Manual products (no `catalogProductId`) are managed entirely in-service.

### AI Task Types

| Task Type | Description | Output |
| --------- | ----------- | ------ |
| `write_product_description` | Generate `description` and `shortDescription` for a product SKU using ai-microservice:3380 | Updated `description`/`shortDescription` fields, pending human review |
| `generate_seo_meta` | Generate `seoTitle`, `seoDescription`, `seoKeywords` for a product | Updated SEO fields, pending human review |

**Anti-chaos rule:** AI must never modify `price` or `compareAtPrice` without explicit human validation.

**Current State:** Backlog contains 50 priority SKUs awaiting AI-generated descriptions. SEO fields exist in schema but are unpopulated for most products. catalog-microservice sync not yet wired.

---

## Module 2: Cart

> ⚠️ Human-editable

### Data Model

**CartItem** (Prisma): `id`, `userId`, `productId`, `variantId` (optional), `quantity`, `price` (snapshot at add-time), `createdAt`, `updatedAt`. Unique constraint on `(userId, productId, variantId)`.

### Operations

| Operation | Behaviour |
| --------- | --------- |
| Add to cart | Validates stock availability at add-time via warehouse-microservice:3201; captures `price` snapshot from current `Product.price` |
| Update quantity | Revalidates stock; updates `quantity`; price snapshot unchanged |
| Remove item | Deletes `CartItem` record; releases any soft reservation |
| View cart | Returns all `CartItem` rows for `userId` with joined product data |

### Price Snapshot

`CartItem.price` is captured at the moment the item is added. If the product price changes afterwards, the cart retains the original price. Checkout uses `CartItem.price` for order subtotal calculation — this prevents race conditions and unintended price mutations.

### Redis Sessions

User session state (session token, cart context for guest users) is stored in Redis. Authenticated users have carts persisted in PostgreSQL `cart_items`. Guest carts live in Redis only and are merged into the user's persistent cart on login.

**Current State:** Cart service implemented. Stock validation at add-time requires confirmation of warehouse-microservice integration status.

---

## Module 3: Checkout & Payments ★ (Phase 1 Priority)

> ⚠️ Human-editable

### Payment Providers

All payment processing routes through `payments-microservice:3468`.

| Provider | Status | Notes |
| -------- | ------ | ----- |
| PayU | Available in payments-microservice | Not yet wired into flipflop checkout |
| PayPal | Available in payments-microservice | Not yet wired into flipflop checkout |
| GP WebPay | Implemented (`webpay.service.ts`) | Blocked by T0a — hardcoded `DESCRIPTION: 'SPEAKASAP'` |
| Stripe | Implemented in payments-microservice | Not yet wired into flipflop checkout |

### Checkout Flow

1. User submits checkout with selected `DeliveryAddress` and payment method.
2. flipflop `order-service` creates an `Order` record with `status: pending`, `paymentStatus: pending`.
3. Stock is soft-reserved via `warehouse-microservice:3201`.
4. flipflop calls `payments-microservice:3468` to initiate payment session for the chosen provider.
5. User is redirected to provider payment page (GP WebPay redirect / PayU hosted page / PayPal / Stripe).
6. Provider posts webhook to `payments-microservice` on payment result.
7. `payments-microservice` forwards confirmed payment to flipflop webhook endpoint.
8. On payment success: `Order.paymentStatus → paid`, `Order.status → confirmed`, stock deducted (soft reservation converted to hard deduction), `notifications-microservice:3368` sends order confirmation email to customer.
9. On payment failure: `Order.paymentStatus → failed`, soft reservation released, user shown retry option.

### Webhook Flow

```text
Provider → payments-microservice:3468/webhooks/<provider>
         → flipflop api-gateway/webhooks/payment-result
         → order-service: update Order status + PaymentStatus
         → warehouse-service: deduct stock
         → notifications-service: send confirmation email
```

### Blockers

| ID | Blocker | Impact |
| -- | ------- | ------ |
| **T0a** | `webpay.service.ts` line 329 has `DESCRIPTION: 'SPEAKASAP'` hardcoded — must be dynamic per `applicationId` before GP WebPay works for flipflop | GP WebPay unusable for flipflop until fixed |
| **T0b** | flipflop checkout not yet wired to `payments-microservice:3468` for any provider | Zero payment providers active in checkout |
| **T0c** | speakasap-portal still uses its own Django WebPay (`orders/webpay/`) — migration to payments-microservice pending | Blocks shared payment infrastructure maturity |

### Anti-Chaos Rules

- **AI must never modify order totals, prices, or discounts** without human validation.
- **AI must never cancel orders** without explicit human approval.
- All payment state transitions must be triggered by cryptographically verified provider webhooks only.

**Current State:** Checkout module not yet wired to any payment provider. T0a/T0b blockers are active. Order creation and DeliveryAddress selection are functional. Webhook endpoints require implementation.

---

## Module 4: Orders & Fulfilment

> ⚠️ Human-editable

### Order Lifecycle

```text
pending → confirmed → processing → shipped → delivered
                                ↘ cancelled (human approval required)
delivered → refunded (14-day Czech law window)
```

**Order statuses** (Prisma enum `OrderStatus`): `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`

**Payment statuses** (Prisma enum `PaymentStatus`): `pending`, `paid`, `failed`, `refunded`

### Order Data Models

**Order** (Prisma): `id`, `orderNumber`, `userId`, `deliveryAddressId`, `status`, `paymentStatus`, `paymentMethod`, `paymentTransactionId`, `subtotal`, `tax`, `shippingCost`, `discount`, `total`, `trackingNumber`, `shippingProvider`, `notes`, `metadata`

**OrderItem** (Prisma): `id`, `orderId`, `productId`, `variantId`, `productName`, `productSku`, `quantity`, `unitPrice`, `totalPrice`, `profitMargin`

**OrderStatusHistory** (Prisma): `id`, `orderId`, `status`, `notes`, `changedBy`, `createdAt` — append-only audit log of every status change.

**Invoice** / **ProformaInvoice** (Prisma): linked to `Order`, stores PDF URL and invoice JSON data.

### orders-microservice Integration

`orders-microservice:3203` handles order processing logic (fulfilment routing, supplier forwarding). flipflop `order-service` delegates complex order orchestration to it via HTTP. Supplier `autoForwardOrders` flag on `Supplier` model controls automatic order forwarding.

### Czech Consumer Law Compliance

- 14-day return window enforced from `Order.createdAt`.
- Refund flow: human initiates → `Order.status → refunded`, `Order.paymentStatus → refunded`, stock re-incremented via warehouse-microservice.
- Return requests trigger notification to operations team via notifications-microservice.

### Status Webhooks

Outbound webhooks notify external systems (supplier APIs, tracking providers) on status transitions `processing → shipped` and `shipped → delivered`.

**Current State:** Order creation and status history recording are operational. Invoice generation functional. Shipping/tracking integration not wired. orders-microservice delegation partially implemented.

---

## Module 5: Users & Auth

> ⚠️ Human-editable

### Users Data Model

**User** (Prisma): `id`, `email` (unique), `password` (hashed), `firstName`, `lastName`, `phone`, `isEmailVerified`, `isAdmin`, `preferences` (JSON), `createdAt`, `updatedAt`

**DeliveryAddress** (Prisma): `id`, `userId`, `firstName`, `lastName`, `street`, `city`, `postalCode`, `country`, `phone`, `isDefault`

**PaymentMethod** (Prisma): `id`, `userId`, `type`, `provider`, `metadata` (JSON), `isDefault`, `isActive`

### auth-microservice JWT Integration

Authentication is delegated to `auth-microservice:3370`:

- Registration: flipflop `user-service` creates `User` record, calls auth-microservice to issue JWT.
- Login: credentials forwarded to auth-microservice; JWT returned to client.
- Token validation: all protected flipflop API routes validate JWT via auth-microservice on each request.
- flipflop does not store JWT secrets locally — auth is fully delegated.

### Email Verification

`User.isEmailVerified` flag. Verification email sent via `notifications-microservice:3368` on registration. Unverified users may browse but are prompted to verify before checkout.

### Admin Access

`User.isAdmin` flag gates admin-only API endpoints in `api-gateway`. Admin panel allows product/order/user management.

**Current State:** User registration and login functional. JWT validation via auth-microservice operational. Email verification flow implemented. DeliveryAddress CRUD operational.

---

## Module 6: Warehouse & Stock

> ⚠️ Human-editable

### warehouse-microservice Sync

`warehouse-microservice:3201` is the authoritative stock source. flipflop `warehouse-service` (internal) syncs with it:

- `Product.stockQuantity` and `ProductVariant.stockQuantity` are local cache mirrors updated by warehouse-microservice push events.
- At cart add-time: real-time stock check against warehouse-microservice before allowing add.
- At checkout initiation: soft reservation created in warehouse-microservice.

### Stock Reservation Flow

| Event | warehouse-microservice Action |
| ----- | ----------------------------- |
| Item added to cart | Real-time availability check (no reservation) |
| Checkout initiated | Soft reservation for all order items (TTL: 15 minutes) |
| Payment confirmed | Soft reservation converted to hard stock deduction |
| Payment failed / timeout | Soft reservation released |
| Order cancelled (human approved) | Hard deduction reversed; stock re-incremented |
| Order returned (refunded) | Stock re-incremented after physical return confirmed |

### SupplierProduct

**SupplierProduct** (Prisma): `id`, `supplierId`, `productId`, `supplierSku`, `supplierPrice`, `profitMargin`, `supplierStock`, `supplierData`, `lastSyncedAt`. Links products to supplier records for dropship/wholesale sourcing. `autoSyncProducts` flag on `Supplier` enables scheduled stock sync from supplier APIs.

**Current State:** warehouse-microservice integration partially wired. Soft reservation at checkout not yet implemented. Supplier stock sync not automated.

---

## Module 7: SEO & Content

> ⚠️ Human-editable

### AI-Generated Descriptions

Task pipeline via `ai-microservice:3380`:

1. Orchestrator enqueues `write_product_description` or `generate_seo_meta` task for a `productId`.
2. ai-microservice generates content using product attributes, brand, category context.
3. Output returned as draft — stored in a staging field or flagged `pending_review`.
4. Human reviews and approves before content goes live on product page.

### Meta Tags

Next.js SSR frontend reads `Product.seoTitle`, `Product.seoDescription`, `Product.seoKeywords` and injects them into `<head>` per product detail page. Category pages use `Category.name` and `Category.description` for meta.

### Sitemap

Auto-generated XML sitemap at `/sitemap.xml` covers:

- All active product pages (`/products/[slug]`)
- All active category pages (`/categories/[slug]`)
- Static pages (home, about, contact)

Sitemap regenerated on product/category publish events.

### Competitor Pricing Tasks

| Task Type | Description | Output |
| --------- | ----------- | ------ |
| `analyze_competitor_prices` | Scrape/compare competitor prices for top SKUs | Report with pricing delta; no automatic price changes |

**Anti-chaos rule:** Competitor price analysis produces reports only. AI must never apply pricing changes without human validation.

**Current State:** SEO fields present in schema, mostly unpopulated. `write_product_description` and `generate_seo_meta` task types defined but not yet enqueued by orchestrator. Sitemap endpoint not yet implemented.

---

## Module 8: Marketing & AI Tasks

> ⚠️ Human-editable

### Email Campaigns

Campaigns are drafted by AI and sent via `notifications-microservice:3368`:

| Task Type | Description | Trigger |
| --------- | ----------- | ------- |
| `write_email_campaign` | Generate email copy for seasonal sale, product launch, or promotion | Manual orchestrator dispatch or scheduled |
| `send_email_campaign` | Dispatch drafted campaign to target user segment | Human approval required before send |

Campaign drafts are stored and queued for human review. notifications-microservice handles SMTP delivery and unsubscribe management.

### Abandoned Cart Recovery

1. Scheduler identifies carts with items older than 24 hours and no completed order.
2. Orchestrator enqueues `write_email_campaign` with context: abandoned SKUs, user name.
3. ai-microservice generates personalised recovery email.
4. Human reviews batch; approved emails dispatched via notifications-microservice.

### Task Budget

AI tasks are budget-capped at 500,000 LLM units/month across all flipflop AI operations. ai-microservice tracks token usage per `applicationId`; orchestrator enforces monthly budget ceiling before enqueueing new tasks.

### Orchestrator Task Routing

All AI tasks for flipflop-service are routed via `business-orchestrator` `ProjectCoordinator`:

| Task Type | Target Service | Priority |
| --------- | ------------- | -------- |
| `write_product_description` | ai-microservice:3380 | High |
| `generate_seo_meta` | ai-microservice:3380 | High |
| `analyze_competitor_prices` | ai-microservice:3380 | Medium |
| `write_email_campaign` | ai-microservice:3380 | Medium |
| `audit_product_images` | flipflop product-service | Low |

**Current State:** Email campaign and abandoned cart tasks are in TASKS.md backlog. No campaigns sent yet. AI task routing via orchestrator not yet active. Budget tracking not implemented.

---

## Orchestrator Integration

> ⚠️ Human-editable

### MCP Paths

| Resource | Path |
| -------- | ---- |
| Service root | `flipflop-service/` |
| Spec (this file) | `flipflop-service/SPEC.md` |
| Current state | `flipflop-service/STATE.json` |
| Task backlog | `flipflop-service/TASKS.md` |
| Business constraints | `flipflop-service/BUSINESS.md` |
| System integrations | `flipflop-service/SYSTEM.md` |
| Prisma schema | `flipflop-service/prisma/schema.prisma` |

### Required Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection via database-server:5432 |
| `REDIS_URL` | Redis for sessions and cart |
| `AUTH_SERVICE_URL` | auth-microservice:3370 |
| `PAYMENTS_SERVICE_URL` | payments-microservice:3468 |
| `CATALOG_SERVICE_URL` | catalog-microservice:3200 |
| `WAREHOUSE_SERVICE_URL` | warehouse-microservice:3201 |
| `ORDERS_SERVICE_URL` | orders-microservice:3203 |
| `AI_SERVICE_URL` | ai-microservice:3380 |
| `NOTIFICATIONS_SERVICE_URL` | notifications-microservice:3368 |
| `LOGGING_SERVICE_URL` | logging-microservice:3367 |

### Worker Task Routing

`business-orchestrator` `ProjectCoordinator` reads this SPEC.md before each cycle to understand:

1. Which task types are valid for flipflop-service.
2. Which modules have active blockers (T0a, T0b, T0c in Module 3).
3. Anti-chaos rules: never modify prices or cancel orders without human approval.
4. Monthly AI budget ceiling: 500,000 LLM units.

Orchestrator dispatches tasks by posting to `ai-microservice:3380/tasks` with payload `{ applicationId: "flipflop", taskType, context }`. Results are written back to `STATE.json` and TASKS.md completed section.
