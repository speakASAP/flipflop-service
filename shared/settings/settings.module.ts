/**
 * Settings Module
 * Provides SettingsService and EnhancedConfigService
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { EnhancedConfigService } from './enhanced-config.service';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    SettingsService,
    {
      provide: EnhancedConfigService,
      useFactory: (configService: ConfigService, settingsService: SettingsService) => {
        return new EnhancedConfigService(configService, settingsService);
      },
      inject: [ConfigService, SettingsService],
    },
  ],
  exports: [SettingsService, EnhancedConfigService],
})
export class SettingsModule {}
