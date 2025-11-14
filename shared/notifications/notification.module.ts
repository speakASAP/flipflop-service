/**
 * Notification Module
 * Provides NotificationService for sending notifications via notification-microservice
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { NotificationService } from './notification.service';
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
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
