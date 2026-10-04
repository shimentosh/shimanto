import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import type { z } from 'zod';

function issues(error: z.ZodError, prefix: string) {
  return error.issues.map((issue) => ({
    path: [prefix, ...issue.path].filter(Boolean).join('.'),
    message: issue.message,
  }));
}

/** Parse inside a service (e.g. type-specific `data`) with the same 400 error shape as ZodPipe. */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  value: unknown,
  prefix = '',
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Validation failed',
      issues: issues(result.error, prefix),
    });
  }
  return result.data;
}

/** A business rule that isn't about input shape (e.g. "can't publish a product without a price"). */
export function unprocessable(message: string, path?: string): never {
  throw new UnprocessableEntityException({
    message,
    issues: path ? [{ path, message }] : undefined,
  });
}
