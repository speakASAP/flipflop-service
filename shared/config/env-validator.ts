/**
 * Environment Variable Validator
 * Validates environment variables on service startup
 */

export interface EnvVarDefinition {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'port';
  default?: string | number | boolean;
  validation?: (value: string) => boolean;
  description?: string;
  dependencies?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variable value
 */
function validateValue(
  value: string | undefined,
  definition: EnvVarDefinition,
): { valid: boolean; error?: string } {
  // Check if required
  if (definition.required && !value) {
    return {
      valid: false,
      error: `Required environment variable ${definition.name} is not set`,
    };
  }

  // Use default if not set and not required
  if (!value && definition.default !== undefined) {
    return { valid: true };
  }

  // If not set and not required, it's valid
  if (!value) {
    return { valid: true };
  }

  // Type validation
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
      } catch {
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

  // Custom validation
  if (definition.validation && !definition.validation(value)) {
    return {
      valid: false,
      error: `${definition.name} failed custom validation`,
    };
  }

  return { valid: true };
}

/**
 * Check dependencies
 */
function checkDependencies(
  definitions: EnvVarDefinition[],
  values: Record<string, string | undefined>,
): string[] {
  const warnings: string[] = [];

  for (const definition of definitions) {
    if (definition.dependencies && definition.dependencies.length > 0) {
      const value = values[definition.name];
      if (value) {
        for (const dep of definition.dependencies) {
          if (!values[dep]) {
            warnings.push(
              `${definition.name} is set but dependency ${dep} is not set`,
            );
          }
        }
      }
    }
  }

  return warnings;
}

/**
 * Validate environment variables
 */
export function validateEnvVars(
  definitions: EnvVarDefinition[],
  env: Record<string, string | undefined> = process.env,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const values: Record<string, string | undefined> = {};

  // Validate each variable
  for (const definition of definitions) {
    const value = env[definition.name];
    values[definition.name] = value;

    const result = validateValue(value, definition);
    if (!result.valid && result.error) {
      if (definition.required) {
        errors.push(result.error);
      } else {
        warnings.push(result.error);
      }
    }
  }

  // Check dependencies
  const dependencyWarnings = checkDependencies(definitions, values);
  warnings.push(...dependencyWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Common validation functions
 */
export const validators = {
  /**
   * Validate JWT secret is strong enough
   */
  jwtSecret: (value: string): boolean => {
    return value.length >= 32;
  },

  /**
   * Validate database host
   */
  dbHost: (value: string): boolean => {
    // Allow hostname, IP, or container name
    return /^[a-zA-Z0-9.-]+$/.test(value);
  },

  /**
   * Validate email
   */
  email: (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  /**
   * Validate URL with protocol
   */
  urlWithProtocol: (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  },
};

/**
 * Common environment variable definitions
 */
export const commonDefinitions: EnvVarDefinition[] = [
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
    validation: (value) =>
      ['error', 'warn', 'info', 'debug'].includes(value),
    description: 'Logging level (error/warn/info/debug)',
  },
  {
    name: 'LOGGING_SERVICE_URL',
    required: false,
    type: 'url' as const,
    default: 'https://logging.statex.cz',
    description: 'Logging microservice URL (production: https://logging.statex.cz, Docker: http://logging-microservice:${PORT:-3367}, port configured in logging-microservice/.env)',
  },
  {
    name: 'AUTH_SERVICE_URL',
    required: false,
    type: 'url' as const,
    default: 'https://auth.statex.cz',
    description: 'Authentication microservice URL (production: https://auth.statex.cz, Docker: http://auth-microservice:${PORT:-3370}, port configured in auth-microservice/.env)',
  },
  {
    name: 'NOTIFICATION_SERVICE_URL',
    required: false,
    type: 'url' as const,
    default: 'https://notifications.statex.cz',
    description: 'Notification microservice URL (production: https://notifications.statex.cz, Docker: http://notifications-microservice:<port>)',
  },
];

/**
 * Database environment variable definitions
 */
export const databaseDefinitions: EnvVarDefinition[] = [
  {
    name: 'DB_HOST',
    required: true,
    type: 'string',
    default: 'db-server-postgres',
    validation: validators.dbHost,
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

/**
 * JWT environment variable definitions
 */
export const jwtDefinitions: EnvVarDefinition[] = [
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'string',
    validation: validators.jwtSecret,
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

/**
 * Validate and log results
 */
export function validateAndLog(
  definitions: EnvVarDefinition[],
  serviceName: string,
  env: Record<string, string | undefined> = process.env,
): void {
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
