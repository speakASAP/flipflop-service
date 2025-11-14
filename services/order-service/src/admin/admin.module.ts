/**
 * Admin Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CompanySettings } from '../../../../shared/entities/company-settings.entity';
import { AdminSettings } from '../../../../shared/entities/admin-settings.entity';
import { SettingsModule } from '../../../../shared/settings/settings.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanySettings, AdminSettings]),
    HttpModule,
    SettingsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
