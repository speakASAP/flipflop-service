/**
 * Cart Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from './cart/cart.module';
import { HealthModule } from '@flipflop/shared';
import { PrismaModule } from '@flipflop/shared';
import { LoggerModule } from '@flipflop/shared';
import { AuthModule } from '@flipflop/shared';
import { ClientsModule } from '@flipflop/shared';
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
    ClientsModule,
    HealthModule,
    CartModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

