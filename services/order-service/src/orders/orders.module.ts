/**
 * Orders Module
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminOrdersController, OrdersController, PaymentController } from './orders.controller';
import { OrdersInternalController } from './orders-internal.controller';
import { OrdersService } from './orders.service';
import {
  PrismaModule,
  AuthModule,
  PaymentModule,
  NotificationModule,
  LoggerModule,
  ClientsModule,
} from '@flipflop/shared';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
    PrismaModule,
    AuthModule,
    PaymentModule,
    NotificationModule,
    ClientsModule,
  ],
  controllers: [OrdersController, PaymentController, AdminOrdersController, OrdersInternalController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

