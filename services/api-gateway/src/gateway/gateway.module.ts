/**
 * Gateway Module
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { AuthModule } from '@flipflop/shared';
import * as https from 'https';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV') || 'development';
        return {
          timeout: 30000,
          maxRedirects: 5,
          httpsAgent:
            nodeEnv === 'development'
              ? new https.Agent({ rejectUnauthorized: false })
              : undefined,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}

