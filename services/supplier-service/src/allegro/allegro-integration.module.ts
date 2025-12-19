/**
 * Allegro Integration Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AllegroIntegrationController } from './allegro-integration.controller';
import { AllegroIntegrationService } from './allegro-integration.service';
import { LoggerModule, AuthModule } from '@flipflop/shared';

@Module({
  imports: [ConfigModule, LoggerModule, AuthModule],
  controllers: [AllegroIntegrationController],
  providers: [AllegroIntegrationService],
  exports: [AllegroIntegrationService],
})
export class AllegroIntegrationModule {}

