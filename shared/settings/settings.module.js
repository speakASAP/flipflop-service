"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const settings_service_1 = require("./settings.service");
const enhanced_config_service_1 = require("./enhanced-config.service");
const admin_settings_entity_1 = require("../entities/admin-settings.entity");
let SettingsModule = class SettingsModule {
};
exports.SettingsModule = SettingsModule;
exports.SettingsModule = SettingsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([admin_settings_entity_1.AdminSettings]),
            config_1.ConfigModule,
        ],
        providers: [
            settings_service_1.SettingsService,
            {
                provide: enhanced_config_service_1.EnhancedConfigService,
                useFactory: (configService, settingsService) => {
                    return new enhanced_config_service_1.EnhancedConfigService(configService, settingsService);
                },
                inject: [config_1.ConfigService, settings_service_1.SettingsService],
            },
        ],
        exports: [settings_service_1.SettingsService, enhanced_config_service_1.EnhancedConfigService],
    })
], SettingsModule);
//# sourceMappingURL=settings.module.js.map