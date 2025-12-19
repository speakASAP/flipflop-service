/**
 * Orders Module
 */

import { Module } from '@nestjs/common';
import { OrdersController, PaymentController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule, AuthModule, PaymentModule, NotificationModule, LoggerModule } from '@flipflop/shared';

@Module({
  imports: [
    LoggerModule,
    PrismaModule,
    AuthModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [OrdersController, PaymentController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

