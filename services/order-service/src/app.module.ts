/**
 * Order Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from './orders/orders.module';
import { HealthModule, PrismaModule, LoggerModule, AuthModule, ClientsModule } from '@flipflop/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    ClientsModule,
    HealthModule,
    OrdersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

