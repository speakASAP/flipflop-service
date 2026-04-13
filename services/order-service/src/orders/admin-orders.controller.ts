/**
 * Admin order analytics and management routes (proxied via api-gateway /api/admin/*)
 */

import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('competitor-analysis')
  async getCompetitorAnalysis() {
    const result = await this.ordersService.getCompetitorAnalysis();
    return ApiResponse.success(result);
  }

  @Get('checkout-funnel')
  async getCheckoutFunnel(@Query('days') days?: string) {
    const parsed = days !== undefined && days !== '' ? parseInt(days, 10) : NaN;
    const since =
      Number.isFinite(parsed) && parsed > 0
        ? new Date(Date.now() - parsed * 24 * 60 * 60 * 1000)
        : undefined;
    const funnel = await this.ordersService.getCheckoutFunnel(since);
    return ApiResponse.success(funnel);
  }

  @Get('analytics/revenue-mom')
  async getRevenueMom(@Query('months') months?: string) {
    const rows = await this.ordersService.getRevenueMonthOverMonth(months);
    return ApiResponse.success(rows);
  }

  @Get('analytics/conversion-rate')
  async getConversionRate(@Query('days') days?: string) {
    const payload = await this.ordersService.getConversionRate(days);
    return ApiResponse.success(payload);
  }

  @Get('analytics/sla')
  async getFulfillmentSla(@Query('days') days?: string) {
    const payload = await this.ordersService.getFulfillmentSla(days);
    return ApiResponse.success(payload);
  }

  @Put('orders/:id/status')
  async putAdminOrderStatus(
    @Param('id') id: string,
    @Body() body: UpdateAdminOrderStatusDto,
  ) {
    const order = await this.ordersService.updateAdminOrderStatus(id, body);
    return ApiResponse.success(order);
  }
}
