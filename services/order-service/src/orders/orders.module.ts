/**
 * Orders Module
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdersController, PaymentController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { OrdersInternalController } from './orders-internal.controller';
import { OrdersService } from './orders.service';
import { ReviewSolicitationScheduler } from './review-solicitation.scheduler';
import {
  PrismaModule,
  AuthModule,
  PaymentModule,
  NotificationModule,
  LoggerModule,
  ClientsModule,
  InventoryEventsPublisher,
  CustomerEventsPublisher,
} from '@flipflop/shared';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [
    HttpModule,
    LoggerModule,
    PrismaModule,
    AuthModule,
    PaymentModule,
    NotificationModule,
    ClientsModule,
    MarketingModule,
  ],
  controllers: [
    OrdersController,
    PaymentController,
    AdminOrdersController,
    AdminInventoryController,
    OrdersInternalController,
  ],
  providers: [
    OrdersService,
    InventoryEventsPublisher,
    CustomerEventsPublisher,
    ReviewSolicitationScheduler,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}

