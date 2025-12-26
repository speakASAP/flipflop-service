# flipflop-service Central Microservices Integration Plan

**Date**: 2024-12-20  
**Status**: ✅ **IMPLEMENTED** (100% Complete)  
**Target**: Complete integration with central microservices

## Overview

This plan addresses three remaining integration issues in flipflop-service:

1. CartService doesn't check stock from warehouse-microservice during checkout
2. WarehouseService still uses local database instead of WarehouseClientService
3. StockEventsSubscriber handlers incomplete (TODO comments)

---

## Issue 1: CartService Stock Check Integration

### Current State

- `CartService` uses local `Product` table for stock checks
- No integration with warehouse-microservice
- Stock availability not verified from central source

### Target State

- `CartService` checks stock via `WarehouseClientService` before adding items
- Stock verification during checkout process
- Real-time stock availability from warehouse-microservice

### Implementation Steps

#### Step 1.1: Update CartModule

**File**: `flipflop-service/services/cart-service/src/cart/cart.module.ts`

**Changes**:

- Import `ClientsModule` (already global, but ensure it's available)
- Add `WarehouseClientService` dependency

**Action**:

```typescript
// Add to imports if ClientsModule is not global in this context
imports: [PrismaModule, AuthModule, ClientsModule],
```

#### Step 1.2: Update CartService Constructor

**File**: `flipflop-service/services/cart-service/src/cart/cart.service.ts`

**Changes**:

- Add `WarehouseClientService` to constructor
- Add `CatalogClientService` to constructor (to get catalogProductId)

**Action**:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly logger: LoggerService,
  private readonly warehouseClient: WarehouseClientService,
  private readonly catalogClient: CatalogClientService,
) {}
```

#### Step 1.3: Update addToCart Method

**File**: `flipflop-service/services/cart-service/src/cart/cart.service.ts`

**Changes**:

- After verifying product exists locally, check stock from warehouse-microservice
- Use `catalogProductId` from local Product to query warehouse
- If `catalogProductId` is null, fall back to local stock check (backward compatibility)
- Verify available stock >= requested quantity

**Logic**:

1. Get product from local DB (for price, name, etc.)
2. If product has `catalogProductId`:
   - Fetch stock from warehouse-microservice using `catalogProductId`
   - Verify `available >= quantity`
   - Throw `BadRequestException` if insufficient stock
3. If no `catalogProductId`:
   - Use local `product.stockQuantity` (legacy mode)
   - Verify `stockQuantity >= quantity`

#### Step 1.4: Add Stock Check Helper Method

**File**: `flipflop-service/services/cart-service/src/cart/cart.service.ts`

**New Method**:

```typescript
private async checkStockAvailability(productId: string, catalogProductId: string | null, quantity: number): Promise<void> {
  if (catalogProductId) {
    // Use central warehouse-microservice
    const totalAvailable = await this.warehouseClient.getTotalAvailable(catalogProductId);
    if (totalAvailable < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
    }
  } else {
    // Fallback to local stock (legacy mode)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, trackInventory: true },
    });
    
    if (product?.trackInventory && (product.stockQuantity || 0) < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}`);
    }
  }
}
```

#### Step 1.5: Update updateCartItem Method

**File**: `flipflop-service/services/cart-service/src/cart/cart.service.ts`

**Changes**:

- Add stock check when updating quantity
- Use same logic as `addToCart`

#### Step 1.6: Update getCart Method (Optional Enhancement)

**File**: `flipflop-service/services/cart-service/src/cart/cart.service.ts`

**Changes**:

- Optionally enrich cart items with real-time stock from warehouse-microservice
- This is optional but improves UX

---

## Issue 2: WarehouseService Central Integration

### Current State

- `WarehouseService` manages stock in local `Product` and `ProductVariant` tables
- No integration with warehouse-microservice
- Stock operations are duplicated

### Target State

- `WarehouseService` delegates all stock operations to `WarehouseClientService`
- Local Product table updated only for display/cache purposes
- Central warehouse-microservice is source of truth

### Implementation Steps

#### Step 2.1: Update WarehouseModule

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.module.ts`

**Changes**:

- Import `ClientsModule` (ensure WarehouseClientService is available)

**Action**:

```typescript
imports: [PrismaModule, AuthModule, ClientsModule],
```

#### Step 2.2: Update WarehouseService Constructor

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- Add `WarehouseClientService` to constructor
- Add `CatalogClientService` to constructor (to map productId to catalogProductId)

**Action**:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly logger: LoggerService,
  private readonly warehouseClient: WarehouseClientService,
  private readonly catalogClient: CatalogClientService,
) {}
```

#### Step 2.3: Refactor getInventory Method

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- If product has `catalogProductId`, fetch from warehouse-microservice
- Fallback to local data if no `catalogProductId`

**Logic**:

1. Get product from local DB
2. If `catalogProductId` exists:
   - Fetch stock from warehouse-microservice
   - Return warehouse data
3. Else:
   - Return local stock data (legacy mode)

#### Step 2.4: Add Missing Methods to WarehouseClientService

**File**: `flipflop-service/shared/clients/warehouse-client.service.ts`

**Changes**:

- Add `setStock()` method
- Add `incrementStock()` method
- Add `decrementStock()` method
- Add `unreserveStock()` method

**New Methods**:

```typescript
async setStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/stock/set`, {
        productId,
        warehouseId,
        quantity,
        reason,
      })
    );
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to set stock: ${error.message}`, error.stack, 'WarehouseClient');
    throw new HttpException(`Failed to set stock: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
}

async incrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/stock/increment`, {
        productId,
        warehouseId,
        quantity,
        reason,
      })
    );
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to increment stock: ${error.message}`, error.stack, 'WarehouseClient');
    throw new HttpException(`Failed to increment stock: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
}

async decrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/stock/decrement`, {
        productId,
        warehouseId,
        quantity,
        reason,
      })
    );
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to decrement stock: ${error.message}`, error.stack, 'WarehouseClient');
    throw new HttpException(`Failed to decrement stock: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
}

async unreserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/api/stock/unreserve`, {
        productId,
        warehouseId,
        quantity,
        orderId,
      })
    );
    return response.data.data;
  } catch (error) {
    this.logger.error(`Failed to unreserve stock: ${error.message}`, error.stack, 'WarehouseClient');
    throw new HttpException(`Failed to unreserve stock: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
}
```

#### Step 2.5: Refactor updateInventory Method

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- Delegate to warehouse-microservice if `catalogProductId` exists
- Use `setStock()` method to set absolute quantity
- Update local Product table for cache/display only

**Logic**:

1. Get product from local DB
2. If `catalogProductId` exists:
   - Get default warehouse ID (from config or first warehouse)
   - Call `warehouseClient.setStock(catalogProductId, warehouseId, quantity)`
   - Update local Product.stockQuantity for cache
3. Else:
   - Update local stock only (legacy mode)
   - Log warning about missing catalogProductId

#### Step 2.6: Refactor reserveItems Method

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- Use `WarehouseClientService.reserveStock()` for products with `catalogProductId`
- Fallback to local reservation for legacy products

**Logic**:

1. For each item:
   - Get product from local DB
   - If `catalogProductId` exists:
     - Call `warehouseClient.reserveStock(catalogProductId, warehouseId, quantity, orderId)`
     - Update local Product.stockQuantity for cache
   - Else:
     - Use local reservation (legacy mode)

**Note**: Need to determine `warehouseId`. Options:

- Use default warehouse ID from config
- Get from warehouse-microservice API
- Pass as parameter

#### Step 2.7: Refactor releaseItems Method

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- Similar to reserveItems, but release stock
- Check if warehouse-microservice has release endpoint

**Note**: Use `unreserveStock()` method from WarehouseClientService to release reserved stock.

#### Step 2.8: Refactor getStockLevels Method

**File**: `flipflop-service/services/warehouse-service/src/warehouse/warehouse.service.ts`

**Changes**:

- Fetch from warehouse-microservice for products with `catalogProductId`
- Merge with local data for products without `catalogProductId`

---

## Issue 3: StockEventsSubscriber Handler Implementation

### Current State

- `StockEventsSubscriber` receives events but doesn't update local database
- `updateProductStock()` and `handleOutOfStock()` have TODO comments
- Local Product table not updated with real-time stock changes

### Target State

- Stock events update local Product table
- Products matched by `catalogProductId` (event.productId is catalog product ID)
- Real-time stock sync working

### Implementation Steps

#### Step 3.1: Update RabbitMQModule

**File**: `flipflop-service/shared/rabbitmq/rabbitmq.module.ts`

**Changes**:

- Import `PrismaModule` to provide PrismaService

**Action**:

```typescript
imports: [LoggerModule, PrismaModule],
```

#### Step 3.2: Update StockEventsSubscriber Constructor

**File**: `flipflop-service/shared/rabbitmq/stock-events.subscriber.ts`

**Changes**:

- Add `PrismaService` to constructor

**Action**:

```typescript
constructor(
  private readonly logger: LoggerService,
  private readonly prisma: PrismaService,
) {}
```

#### Step 3.3: Implement updateProductStock Method

**File**: `flipflop-service/shared/rabbitmq/stock-events.subscriber.ts`

**Changes**:

- Update all Product records where `catalogProductId === productId`
- Fetch total available stock from warehouse-microservice (event.available is per-warehouse)
- Update `stockQuantity` field with total available
- Log updates

**Note**: The event contains `available` for a specific warehouse. We need the total available across all warehouses, so we'll fetch it from warehouse-microservice.

**Implementation**:

```typescript
private async updateProductStock(productId: string, available: number) {
  try {
    // Note: event.available is for a specific warehouse
    // We need total available across all warehouses
    // For now, we'll fetch the total from warehouse-microservice
    // In the future, we could aggregate per-warehouse events
    
    // Fetch total available stock from warehouse-microservice
    let totalAvailable = available; // Fallback to event value
    
    try {
      // Import WarehouseClientService if not already available
      // For now, we'll use the event's available value
      // TODO: Inject WarehouseClientService to get accurate total
      // const warehouseClient = ...;
      // totalAvailable = await warehouseClient.getTotalAvailable(productId);
    } catch (error) {
      // If we can't fetch total, use event value (per-warehouse)
      this.logger.warn(
        `Could not fetch total stock for ${productId}, using event value: ${available}`,
        'StockEventsSubscriber'
      );
    }

    // Find all products linked to this catalog product
    const products = await this.prisma.product.updateMany({
      where: {
        catalogProductId: productId,
        trackInventory: true,
      },
      data: {
        stockQuantity: totalAvailable,
        updatedAt: new Date(),
      },
    });

    if (products.count > 0) {
      this.logger.log(
        `Updated ${products.count} product(s) stock to ${totalAvailable} for catalog product ${productId}`,
        'StockEventsSubscriber'
      );
    } else {
      this.logger.warn(
        `No products found with catalogProductId ${productId}`,
        'StockEventsSubscriber'
      );
    }
  } catch (error: any) {
    this.logger.error(
      `Failed to update product stock: ${error.message}`,
      error.stack,
      'StockEventsSubscriber'
    );
  }
}
```

**Alternative Approach** (Simpler, but less accurate):

- Use event.available directly (per-warehouse stock)
- This is simpler but may not reflect total stock if product is in multiple warehouses
- Acceptable for MVP, can be improved later

#### Step 3.4: Implement handleOutOfStock Method

**File**: `flipflop-service/shared/rabbitmq/stock-events.subscriber.ts`

**Changes**:

- Set stockQuantity to 0
- Optionally set isActive to false (or keep active but show out of stock)

**Implementation**:

```typescript
private async handleOutOfStock(productId: string) {
  try {
    const products = await this.prisma.product.updateMany({
      where: {
        catalogProductId: productId,
        trackInventory: true,
      },
      data: {
        stockQuantity: 0,
        updatedAt: new Date(),
        // Optionally: isActive: false, // Uncomment if you want to hide out-of-stock products
      },
    });

    if (products.count > 0) {
      this.logger.warn(
        `Marked ${products.count} product(s) as out of stock for catalog product ${productId}`,
        'StockEventsSubscriber'
      );
    }
  } catch (error: any) {
    this.logger.error(
      `Failed to handle out of stock: ${error.message}`,
      error.stack,
      'StockEventsSubscriber'
    );
  }
}
```

#### Step 3.5: Update handleStockEvent Method

**File**: `flipflop-service/shared/rabbitmq/stock-events.subscriber.ts`

**Changes**:

- Event structure is flat: `{ type, productId, warehouseId, quantity?, available?, threshold?, timestamp }`
- Extract `productId` and `available` directly from event
- Handle different event types correctly

**Event Format** (from warehouse-microservice):

- `stock.updated`: `{ type: 'stock.updated', productId, warehouseId, quantity, available, timestamp }`
- `stock.low`: `{ type: 'stock.low', productId, warehouseId, available, threshold, timestamp }`
- `stock.out`: `{ type: 'stock.out', productId, warehouseId, timestamp }`

**Updated Implementation**:

```typescript
private async handleStockEvent(event: any) {
  const { type, productId, available } = event;

  this.logger.log(`Received stock event: ${type} for product ${productId}, available: ${available}`, 'StockEventsSubscriber');

  switch (type) {
    case 'stock.updated':
      await this.updateProductStock(productId, available || 0);
      break;
    case 'stock.low':
      this.logger.warn(`Low stock alert for product ${productId}: ${available} available`, 'StockEventsSubscriber');
      // Optionally update stock quantity
      if (available !== undefined) {
        await this.updateProductStock(productId, available);
      }
      break;
    case 'stock.out':
      await this.handleOutOfStock(productId);
      break;
    default:
      this.logger.warn(`Unknown stock event type: ${type}`, 'StockEventsSubscriber');
  }
}
```

---

## Implementation Checklist

### Issue 1: CartService Stock Check

- [x] 1.1: Update CartModule to import ClientsModule *(Not needed - ClientsModule is @Global())*
- [x] 1.2: Add WarehouseClientService and CatalogClientService to CartService constructor ✅
- [x] 1.3: Add checkStockAvailability helper method ✅
- [x] 1.4: Update addToCart to check stock from warehouse-microservice ✅
- [x] 1.5: Update updateCartItem to check stock ✅
- [ ] 1.6: (Optional) Enhance getCart with real-time stock

**✅ Note**: `checkStockAvailability` now falls back to local stock for products without `catalogProductId` (legacy mode) as per plan Step 1.3.

### Issue 2: WarehouseService Central Integration

- [x] 2.1: Update WarehouseModule to import ClientsModule *(Not needed - ClientsModule is @Global())*
- [x] 2.2: Add WarehouseClientService and CatalogClientService to WarehouseService constructor ✅
- [x] 2.3: Refactor getInventory to use warehouse-microservice ✅
- [x] 2.4: Add missing methods to WarehouseClientService (setStock, incrementStock, decrementStock, unreserveStock) ✅
- [x] 2.5: Refactor updateInventory to delegate to warehouse-microservice ✅
- [x] 2.6: Refactor reserveItems to use warehouse-microservice ✅
- [x] 2.7: Refactor releaseItems to use warehouse-microservice ✅
- [x] 2.8: Refactor getStockLevels to fetch from warehouse-microservice ✅

### Issue 3: StockEventsSubscriber Handlers

- [x] 3.1: Update RabbitMQModule to import PrismaModule ✅
- [x] 3.2: Add PrismaService to StockEventsSubscriber constructor ✅
- [x] 3.3: Implement updateProductStock method ✅
- [x] 3.4: Implement handleOutOfStock method ✅
- [x] 3.5: Verify event structure and update handleStockEvent if needed ✅

---

## Testing Requirements

### Unit Tests

- Test CartService stock checks with/without catalogProductId
- Test WarehouseService delegation to WarehouseClientService
- Test StockEventsSubscriber event handling

### Integration Tests

- Test cart operations with real warehouse-microservice
- Test stock reservation flow
- Test stock event propagation

### Manual Testing

- Add item to cart with insufficient stock
- Verify stock updates in real-time via RabbitMQ
- Test checkout with stock verification

---

## Notes and Considerations

1. **Backward Compatibility**: All changes maintain backward compatibility with products that don't have `catalogProductId` (legacy mode).

2. **Error Handling**: All warehouse-microservice calls should have proper error handling and fallback to local data if service is unavailable.

3. **Performance**: Consider caching stock data to reduce API calls. However, for checkout, always use real-time data.

4. **Warehouse ID**: Need to determine how to get warehouseId for stock operations. Options:
   - Default warehouse from config
   - First available warehouse from warehouse-microservice
   - Pass as parameter

5. **Event Format**: Verify the exact format of stock events from warehouse-microservice to ensure correct parsing.

6. **Migration Path**: Products without `catalogProductId` will continue to work with local stock management until migrated.

---

## Dependencies

- `ClientsModule` must be available (already global)
- `PrismaModule` must be available
- `WarehouseClientService` must be configured with correct URL
- RabbitMQ connection must be working
- Products should have `catalogProductId` populated for full integration

---

## Success Criteria

1. ✅ CartService checks stock from warehouse-microservice before adding items
2. ✅ WarehouseService delegates all stock operations to warehouse-microservice
3. ✅ StockEventsSubscriber updates local Product table when stock changes
4. ✅ All operations maintain backward compatibility with legacy products
5. ✅ Error handling prevents service failures from breaking functionality

---

## Implementation Status Summary

**Overall Status**: ✅ **100% COMPLETE**

### ✅ Fully Implemented

- **Issue 1**: CartService Stock Check (100%)
  - All core functionality implemented
  - ✅ `checkStockAvailability` falls back to local stock for products without `catalogProductId` (legacy mode)
- **Issue 2**: WarehouseService Central Integration (100%)
- **Issue 3**: StockEventsSubscriber Handlers (100%)

### 📝 Optional Enhancements

- [ ] (Optional) Enhance `getCart` method with real-time stock from warehouse-microservice
