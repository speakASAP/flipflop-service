/**
 * Supplier Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AllegroIntegrationModule } from './allegro/allegro-integration.module';
import { LoggerModule, AuthModule } from '@flipflop/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    LoggerModule,
    AuthModule,
    AllegroIntegrationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

