"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponseUtil = void 0;
class ApiResponseUtil {
    static success(data, meta) {
        return {
            success: true,
            data,
            meta,
        };
    }
    static error(code, message, details) {
        return {
            success: false,
            error: {
                code,
                message,
                details,
            },
        };
    }
    static paginated(data, total, page, limit) {
        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total,
            },
        };
    }
}
exports.ApiResponseUtil = ApiResponseUtil;
//# sourceMappingURL=api-response.util.js.map