import {
  BadRequestException,
  Body,
  type PipeTransform,
  Query,
  applyDecorators,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

type OpenApiSchema = Record<string, unknown>;

/** zod → OpenAPI 3.0 schema for Swagger (and from there, the generated SDK types). */
export function toOpenApi(schema: z.ZodType, io: 'input' | 'output' = 'input'): OpenApiSchema {
  const json = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  }) as OpenApiSchema;
  delete json.$schema;
  return json;
}

/** Validates and transforms a value with a zod schema. 400 with field issues on failure. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}

/** Method decorator that applies a parameter decorator's docs; used by ZodBody/ZodQuery. */
function docs(decorator: MethodDecorator): ParameterDecorator {
  return (target, key) => {
    if (!key) return;
    decorator(target, key, Object.getOwnPropertyDescriptor(target, key)!);
  };
}

/** `@ZodBody(Schema) body: z.output<typeof Schema>`: validates the body and documents it in Swagger. */
export function ZodBody(schema: z.ZodType): ParameterDecorator {
  return (target, key, index) => {
    Body(new ZodPipe(schema))(target, key, index);
    docs(ApiBody({ schema: toOpenApi(schema) }))(target, key, index);
  };
}

/** `@ZodQuery(Schema) query`: validates the query string and documents every field in Swagger. */
export function ZodQuery(schema: z.ZodObject): ParameterDecorator {
  return (target, key, index) => {
    Query(new ZodPipe(schema))(target, key, index);
    const json = toOpenApi(schema) as {
      properties?: Record<string, OpenApiSchema>;
      required?: string[];
    };
    for (const [name, prop] of Object.entries(json.properties ?? {})) {
      docs(ApiQuery({ name, required: json.required?.includes(name) ?? false, schema: prop }))(
        target,
        key,
        index,
      );
    }
  };
}

/** Documents a response body from a zod schema. */
export function ApiZodResponse(schema: z.ZodType, status = 200, description = 'OK') {
  return applyDecorators(ApiResponse({ status, description, schema: toOpenApi(schema, 'output') }));
}
