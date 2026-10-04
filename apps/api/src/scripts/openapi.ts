/**
 * Writes the OpenAPI document to packages/sdk/openapi.json, the source for the typed SDK.
 * Runs with the inline jobs driver and a dummy database URL: building the document never
 * touches Postgres or Redis.
 *
 *   pnpm --filter @shimanto/api openapi
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../app.module.js';
import { buildOpenApiDocument, configureApp } from '../bootstrap.js';
import { loadEnv } from '../config/env.js';

export function openApiEnv() {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://openapi@localhost:1/none',
    JOBS_DRIVER: 'inline',
    JWT_ACCESS_SECRET: 'openapi-export-only',
    REVALIDATE_SECRET: 'openapi-export-only',
  });
}

export async function generateOpenApi(): Promise<string> {
  const env = openApiEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
    logger: false,
    rawBody: true,
  });
  configureApp(app, env);
  await app.init();
  const document = buildOpenApiDocument(app);
  await app.close();
  return `${JSON.stringify(document, null, 2)}\n`;
}

export const OPENAPI_PATH = fileURLToPath(
  new URL('../../../../packages/sdk/openapi.json', import.meta.url),
);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(OPENAPI_PATH, await generateOpenApi());
  process.stdout.write(`Wrote ${OPENAPI_PATH}\n`);
}
