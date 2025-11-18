/**
 * Warehouse Module
 */

import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { PrismaModule, AuthModule } from '@e-commerce/shared';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}

