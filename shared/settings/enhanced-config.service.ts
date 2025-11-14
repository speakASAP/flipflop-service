/**
 * Enhanced Config Service
 * Wraps NestJS ConfigService and integrates with SettingsService
 * Provides unified access to configuration from .env, user preferences, and admin settings
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

@Injectable()
export class EnhancedConfigService {
  private currentUserId?: string;
  private currentUserPreferences?: Record<string, any>;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly settingsService?: SettingsService,
  ) {}

  /**
   * Set current user context (for user-specific settings)
   */
  setUserContext(userId: string, preferences?: Record<string, any>): void {
    this.currentUserId = userId;
    this.currentUserPreferences = preferences;
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.currentUserId = undefined;
    this.currentUserPreferences = undefined;
  }

  /**
   * Get configuration value
   * Priority: Admin Settings > User Preferences > .env
   */
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    // If settings service is available, use merged settings
    if (this.settingsService) {
      const value = await this.settingsService.getSetting(
        key,
        this.currentUserId,
        this.currentUserPreferences,
      );
      if (value !== undefined) {
        return this.parseValue(value) as T;
      }
    }

    // Fallback to ConfigService (reads from .env)
    return this.configService.get<T>(key, defaultValue);
  }

  /**
   * Get configuration value (synchronous, uses cache)
   * For use in non-async contexts, falls back to .env only
   */
  getSync<T = any>(key: string, defaultValue?: T): T {
    // In synchronous context, can only use .env
    // Settings service requires async database access
    return this.configService.get<T>(key, defaultValue);
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): string | number | boolean {
    // Try to parse as boolean
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return num;
    }

    // Return as string
    return value;
  }

  /**
   * Check if key exists in any configuration source
   */
  async has(key: string): Promise<boolean> {
    if (this.settingsService) {
      const value = await this.settingsService.getSetting(
        key,
        this.currentUserId,
        this.currentUserPreferences,
      );
      if (value !== undefined) {
        return true;
      }
    }
    return this.configService.get(key) !== undefined;
  }

  /**
   * Get all configuration (merged)
   */
  async getAll(): Promise<Record<string, any>> {
    if (this.settingsService) {
      return await this.settingsService.getMergedSettings(
        this.currentUserId,
        this.currentUserPreferences,
      );
    }
    return process.env;
  }
}

