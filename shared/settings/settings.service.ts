/**
 * Settings Service
 * Merges environment variables from .env, user preferences, and admin settings
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AdminSettings, Prisma } from '@prisma/client';

export interface MergedSettings {
  [key: string]: string | number | boolean | undefined;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private adminSettingsCache: AdminSettings | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Load admin settings on startup
    // Handle database connection errors gracefully
    try {
      await this.loadAdminSettings();
    } catch (error: any) {
      // If database is not available, log warning but don't fail startup
      console.warn('Could not load admin settings on startup:', error.message);
    }
  }

  /**
   * Load admin settings from database (with caching)
   */
  private async loadAdminSettings(): Promise<AdminSettings | null> {
    const now = Date.now();
    if (this.adminSettingsCache && now < this.cacheExpiry) {
      return this.adminSettingsCache;
    }

    try {
      const settings = await this.prisma.adminSettings.findFirst({
        orderBy: { createdAt: 'asc' },
      });

      this.adminSettingsCache = settings;
      this.cacheExpiry = now + this.CACHE_TTL;
      return settings;
    } catch (error) {
      // If table doesn't exist or error, return null
      return null;
    }
  }

  /**
   * Invalidate cache (call after updating settings)
   */
  async invalidateCache(): Promise<void> {
    this.adminSettingsCache = null;
    this.cacheExpiry = 0;
    await this.loadAdminSettings();
  }

  /**
   * Get merged settings for a specific user
   * Priority: Admin Settings > User Preferences > .env
   */
  async getMergedSettings(userId?: string, userPreferences?: Record<string, any>): Promise<MergedSettings> {
    const merged: MergedSettings = {};

    // 1. Start with .env values (lowest priority)
    const envVars = process.env;
    Object.keys(envVars).forEach((key) => {
      merged[key] = envVars[key];
    });

    // 2. Apply user preferences (medium priority)
    if (userPreferences?.envOverrides) {
      Object.assign(merged, userPreferences.envOverrides);
    }

    // 3. Apply admin settings (highest priority)
    const adminSettings = await this.loadAdminSettings();
    if (adminSettings?.envOverrides && typeof adminSettings.envOverrides === 'object') {
      Object.assign(merged, adminSettings.envOverrides as Record<string, any>);
    }

    return merged;
  }

  /**
   * Get a specific setting value
   * Priority: Admin Settings > User Preferences > .env
   */
  async getSetting(
    key: string,
    userId?: string,
    userPreferences?: Record<string, any>,
  ): Promise<string | undefined> {
    const merged = await this.getMergedSettings(userId, userPreferences);
    return merged[key] as string | undefined;
  }

  /**
   * Get admin settings
   */
  async getAdminSettings(): Promise<AdminSettings> {
    let settings = await this.prisma.adminSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!settings) {
      // Create default admin settings
      settings = await this.prisma.adminSettings.create({
        data: {
          envOverrides: {},
          features: {},
          business: {},
          integrations: {},
          system: {},
        },
      });
      await this.invalidateCache();
    }

    return settings;
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(updates: Prisma.AdminSettingsUpdateInput): Promise<AdminSettings> {
    let settings = await this.getAdminSettings();

    // Use Prisma update with merge
    const updated = await this.prisma.adminSettings.update({
      where: { id: settings.id },
      data: updates,
    });

    await this.invalidateCache();
    return updated;
  }

  /**
   * Get user preferences (from user entity)
   * Note: This method requires Prisma to access user
   * For direct access, use the UsersService instead
   */
  async getUserPreferences(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    });

    return (user?.preferences as Record<string, any>) || {};
  }

  /**
   * Update user preferences
   * Note: This method requires Prisma to access user
   * For direct access, use the UsersService instead
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, any>,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const currentPreferences = (user.preferences as Record<string, any>) || {};
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: { ...currentPreferences, ...preferences },
      },
    });

    return updated;
  }

  /**
   * Get list of configurable environment variables (for admin UI)
   */
  getConfigurableVariables(): Array<{
    key: string;
    description: string;
    category: 'system' | 'integration' | 'business' | 'feature';
    editable: boolean;
    sensitive: boolean;
  }> {
    return [
      // System settings
      {
        key: 'CORS_ORIGIN',
        description: 'CORS allowed origin',
        category: 'system',
        editable: true,
        sensitive: false,
      },
      {
        key: 'LOG_LEVEL',
        description: 'Logging level (error/warn/info/debug)',
        category: 'system',
        editable: true,
        sensitive: false,
      },
      // Integration settings
      {
        key: 'PAYU_SANDBOX',
        description: 'Use PayU sandbox mode',
        category: 'integration',
        editable: true,
        sensitive: false,
      },
      {
        key: 'NOTIFICATION_SERVICE_URL',
        description: 'Notification microservice URL',
        category: 'integration',
        editable: true,
        sensitive: false,
      },
      {
        key: 'LOGGING_SERVICE_URL',
        description: 'Logging microservice URL',
        category: 'integration',
        editable: true,
        sensitive: false,
      },
      // Business settings
      {
        key: 'DEFAULT_CURRENCY',
        description: 'Default currency code',
        category: 'business',
        editable: true,
        sensitive: false,
      },
      // Feature flags
      {
        key: 'AI_ASSISTANT_ENABLED',
        description: 'Enable AI shopping assistant',
        category: 'feature',
        editable: true,
        sensitive: false,
      },
      {
        key: 'TELEGRAM_NOTIFICATIONS_ENABLED',
        description: 'Enable Telegram notifications',
        category: 'feature',
        editable: true,
        sensitive: false,
      },
      {
        key: 'WHATSAPP_NOTIFICATIONS_ENABLED',
        description: 'Enable WhatsApp notifications',
        category: 'feature',
        editable: true,
        sensitive: false,
      },
    ];
  }

  /**
   * Get list of non-editable variables (security-sensitive)
   */
  getNonEditableVariables(): string[] {
    return [
      'JWT_SECRET',
      'DB_PASSWORD',
      'PAYU_CLIENT_SECRET',
      'SENDGRID_API_KEY',
      'OPENROUTER_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
      'REDIS_PASSWORD',
    ];
  }
}
