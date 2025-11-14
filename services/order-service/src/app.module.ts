/**
 * Order Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../../shared/database/database.module';
import { LoggerModule } from '../../../shared/logger/logger.module';
import { SettingsModule } from '../../../shared/settings/settings.module';
import { HealthModule } from '../../../shared/health/health.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PayuModule } from './payu/payu.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    LoggerModule,
    SettingsModule,
    HealthModule,
    CartModule,
    OrdersModule,
    PayuModule,
    InvoicesModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
