/**
 * Admin inventory routes (proxied via api-gateway /api/admin/*)
 */

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';
import { OrdersService } from './orders.service';
import { CreateSupplierDeliveryDto } from './dto/create-supplier-delivery.dto';

@Controller('admin/inventory')
@UseGuards(JwtAuthGuard)
export class AdminInventoryController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('low-stock')
  async getLowStock(@Query('threshold') threshold?: string) {
    const payload = await this.ordersService.getLowStockItems(threshold);
    return ApiResponse.success(payload);
  }

  @Get('supplier-performance')
  async getSupplierPerformance() {
    const payload = await this.ordersService.getSupplierPerformance();
    return ApiResponse.success(payload);
  }

  @Post('supplier-delivery')
  async postSupplierDelivery(@Body() body: CreateSupplierDeliveryDto) {
    const row = await this.ordersService.createSupplierDelivery(body);
    return ApiResponse.success(row);
  }
}
