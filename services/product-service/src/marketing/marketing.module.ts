import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { MarketingController } from './marketing.controller';
import { EmailCampaignService } from './email-campaign.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { PrismaModule, LoggerModule, NotificationModule } from '@flipflop/shared';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    LoggerModule,
    NotificationModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        httpsAgent:
          configService.get('NODE_ENV') === 'development'
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MarketingController],
  providers: [EmailCampaignService, AbandonedCartService],
})
export class MarketingModule {}
