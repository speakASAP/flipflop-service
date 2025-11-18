/**
 * Product Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './products/products.module';
import { HealthModule, PrismaModule, LoggerModule, AuthModule } from '@e-commerce/shared';
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
