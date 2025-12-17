/**
 * Payment Module
 * Provides PaymentService for external payment microservice integration
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { ResilienceModule } from '../resilience/resilience.module';
import { LoggerModule } from '../logger/logger.module';
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
    ResilienceModule,
    LoggerModule,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

