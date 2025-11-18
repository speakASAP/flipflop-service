"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const logger_util_1 = require("./logger.util");
let LoggerService = class LoggerService {
    setContext(context) {
        this.context = context;
    }
    async error(message, traceOrMetadata, context) {
        const metadata = {};
        if (typeof traceOrMetadata === 'object' && traceOrMetadata !== null) {
            Object.assign(metadata, traceOrMetadata);
        }
        else if (traceOrMetadata) {
            metadata.trace = traceOrMetadata;
        }
        if (context || this.context)
            metadata.context = context || this.context;
        await logger_util_1.default.error(message, metadata);
    }
    async warn(message, contextOrMetadata) {
        const metadata = {};
        if (typeof contextOrMetadata === 'object' && contextOrMetadata !== null) {
            Object.assign(metadata, contextOrMetadata);
        }
        else if (contextOrMetadata) {
            metadata.context = contextOrMetadata;
        }
        if (this.context)
            metadata.context = this.context;
        await logger_util_1.default.warn(message, metadata);
    }
    async log(message, contextOrMetadata) {
        const metadata = {};
        if (typeof contextOrMetadata === 'object' && contextOrMetadata !== null) {
            Object.assign(metadata, contextOrMetadata);
        }
        else if (contextOrMetadata) {
            metadata.context = contextOrMetadata;
        }
        if (this.context)
            metadata.context = this.context;
        await logger_util_1.default.info(message, metadata);
    }
    async info(message, metadata) {
        const logMetadata = metadata || {};
        if (this.context)
            logMetadata.context = this.context;
        await logger_util_1.default.info(message, logMetadata);
    }
    async debug(message, metadata) {
        const logMetadata = metadata || {};
        if (this.context)
            logMetadata.context = this.context;
        await logger_util_1.default.debug(message, logMetadata);
    }
    async verbose(message, context) {
        const metadata = {};
        if (context || this.context)
            metadata.context = context || this.context;
        await this.debug(message, metadata);
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)()
], LoggerService);
//# sourceMappingURL=logger.service.js.map