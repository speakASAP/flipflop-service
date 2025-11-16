/**
 * Products Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { Product } from '../../../../shared/entities/product.entity';
import { Category } from '../../../../shared/entities/category.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CsvImportService } from './csv-import.service';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    PassportModule,
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  controllers: [ProductsController, ImagesController],
  providers: [ProductsService, CsvImportService, ImagesService, JwtStrategy],
  exports: [ProductsService, CsvImportService, ImagesService],
})
export class ProductsModule {}
