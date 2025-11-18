export interface ILogger {
    error(message: string, metadata?: Record<string, any>): Promise<void>;
    warn(message: string, metadata?: Record<string, any>): Promise<void>;
    info(message: string, metadata?: Record<string, any>): Promise<void>;
    debug(message: string, metadata?: Record<string, any>): Promise<void>;
}
