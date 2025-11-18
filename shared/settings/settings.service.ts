/**
 * Settings Service
 * Merges environment variables from .env, user preferences, and admin settings
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminSettings } from '../entities/admin-settings.entity';
import { User } from '../entities/user.entity';

export interface MergedSettings {
  [key: string]: string | number | boolean | undefined;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private adminSettingsCache: AdminSettings | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private _adminSettingsRepository: Repository<AdminSettings> | null = null;
  private _dataSource: DataSource | null = null;

  constructor(
    private configService: ConfigService,
  ) {}

  /**
   * Get DataSource from TypeORM connection manager
   */
  private getDataSource(): DataSource | null {
    if (this._dataSource && this._dataSource.isInitialized) {
      return this._dataSource;
    }

    try {
      // Get DataSource from TypeORM's connection manager
      // TypeORM stores connections in a global connection manager
      const { getConnectionManager } = require('typeorm');
      const connectionManager = getConnectionManager();
      
      // Try to get the default connection
      let connection: DataSource | null = null;
      
      // First try to get by name 'default'
      try {
        connection = connectionManager.get('default') as DataSource;
      } catch (error) {
        // Default connection not found, try to get any connection
        const connections = connectionManager.connections;
        if (connections && connections.length > 0) {
          connection = connections[0] as DataSource;
        }
      }
      
      if (connection) {
        // Check if connection is initialized/connected
        // In TypeORM, DataSource has isInitialized property
        if (connection.isInitialized !== undefined) {
          if (connection.isInitialized) {
            this._dataSource = connection;
            return this._dataSource;
          }
        } else {
          // Older TypeORM versions use isConnected
          if ((connection as any).isConnected) {
            this._dataSource = connection;
            return this._dataSource;
          }
        }
      }
    } catch (error) {
      // DataSource not available - connection manager not initialized yet
      return null;
    }
    
    return null;
  }

  /**
   * Get repository lazily - creates it if DataSource is available
   */
  private get adminSettingsRepository(): Repository<AdminSettings> | null {
    if (this._adminSettingsRepository) {
      return this._adminSettingsRepository;
    }
    
    const dataSource = this.getDataSource();
    if (dataSource && dataSource.isInitialized) {
      try {
        this._adminSettingsRepository = dataSource.getRepository(AdminSettings);
        return this._adminSettingsRepository;
      } catch (error) {
        // Repository creation failed
        return null;
      }
    }
    
    return null;
  }

  async onModuleInit() {
    // Load admin settings on startup
    // Handle database connection errors gracefully
    try {
      // Try to get DataSource and initialize repository if available
      const dataSource = this.getDataSource();
      if (dataSource) {
        await this.loadAdminSettings();
      } else {
        console.warn('Database connection not available - admin settings will use defaults');
      }
    } catch (error) {
      // If database is not available, log warning but don't fail startup
      console.warn('Could not load admin settings on startup:', error.message);
    }
  }

  /**
   * Load admin settings from database (with caching)
   */
  private async loadAdminSettings(): Promise<AdminSettings | null> {
    if (!this.adminSettingsRepository) {
      return null;
    }

    const now = Date.now();
    if (this.adminSettingsCache && now < this.cacheExpiry) {
      return this.adminSettingsCache;
    }

    try {
      const settings = await this.adminSettingsRepository.findOne({
        where: {},
        order: { createdAt: 'ASC' },
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
    if (adminSettings?.envOverrides) {
      Object.assign(merged, adminSettings.envOverrides);
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
    if (!this.adminSettingsRepository) {
      // Return default settings if repository is not available
      return {
        id: '',
        envOverrides: {},
        features: {},
        business: {},
        integrations: {},
        system: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AdminSettings;
    }

    let settings = await this.adminSettingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    if (!settings) {
      // Create default admin settings
      settings = this.adminSettingsRepository.create({
        envOverrides: {},
        features: {},
        business: {},
        integrations: {},
        system: {},
      });
      settings = await this.adminSettingsRepository.save(settings);
      this.invalidateCache();
    }

    return settings;
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    if (!this.adminSettingsRepository) {
      throw new Error('Database connection not available');
    }

    let settings = await this.getAdminSettings();

    // Merge updates
    if (updates.envOverrides) {
      settings.envOverrides = { ...settings.envOverrides, ...updates.envOverrides };
    }
    if (updates.features) {
      settings.features = { ...settings.features, ...updates.features };
    }
    if (updates.business) {
      settings.business = { ...settings.business, ...updates.business };
    }
    if (updates.integrations) {
      settings.integrations = { ...settings.integrations, ...updates.integrations };
    }
    if (updates.system) {
      settings.system = { ...settings.system, ...updates.system };
    }

    if (!this.adminSettingsRepository) {
      throw new Error('Database connection not available');
    }
    const saved = await this.adminSettingsRepository.save(settings);
    await this.invalidateCache();
    return saved;
  }

  /**
   * Get user preferences (from user entity)
   * Note: This method requires User repository to be passed in
   * For direct access, use the UsersService instead
   */
  async getUserPreferences(userId: string, userRepository: Repository<User>): Promise<Record<string, any>> {
    const user = await userRepository.findOne({
      where: { id: userId },
      select: ['id', 'preferences'],
    });

    return user?.preferences || {};
  }

  /**
   * Update user preferences
   * Note: This method requires User repository to be passed in
   * For direct access, use the UsersService instead
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, any>,
    userRepository: Repository<User>,
  ): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    user.preferences = { ...(user.preferences || {}), ...preferences };
    return await userRepository.save(user);
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
