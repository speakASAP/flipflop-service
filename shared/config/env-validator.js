"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtDefinitions = exports.databaseDefinitions = exports.commonDefinitions = exports.validators = void 0;
exports.validateEnvVars = validateEnvVars;
exports.validateAndLog = validateAndLog;
function validateValue(value, definition) {
    if (definition.required && !value) {
        return {
            valid: false,
            error: `Required environment variable ${definition.name} is not set`,
        };
    }
    if (!value && definition.default !== undefined) {
        return { valid: true };
    }
    if (!value) {
        return { valid: true };
    }
    switch (definition.type) {
        case 'number':
            if (isNaN(Number(value))) {
                return {
                    valid: false,
                    error: `${definition.name} must be a number, got: ${value}`,
                };
            }
            break;
        case 'boolean':
            if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
                return {
                    valid: false,
                    error: `${definition.name} must be a boolean (true/false), got: ${value}`,
                };
            }
            break;
        case 'url':
            try {
                new URL(value);
            }
            catch {
                return {
                    valid: false,
                    error: `${definition.name} must be a valid URL, got: ${value}`,
                };
            }
            break;
        case 'port':
            const port = Number(value);
            if (isNaN(port) || port < 1 || port > 65535) {
                return {
                    valid: false,
                    error: `${definition.name} must be a valid port (1-65535), got: ${value}`,
                };
            }
            break;
    }
    if (definition.validation && !definition.validation(value)) {
        return {
            valid: false,
            error: `${definition.name} failed custom validation`,
        };
    }
    return { valid: true };
}
function checkDependencies(definitions, values) {
    const warnings = [];
    for (const definition of definitions) {
        if (definition.dependencies && definition.dependencies.length > 0) {
            const value = values[definition.name];
            if (value) {
                for (const dep of definition.dependencies) {
                    if (!values[dep]) {
                        warnings.push(`${definition.name} is set but dependency ${dep} is not set`);
                    }
                }
            }
        }
    }
    return warnings;
}
function validateEnvVars(definitions, env = process.env) {
    const errors = [];
    const warnings = [];
    const values = {};
    for (const definition of definitions) {
        const value = env[definition.name];
        values[definition.name] = value;
        const result = validateValue(value, definition);
        if (!result.valid && result.error) {
            if (definition.required) {
                errors.push(result.error);
            }
            else {
                warnings.push(result.error);
            }
        }
    }
    const dependencyWarnings = checkDependencies(definitions, values);
    warnings.push(...dependencyWarnings);
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
exports.validators = {
    jwtSecret: (value) => {
        return value.length >= 32;
    },
    dbHost: (value) => {
        return /^[a-zA-Z0-9.-]+$/.test(value);
    },
    email: (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    urlWithProtocol: (value) => {
        try {
            const url = new URL(value);
            return url.protocol === 'http:' || url.protocol === 'https:';
        }
        catch {
            return false;
        }
    },
};
exports.commonDefinitions = [
    {
        name: 'NODE_ENV',
        required: true,
        type: 'string',
        default: 'development',
        validation: (value) => ['development', 'production', 'test'].includes(value),
        description: 'Node environment (development/production/test)',
    },
    {
        name: 'PORT',
        required: false,
        type: 'port',
        default: '3000',
        description: 'Service port number',
    },
    {
        name: 'SERVICE_NAME',
        required: false,
        type: 'string',
        description: 'Service identifier for logging',
    },
    {
        name: 'LOG_LEVEL',
        required: false,
        type: 'string',
        default: 'info',
        validation: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
        description: 'Logging level (error/warn/info/debug)',
    },
    {
        name: 'LOGGING_SERVICE_URL',
        required: false,
        type: 'url',
        default: 'https://logging.statex.cz',
        description: 'Logging microservice URL (production: https://logging.statex.cz, Docker: http://logging-microservice:3268)',
    },
];
exports.databaseDefinitions = [
    {
        name: 'DB_HOST',
        required: true,
        type: 'string',
        default: 'db-server-postgres',
        validation: exports.validators.dbHost,
        description: 'Database hostname (local dev: localhost via SSH tunnel, Docker: db-server-postgres)',
    },
    {
        name: 'DB_PORT',
        required: true,
        type: 'port',
        default: '5432',
        description: 'Database port number',
    },
    {
        name: 'DB_USER',
        required: true,
        type: 'string',
        description: 'Database username',
    },
    {
        name: 'DB_PASSWORD',
        required: true,
        type: 'string',
        description: 'Database password',
    },
    {
        name: 'DB_NAME',
        required: true,
        type: 'string',
        default: 'ecommerce',
        description: 'Database name',
    },
    {
        name: 'DB_SYNC',
        required: false,
        type: 'boolean',
        default: 'false',
        description: 'Auto-sync database schema (should be false in production)',
    },
];
exports.jwtDefinitions = [
    {
        name: 'JWT_SECRET',
        required: true,
        type: 'string',
        validation: exports.validators.jwtSecret,
        description: 'JWT signing secret (minimum 32 characters)',
    },
    {
        name: 'JWT_EXPIRES_IN',
        required: false,
        type: 'string',
        default: '7d',
        description: 'JWT expiration time (e.g., 7d, 24h)',
    },
];
function validateAndLog(definitions, serviceName, env = process.env) {
    const result = validateEnvVars(definitions, env);
    if (result.errors.length > 0) {
        console.error(`\n❌ Environment variable validation failed for ${serviceName}:`);
        result.errors.forEach((error) => {
            console.error(`  - ${error}`);
        });
        console.error('\nPlease fix the errors above before starting the service.\n');
        process.exit(1);
    }
    if (result.warnings.length > 0) {
        console.warn(`\n⚠️  Environment variable warnings for ${serviceName}:`);
        result.warnings.forEach((warning) => {
            console.warn(`  - ${warning}`);
        });
        console.warn('');
    }
    if (result.valid && result.warnings.length === 0) {
        console.log(`✅ Environment variables validated for ${serviceName}`);
    }
}
//# sourceMappingURL=env-validator.js.map