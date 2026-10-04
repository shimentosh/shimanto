import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

/** Known Prisma errors → HTTP. Everything unknown becomes a 500 without leaking internals. */
const PRISMA_STATUS: Record<string, [HttpStatus, string]> = {
  P2002: [HttpStatus.CONFLICT, 'A record with this value already exists'],
  P2003: [HttpStatus.CONFLICT, 'Related record constraint failed'],
  P2025: [HttpStatus.NOT_FOUND, 'Record not found'],
};

/** One consistent error shape for every endpoint: `{ statusCode, error, message, issues?, requestId }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      body = typeof response === 'string' ? { message: response } : { ...(response as object) };
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      PRISMA_STATUS[exception.code]
    ) {
      const [prismaStatus, message] = PRISMA_STATUS[exception.code]!;
      status = prismaStatus;
      body = { message };
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({
      statusCode: status,
      ...body,
      // Always the standard reason phrase ("Bad Request", "Unauthorized"…), whatever the exception set.
      error: STATUS_CODES[status] ?? 'Error',
      requestId: req.id,
    });
  }
}
