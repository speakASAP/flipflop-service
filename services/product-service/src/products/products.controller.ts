/**
 * Products Controller
 * Handles HTTP requests for product operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard, ApiResponse } from '@e-commerce/shared';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() query: any) {
    const result = await this.productsService.getProducts(query);
    return ApiResponse.success(result);
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.productsService.getProduct(id);
    return ApiResponse.success(product);
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getCategories() {
    const categories = await this.productsService.getCategories();
    return ApiResponse.success(categories);
  }

  @Get(':id')
  async getCategory(@Param('id') id: string) {
    const category = await this.productsService.getCategory(id);
    return ApiResponse.success(category);
  }
}

@Controller('products')
@UseGuards(JwtAuthGuard)
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async createProduct(@Request() req: any, @Body() dto: any) {
    // TODO: Add admin check
    const product = await this.productsService.createProduct(dto);
    return ApiResponse.success(product);
  }

  @Put(':id')
  async updateProduct(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    // TODO: Add admin check
    const product = await this.productsService.updateProduct(id, dto);
    return ApiResponse.success(product);
  }

  @Delete(':id')
  async deleteProduct(@Request() req: any, @Param('id') id: string) {
    // TODO: Add admin check
    const result = await this.productsService.deleteProduct(id);
    return ApiResponse.success(result);
  }
}

