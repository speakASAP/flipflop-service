import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import {
  AuthModule,
  ClientsModule,
  LoggerModule,
  PricingEventsPublisher,
  PrismaModule,
} from '@flipflop/shared';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [HttpModule, LoggerModule, PrismaModule, ClientsModule, AuthModule],
  controllers: [PricingController],
  providers: [PricingService, PricingEventsPublisher],
  exports: [PricingService],
})
export class PricingModule {}
