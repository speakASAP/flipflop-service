/**
 * Health Check Module
 * Provides health check functionality for services
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../database/prisma.module';
import { HealthService } from './health.service';
import { ResilienceModule } from '../resilience/resilience.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    HttpModule,
    ResilienceModule, // Import resilience module for optional dependencies
  ],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
