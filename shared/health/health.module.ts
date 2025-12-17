/**
 * Health Check Module
 * Provides health check functionality for services
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../database/prisma.module';
import { HealthService } from './health.service';
import { ResilienceModule } from '../resilience/resilience.module';
import https from 'https';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV') || 'development';
        const httpsAgent = new https.Agent({
          rejectUnauthorized: nodeEnv === 'production',
        });
        return {
          timeout: 10000,
          maxRedirects: 5,
          httpsAgent,
        };
      },
      inject: [ConfigService],
    }),
    ResilienceModule, // Import resilience module for optional dependencies
  ],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
