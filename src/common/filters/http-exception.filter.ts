import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, Inject, Optional } from '@nestjs/common';
import { Response, Request } from 'express';
import { MonitoringService } from '../monitoring/sentry.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(
    @Optional() @Inject(MonitoringService) private readonly monitoring?: MonitoringService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException
      ? (exception.getResponse() as any)?.message || exception.message
      : 'Internal server error';

    // Report 500+ errors to Sentry
    if (status >= 500 && this.monitoring) {
      this.monitoring.captureException(
        exception instanceof Error ? exception : new Error(String(message)),
        { url: request.url, method: request.method, status, body: request.body },
      );
    }

    this.logger.error(
      `${request.method} ${request.url} ${status} — ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
