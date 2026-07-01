import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

type HttpLikeException = {
  getStatus?: () => number;
  getResponse?: () => unknown;
  message?: string;
  name?: string;
};

@Catch()
export class HttpExceptionNormalizerFilter implements ExceptionFilter {
  catch(exception: HttpLikeException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = this.resolveStatus(exception);
    const payload = this.resolvePayload(exception, status, request?.url);

    response.status(status).json(payload);
  }

  private resolveStatus(exception: HttpLikeException): number {
    if (typeof exception?.getStatus === 'function') {
      const status = Number(exception.getStatus());
      if (Number.isInteger(status) && status >= 400 && status <= 599) {
        return status;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolvePayload(exception: HttpLikeException, status: number, path?: string) {
    const response = typeof exception?.getResponse === 'function'
      ? exception.getResponse()
      : undefined;

    if (response && typeof response === 'object') {
      return {
        ...(response as Record<string, unknown>),
        statusCode: (response as Record<string, unknown>).statusCode ?? status,
        path,
      };
    }

    return {
      statusCode: status,
      message: typeof response === 'string'
        ? response
        : exception?.message || (status === 500 ? 'Internal server error' : 'Request failed'),
      error: exception?.name || undefined,
      path,
    };
  }
}
