"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const admin_settings_entity_1 = require("../entities/admin-settings.entity");
let SettingsService = class SettingsService {
    constructor(adminSettingsRepository, configService) {
        this.adminSettingsRepository = adminSettingsRepository;
        this.configService = configService;
        this.adminSettingsCache = null;
        this.cacheExpiry = 0;
        this.CACHE_TTL = 60000;
    }
    async onModuleInit() {
        await this.loadAdminSettings();
    }
    async loadAdminSettings() {
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
        }
        catch (error) {
            return null;
        }
    }
    async invalidateCache() {
        this.adminSettingsCache = null;
        this.cacheExpiry = 0;
        await this.loadAdminSettings();
    }
    async getMergedSettings(userId, userPreferences) {
        const merged = {};
        const envVars = process.env;
        Object.keys(envVars).forEach((key) => {
            merged[key] = envVars[key];
        });
        if (userPreferences?.envOverrides) {
            Object.assign(merged, userPreferences.envOverrides);
        }
        const adminSettings = await this.loadAdminSettings();
        if (adminSettings?.envOverrides) {
            Object.assign(merged, adminSettings.envOverrides);
        }
        return merged;
    }
    async getSetting(key, userId, userPreferences) {
        const merged = await this.getMergedSettings(userId, userPreferences);
        return merged[key];
    }
    async getAdminSettings() {
        let settings = await this.adminSettingsRepository.findOne({
            where: {},
            order: { createdAt: 'ASC' },
        });
        if (!settings) {
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
    async updateAdminSettings(updates) {
        let settings = await this.getAdminSettings();
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
        const saved = await this.adminSettingsRepository.save(settings);
        await this.invalidateCache();
        return saved;
    }
    async getUserPreferences(userId, userRepository) {
        const user = await userRepository.findOne({
            where: { id: userId },
            select: ['id', 'preferences'],
        });
        return user?.preferences || {};
    }
    async updateUserPreferences(userId, preferences, userRepository) {
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }
        user.preferences = { ...(user.preferences || {}), ...preferences };
        return await userRepository.save(user);
    }
    getConfigurableVariables() {
        return [
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
            {
                key: 'DEFAULT_CURRENCY',
                description: 'Default currency code',
                category: 'business',
                editable: true,
                sensitive: false,
            },
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
    getNonEditableVariables() {
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
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(admin_settings_entity_1.AdminSettings)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map