/**
 * Settings Module
 * Provides SettingsService and EnhancedConfigService
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { EnhancedConfigService } from './enhanced-config.service';
import { AdminSettings } from '../entities/admin-settings.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminSettings]),
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
