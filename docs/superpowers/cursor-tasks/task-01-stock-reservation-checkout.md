# task-01 — Stock reservation + payment settlement (order-service)

**Parent spec:** `business-orchestrator/docs/agents/AGENT12_STOCK_RESERVATION.md` (TASK-P2-08)

## Context

- **Stock of record:** `warehouse-microservice` (HTTP from `flipflop-service/shared/clients/warehouse-client.service.ts`).
- **flipflop `warehouse-service`:** exposes `POST /warehouse/reserve` and `POST /warehouse/release` (JWT) as a BFF over the same client; **no schema changes** required there for this task.
- **Semantics:** `reserveStock` increases `reserved` and lowers `available`. `decrementStock` requires `available >= quantity`. Therefore on **paid** webhook: **`unreserveStock` then `decrementStock`** per line (release hold, then reduce on-hand).
- **Order id for reservations:** use `order.orderNumber` everywhere so webhooks and cron match `warehouse-microservice` movement `reference`.

## What to implement (if not already present)

1. **`flipflop-service/services/order-service/src/orders/orders.service.ts`**
   - After `prisma.order.create` in `createOrder`, call reservation for each line with `catalogProductId` via `this.warehouseClient.reserveStock` (rollback partial reserves on failure, then delete order).
   - On payment initiation failure (`catch` around `createPayment`, and `!paymentResult.success`): `unreserveOrderLines` then delete order.
   - `handlePaymentResult` for `completed`: idempotent return if `paymentStatus === paid`; then `unreserveStock` per line (warn on error), then `decrementStock` (error log, non-blocking for order confirmation).
   - `handlePaymentResult` for `failed`: set `paymentStatus: failed`, `status: cancelled`, then `unreserveOrderLines`.
   - Stale unpaid cleanup: hourly `setInterval` in `OnModuleInit` / clear in `OnModuleDestroy` calling `cancelStaleUnpaidOrders` (orders `pending` payment + `pending` status, `createdAt` older than `STALE_UNPAID_ORDER_HOURS` default 24).

2. **Private helpers** on the same service: `reserveOrderLines`, `unreserveOrderLines`, `cancelStaleUnpaidOrders` as above.

3. **`flipflop-service/.env.example`**
   - Key `STALE_UNPAID_ORDER_HOURS=` (optional; default 24).

4. **`flipflop-service/services/warehouse-service`**
   - No code changes unless internal auth is added later; reserve/release already delegate to `WarehouseClientService`.

## Verify

```bash
cd /home/ssf/Documents/Github/flipflop-service/services/order-service && npx tsc --noEmit
cd /home/ssf/Documents/Github/flipflop-service/services/order-service && npm run build
```

Then run **AGENT12V** checklist: `business-orchestrator/docs/agents/AGENT12V_STOCK_RESERVATION_VALIDATE.md`.
