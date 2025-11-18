import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminSettings } from '../entities/admin-settings.entity';
import { User } from '../entities/user.entity';
export interface MergedSettings {
    [key: string]: string | number | boolean | undefined;
}
export declare class SettingsService implements OnModuleInit {
    private adminSettingsRepository;
    private configService;
    private adminSettingsCache;
    private cacheExpiry;
    private readonly CACHE_TTL;
    constructor(adminSettingsRepository: Repository<AdminSettings>, configService: ConfigService);
    onModuleInit(): Promise<void>;
    private loadAdminSettings;
    invalidateCache(): Promise<void>;
    getMergedSettings(userId?: string, userPreferences?: Record<string, any>): Promise<MergedSettings>;
    getSetting(key: string, userId?: string, userPreferences?: Record<string, any>): Promise<string | undefined>;
    getAdminSettings(): Promise<AdminSettings>;
    updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings>;
    getUserPreferences(userId: string, userRepository: Repository<User>): Promise<Record<string, any>>;
    updateUserPreferences(userId: string, preferences: Record<string, any>, userRepository: Repository<User>): Promise<User>;
    getConfigurableVariables(): Array<{
        key: string;
        description: string;
        category: 'system' | 'integration' | 'business' | 'feature';
        editable: boolean;
        sensitive: boolean;
    }>;
    getNonEditableVariables(): string[];
}
