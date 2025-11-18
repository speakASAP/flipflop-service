export type FallbackStrategy = 'queue' | 'local-storage' | 'degraded' | 'log-only';
export interface FallbackOptions {
    strategy?: FallbackStrategy;
    queuePath?: string;
    storagePath?: string;
}
export declare class FallbackService {
    private queueDir;
    private storageDir;
    constructor();
    handleNotificationFallback(data: any, options?: FallbackOptions): Promise<{
        success: boolean;
        message: string;
    }>;
    handleLoggingFallback(data: any, options?: FallbackOptions): Promise<{
        success: boolean;
        message: string;
    }>;
    private queueNotification;
    private storeNotification;
    private logNotification;
    private degradedNotification;
    private storeLog;
    private logToConsole;
    processQueue(): Promise<number>;
}
