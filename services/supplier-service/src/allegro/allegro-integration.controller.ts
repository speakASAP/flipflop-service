/**
 * Allegro Integration Controller
 * API endpoints for syncing products from Allegro
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AllegroIntegrationService } from './allegro-integration.service';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';

@Controller('allegro')
@UseGuards(JwtAuthGuard)
export class AllegroIntegrationController {
  constructor(
    private readonly allegroService: AllegroIntegrationService,
  ) {}

  @Get('products')
  async getAllegroProducts(@Query() query: any) {
    const result = await this.allegroService.getAllegroProducts({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      active: query.active !== undefined ? query.active === 'true' : undefined,
    });
    return ApiResponse.success(result);
  }

  @Get('products/:code')
  async getAllegroProductByCode(@Param('code') code: string) {
    const product = await this.allegroService.getAllegroProductByCode(code);
    if (!product) {
      return ApiResponse.error('PRODUCT_NOT_FOUND', 'Product not found in Allegro database');
    }
    return ApiResponse.success(product);
  }

  @Get('warehouse')
  async getWarehouseData(@Query('codes') codes?: string) {
    const productCodes = codes ? codes.split(',') : undefined;
    const data = await this.allegroService.getWarehouseData(productCodes);
    return ApiResponse.success(data);
  }

  @Post('sync')
  async syncProducts(@Body() body: { productCodes?: string[]; syncAll?: boolean }) {
    const result = await this.allegroService.syncProductsToflipflop(
      body.productCodes,
      body.syncAll,
    );
    return ApiResponse.success(result);
  }
}

