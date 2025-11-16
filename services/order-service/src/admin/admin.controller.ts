/**
 * Admin Controller
 * Handles admin operations
 */

import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Param,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { ApiResponseUtil } from '../../../../shared/utils/api-response.util';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus, PaymentStatus } from '../../../../shared/entities/order.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly httpService: HttpService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Check if user is admin
   */
  private async checkAdmin(userId: string): Promise<void> {
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://e-commerce-user-service:3004';
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/users/${userId}`, {
          headers: { Authorization: `Bearer ${userId}` },
        }),
      );
      const user = response.data.data;
      if (!user || !user.isAdmin) {
        throw new ForbiddenException('Admin access required');
      }
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // If user service unavailable, allow access (for development)
      console.warn('User service unavailable, allowing admin access');
    }
  }

  /**
   * Get company settings
   */
  @Get('company-settings')
  async getCompanySettings(@Request() req) {
    await this.checkAdmin(req.user.id);
    const settings = await this.adminService.getCompanySettings();
    return ApiResponseUtil.success(settings);
  }

  /**
   * Update company settings
   */
  @Put('company-settings')
  async updateCompanySettings(
    @Request() req,
    @Body() updateDto: UpdateCompanySettingsDto,
  ) {
    await this.checkAdmin(req.user.id);
    const settings = await this.adminService.updateCompanySettings(updateDto);
    return ApiResponseUtil.success(settings);
  }

  /**
   * Get admin settings (environment variable overrides)
   */
  @Get('settings')
  async getAdminSettings(@Request() req) {
    await this.checkAdmin(req.user.id);
    const settings = await this.adminService.getAdminSettings();
    return ApiResponseUtil.success(settings);
  }

  /**
   * Update admin settings (environment variable overrides)
   */
  @Put('settings')
  async updateAdminSettings(
    @Request() req,
    @Body() updates: any,
  ) {
    await this.checkAdmin(req.user.id);
    const settings = await this.adminService.updateAdminSettings(updates);
    return ApiResponseUtil.success(settings);
  }

  /**
   * Get list of configurable environment variables
   */
  @Get('settings/available')
  async getConfigurableVariables(@Request() req) {
    await this.checkAdmin(req.user.id);
    const variables = this.adminService.getConfigurableVariables();
    const nonEditable = [
      'JWT_SECRET',
      'DB_PASSWORD',
      'PAYU_CLIENT_SECRET',
      'SENDGRID_API_KEY',
      'OPENROUTER_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
      'REDIS_PASSWORD',
    ];
    return ApiResponseUtil.success({
      configurable: variables,
      nonEditable,
    });
  }

  /**
   * Get all orders (admin only)
   */
  @Get('orders')
  async getAllOrders(
    @Request() req,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    await this.checkAdmin(req.user.id);
    const orders = await this.ordersService.findAll();
    
    // Apply filters
    let filteredOrders = orders;
    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }
    if (paymentStatus) {
      filteredOrders = filteredOrders.filter((o) => o.paymentStatus === paymentStatus);
    }

    // Pagination
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 20;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedOrders = filteredOrders.slice(start, end);

    return ApiResponseUtil.paginated(
      paginatedOrders,
      filteredOrders.length,
      pageNum,
      limitNum,
    );
  }

  /**
   * Update order status (admin only)
   */
  @Put('orders/:id/status')
  async updateOrderStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status?: OrderStatus; paymentStatus?: PaymentStatus; notes?: string },
  ) {
    await this.checkAdmin(req.user.id);
    
    let order = await this.ordersService.findOne(id);
    
    if (body.status) {
      order = await this.ordersService.updateStatus(id, body.status, body.notes, req.user.id);
    }
    
    if (body.paymentStatus) {
      order = await this.ordersService.updatePaymentStatus(id, body.paymentStatus);
    }

    return ApiResponseUtil.success(order);
  }
}
