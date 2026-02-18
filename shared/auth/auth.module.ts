/**
 * Auth Module
 * Provides AuthService for authentication via auth-microservice
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { LoggerModule } from '../logger/logger.module';
import { ResilienceModule } from '../resilience/resilience.module';
import https from 'https';

@Module({
  imports: [
    ConfigModule,
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
    LoggerModule,
    ResilienceModule,
  ],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

