/**
 * Products Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CsvImportService } from './csv-import.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ApiResponseUtil } from '../../../../shared/utils/api-response.util';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private csvImportService: CsvImportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return ApiResponseUtil.success(product);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    const result = await this.productsService.findAll(query);
    return ApiResponseUtil.paginated(
      result.products,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return ApiResponseUtil.success(product);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return ApiResponseUtil.success(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return ApiResponseUtil.success({ message: 'Product deleted' });
  }

  /**
   * Preview CSV file
   */
  @Post('import/preview')
  @UseGuards(AuthGuard('jwt'))
  async previewCsv(@Body() body: { csvContent: string }) {
    const preview = this.csvImportService.previewCsv(body.csvContent);
    return ApiResponseUtil.success(preview);
  }

  /**
   * Import products from CSV
   */
  @Post('import')
  @UseGuards(AuthGuard('jwt'))
  async importCsv(
    @Body()
    body: {
      csvContent: string;
      fieldMapping: any;
      defaultProfitMargin?: number;
      updateExisting?: boolean;
      skipErrors?: boolean;
    },
  ) {
    const result = await this.csvImportService.importProducts(body.csvContent, {
      fieldMapping: body.fieldMapping,
      defaultProfitMargin: body.defaultProfitMargin,
      updateExisting: body.updateExisting ?? false,
      skipErrors: body.skipErrors ?? true,
    });
    return ApiResponseUtil.success(result);
  }
}

