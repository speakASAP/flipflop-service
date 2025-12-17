/**
 * Notification Module
 * Provides NotificationService for sending notifications via notifications-microservice
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotificationService } from './notification.service';
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
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
