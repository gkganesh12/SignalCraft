import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorMessage =
      typeof responseBody === 'string'
        ? responseBody
        : (responseBody as { message?: string })?.message ?? 'Unexpected error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Http Status: ${status} Error Message: ${errorMessage}`,
        exception instanceof Error ? exception.stack : '',
      );
    } else {
      this.logger.warn(
        `Http Status: ${status} Error Message: ${errorMessage} Path: ${request.url}`
      );
    }

    response.status(status).json({
      error: {
        message: errorMessage,
        statusCode: status,
        path: request.url,
        method: request.method,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
