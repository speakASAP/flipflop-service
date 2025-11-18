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
export declare function validateEnvVars(definitions: EnvVarDefinition[], env?: Record<string, string | undefined>): ValidationResult;
export declare const validators: {
    jwtSecret: (value: string) => boolean;
    dbHost: (value: string) => boolean;
    email: (value: string) => boolean;
    urlWithProtocol: (value: string) => boolean;
};
export declare const commonDefinitions: EnvVarDefinition[];
export declare const databaseDefinitions: EnvVarDefinition[];
export declare const jwtDefinitions: EnvVarDefinition[];
export declare function validateAndLog(definitions: EnvVarDefinition[], serviceName: string, env?: Record<string, string | undefined>): void;
