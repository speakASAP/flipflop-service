/**
 * Warehouse Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WarehouseModule } from './warehouse/warehouse.module';
import { HealthModule, PrismaModule, LoggerModule, AuthModule, ClientsModule } from '@flipflop/shared';
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
    WarehouseModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

