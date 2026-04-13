import { Module } from '@nestjs/common';
import { PrismaModule, LoggerModule, AuthModule } from '@flipflop/shared';
import { MarketingController } from './marketing.controller';
import { DiscountService } from './discount.service';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  controllers: [MarketingController],
  providers: [DiscountService],
  exports: [DiscountService],
})
export class MarketingModule {}
