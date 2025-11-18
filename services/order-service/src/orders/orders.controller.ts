/**
 * Orders Controller
 * Handles HTTP requests for order operations
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard, ApiResponse } from '@e-commerce/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(req.user.id, dto);
    return ApiResponse.success(order);
  }

  @Get()
  async getOrders(@Request() req: any) {
    const orders = await this.ordersService.getUserOrders(req.user.id);
    return ApiResponse.success(orders);
  }

  @Get(':id')
  async getOrder(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.getOrder(req.user.id, id);
    return ApiResponse.success(order);
  }
}

@Controller('payu')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create-payment/:orderId')
  async createPayment(@Request() req: any, @Param('orderId') orderId: string) {
    const payment = await this.ordersService.createPayment(req.user.id, orderId);
    return ApiResponse.success(payment);
  }
}

