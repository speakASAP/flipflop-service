/**
 * Health Check Module
 * Provides health check functionality for services
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HealthService } from './health.service';
import { ResilienceModule } from '../resilience/resilience.module';

@Module({
  imports: [
    TypeOrmModule,
    HttpModule,
    ResilienceModule, // Import resilience module for optional dependencies
  ],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
