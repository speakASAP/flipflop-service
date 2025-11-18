/**
 * Cart Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from './cart/cart.module';
import { HealthModule } from '@e-commerce/shared';
import { PrismaModule } from '@e-commerce/shared';
import { LoggerModule } from '@e-commerce/shared';
import { AuthModule } from '@e-commerce/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    LoggerModule,
    AuthModule,
    HealthModule,
    CartModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

