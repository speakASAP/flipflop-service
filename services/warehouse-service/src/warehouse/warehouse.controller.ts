/**
 * Warehouse Controller
 * Handles HTTP requests for warehouse operations
 */

import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard, ApiResponse } from '@e-commerce/shared';

@Controller('warehouse')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('inventory/:productId')
  async getInventory(@Param('productId') productId: string) {
    const inventory = await this.warehouseService.getInventory(productId);
    return ApiResponse.success(inventory);
  }

  @Put('inventory/:productId')
  async updateInventory(
    @Param('productId') productId: string,
    @Body() body: { variantId?: string; quantity: number },
  ) {
    const result = await this.warehouseService.updateInventory(
      productId,
      body.variantId,
      body.quantity,
    );
    return ApiResponse.success(result);
  }

  @Post('reserve')
  async reserveItems(@Body() body: { items: Array<{ productId: string; variantId?: string; quantity: number }> }) {
    const result = await this.warehouseService.reserveItems(body.items);
    return ApiResponse.success(result);
  }

  @Post('release')
  async releaseItems(@Body() body: { items: Array<{ productId: string; variantId?: string; quantity: number }> }) {
    const result = await this.warehouseService.releaseItems(body.items);
    return ApiResponse.success(result);
  }

  @Get('stock-levels')
  async getStockLevels() {
    const levels = await this.warehouseService.getStockLevels();
    return ApiResponse.success(levels);
  }
}

