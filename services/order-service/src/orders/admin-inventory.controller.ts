/**
 * Admin inventory routes (proxied via api-gateway /api/admin/*)
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';
import { OrdersService } from './orders.service';

@Controller('admin/inventory')
@UseGuards(JwtAuthGuard)
export class AdminInventoryController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('low-stock')
  async getLowStock(@Query('threshold') threshold?: string) {
    const payload = await this.ordersService.getLowStockItems(threshold);
    return ApiResponse.success(payload);
  }
}
