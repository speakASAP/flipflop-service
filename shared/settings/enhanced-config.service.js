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
exports.EnhancedConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const settings_service_1 = require("./settings.service");
let EnhancedConfigService = class EnhancedConfigService {
    constructor(configService, settingsService) {
        this.configService = configService;
        this.settingsService = settingsService;
    }
    setUserContext(userId, preferences) {
        this.currentUserId = userId;
        this.currentUserPreferences = preferences;
    }
    clearUserContext() {
        this.currentUserId = undefined;
        this.currentUserPreferences = undefined;
    }
    async get(key, defaultValue) {
        if (this.settingsService) {
            const value = await this.settingsService.getSetting(key, this.currentUserId, this.currentUserPreferences);
            if (value !== undefined) {
                return this.parseValue(value);
            }
        }
        return this.configService.get(key, defaultValue);
    }
    getSync(key, defaultValue) {
        return this.configService.get(key, defaultValue);
    }
    parseValue(value) {
        if (value === 'true' || value === '1')
            return true;
        if (value === 'false' || value === '0')
            return false;
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== '') {
            return num;
        }
        return value;
    }
    async has(key) {
        if (this.settingsService) {
            const value = await this.settingsService.getSetting(key, this.currentUserId, this.currentUserPreferences);
            if (value !== undefined) {
                return true;
            }
        }
        return this.configService.get(key) !== undefined;
    }
    async getAll() {
        if (this.settingsService) {
            return await this.settingsService.getMergedSettings(this.currentUserId, this.currentUserPreferences);
        }
        return process.env;
    }
};
exports.EnhancedConfigService = EnhancedConfigService;
exports.EnhancedConfigService = EnhancedConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [config_1.ConfigService,
        settings_service_1.SettingsService])
], EnhancedConfigService);
//# sourceMappingURL=enhanced-config.service.js.map