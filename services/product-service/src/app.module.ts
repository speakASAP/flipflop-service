/**
 * Product Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { MarketingModule } from './marketing/marketing.module';
import { HealthModule, PrismaModule, LoggerModule, AuthModule } from '@flipflop/shared';
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
    ProductsModule,
    MarketingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
