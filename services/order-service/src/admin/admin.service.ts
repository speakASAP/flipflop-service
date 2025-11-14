/**
 * Admin Service
 * Handles admin operations including company settings
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from '../../../../shared/entities/company-settings.entity';
import { AdminSettings } from '../../../../shared/entities/admin-settings.entity';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { SettingsService } from '../../../../shared/settings/settings.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(CompanySettings)
    private companySettingsRepository: Repository<CompanySettings>,
    @InjectRepository(AdminSettings)
    private adminSettingsRepository: Repository<AdminSettings>,
    private settingsService: SettingsService,
    private logger: LoggerService,
  ) {}

  /**
   * Get company settings (singleton - only one record)
   */
  async getCompanySettings(): Promise<CompanySettings> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = this.companySettingsRepository.create({
        name: 'FlipFlop.cz',
        address: 'Czech Republic',
        country: 'Česká republika',
        ico: '12345678',
        dic: 'CZ12345678',
        phone: '+420 123 456 789',
        email: 'info@flipflop.cz',
        website: 'https://flipflop.cz',
      });
      settings = await this.companySettingsRepository.save(settings);
      this.logger.log('Default company settings created', { settingsId: settings.id });
    }

    return settings;
  }

  /**
   * Update company settings
   */
  async updateCompanySettings(
    updateDto: UpdateCompanySettingsDto,
  ): Promise<CompanySettings> {
    let settings = await this.companySettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      // Create if doesn't exist
      settings = this.companySettingsRepository.create(updateDto);
    } else {
      // Update existing
      Object.assign(settings, updateDto);
    }

    const saved = await this.companySettingsRepository.save(settings);

    this.logger.log('Company settings updated', {
      settingsId: saved.id,
      updatedFields: Object.keys(updateDto),
    });

    return saved;
  }

  /**
   * Get admin settings (environment variable overrides)
   */
  async getAdminSettings(): Promise<AdminSettings> {
    return await this.settingsService.getAdminSettings();
  }

  /**
   * Update admin settings (environment variable overrides)
   */
  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const saved = await this.settingsService.updateAdminSettings(updates);

    this.logger.log('Admin settings updated', {
      settingsId: saved.id,
      updatedFields: Object.keys(updates),
    });

    return saved;
  }

  /**
   * Get list of configurable variables
   */
  getConfigurableVariables() {
    return this.settingsService.getConfigurableVariables();
  }
}
