/**
 * Products Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProductsController, CategoriesController, AdminProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { WarehouseService } from './warehouse.service';
import { PrismaModule, AuthModule, LoggerModule, RedisModule } from '@flipflop/shared';
import * as https from 'https';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LoggerModule,
    RedisModule,
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 10000,
        maxRedirects: 5,
        httpsAgent:
          configService.get('NODE_ENV') === 'development'
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ProductsController, CategoriesController, AdminProductsController],
  providers: [ProductsService, WarehouseService],
  exports: [ProductsService, WarehouseService],
})
export class ProductsModule {}

