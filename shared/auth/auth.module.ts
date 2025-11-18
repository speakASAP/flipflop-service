/**
 * Auth Module
 * Provides AuthService for authentication via auth-microservice
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { LoggerModule } from '../logger/logger.module';
import { ResilienceModule } from '../resilience/resilience.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    LoggerModule,
    ResilienceModule,
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

