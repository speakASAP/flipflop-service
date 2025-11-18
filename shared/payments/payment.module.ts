/**
 * Payment Module
 * Provides PaymentService for external payment microservice integration
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { ResilienceModule } from '../resilience/resilience.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    ResilienceModule,
    LoggerModule,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

