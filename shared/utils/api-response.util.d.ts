import { ApiResponse } from '../types/common.types';
export declare class ApiResponseUtil {
    static success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T>;
    static error(code: string, message: string, details?: any): ApiResponse;
    static paginated<T>(data: T[], total: number, page: number, limit: number): ApiResponse<T[]>;
}
