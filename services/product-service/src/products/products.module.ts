/**
 * Products Module
 */

import { Module } from '@nestjs/common';
import { ProductsController, CategoriesController, AdminProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule, AuthModule } from '@e-commerce/shared';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProductsController, CategoriesController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

