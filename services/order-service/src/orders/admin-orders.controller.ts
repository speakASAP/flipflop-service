/**
 * Admin order analytics and management routes (proxied via api-gateway /api/admin/*)
 */

import { Body, Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
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

  /**
   * GET admin/analytics/sla — JSON includes slaTargetHours, avgFulfilmentHours, pctMeetingSla.
   */
  @Get('analytics/sla')
  async getFulfillmentSla(@Query('days') days?: string) {
    const payload = await this.ordersService.getFulfillmentSla(days);
    return ApiResponse.success(payload);
  }

  @Get('retention/review-requests')
  async getReviewRequests(@Query('days') days?: string) {
    const parsed = days !== undefined && days !== '' ? parseInt(days, 10) : NaN;
    const d = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    const payload = await this.ordersService.getAdminReviewRequests(d);
    return ApiResponse.success(payload);
  }

  @Get('retention/loyalty')
  async getLoyaltyLeaderboard(@Query('limit') limit?: string) {
    const payload = await this.ordersService.getAdminLoyaltyAccounts(limit);
    return ApiResponse.success(payload);
  }

  /** Repeat buyers: confirmed orders in window; next purchase via ai-microservice (cheap). */
  @Get('retention/repeat-buyers')
  async getRepeatBuyers(
    @Query('minOrders') minOrders?: string,
    @Query('days') days?: string,
    @Req() req?: Request,
  ) {
    const raw = req?.headers?.authorization;
    const authorizationHeader =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    const payload = await this.ordersService.getRepeatBuyers(
      minOrders,
      days,
      authorizationHeader,
    );
    return ApiResponse.success(payload);
  }

  /** Dead stock: stock > 0, no confirmed order line in the last N days; AI markdown via ai-microservice (cheap). */
  @Get('inventory/dead-stock')
  async getDeadStock(@Query('days') days?: string, @Req() req?: Request) {
    const raw = req?.headers?.authorization;
    const authorizationHeader =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    const payload = await this.ordersService.getDeadStockItems(days, authorizationHeader);
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
