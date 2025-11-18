/**
 * API Gateway App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule, LoggerModule, AuthModule } from '@e-commerce/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    LoggerModule,
    AuthModule,
    HealthModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

