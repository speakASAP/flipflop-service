interface LoggerOptions {
    serviceName?: string;
    enableLocalLogging?: boolean;
    logDir?: string;
}
interface LogMetadata {
    [key: string]: any;
}
export declare class Logger {
    private loggingServiceUrl;
    private logLevel;
    private timestampFormat;
    private serviceName;
    private enableLocalLogging;
    private logDir;
    private levels;
    private currentLevel;
    constructor(options?: LoggerOptions);
    private formatTimestamp;
    private formatTimestampLocal;
    private captureStackTrace;
    private sendToLoggingService;
    private sendToLoggingServiceAsync;
    private writeToLocalFile;
    private log;
    error(message: string, metadata?: LogMetadata): Promise<void>;
    warn(message: string, metadata?: LogMetadata): Promise<void>;
    info(message: string, metadata?: LogMetadata): Promise<void>;
    debug(message: string, metadata?: LogMetadata): Promise<void>;
}
declare const logger: Logger;
export default logger;
