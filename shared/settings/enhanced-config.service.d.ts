import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
export declare class EnhancedConfigService {
    private readonly configService;
    private readonly settingsService?;
    private currentUserId?;
    private currentUserPreferences?;
    constructor(configService: ConfigService, settingsService?: SettingsService);
    setUserContext(userId: string, preferences?: Record<string, any>): void;
    clearUserContext(): void;
    get<T = any>(key: string, defaultValue?: T): Promise<T>;
    getSync<T = any>(key: string, defaultValue?: T): T;
    private parseValue;
    has(key: string): Promise<boolean>;
    getAll(): Promise<Record<string, any>>;
}
