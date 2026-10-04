import { type INestApplication, VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { ACCESS_COOKIE } from './auth/auth.types.js';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('shimanto.xyz API')
    .setDescription(
      'Storage, products & orders, buyer access, leads and admin auth for shimanto.xyz',
    )
    .setVersion('1')
    .addCookieAuth(ACCESS_COOKIE)
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controller, method) =>
      `${controller.replace(/Controller$/, '')}_${method}`,
  });
}

/**
 * Cross-cutting HTTP setup shared by `main.ts` and the e2e tests,
 * so tests exercise the same security headers, CORS and routing as production.
 */
export function configureApp(app: NestExpressApplication, env: Env): NestExpressApplication {
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  // Content endpoints live under /v1/…; controllers can opt out with VERSION_NEUTRAL.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  if (env.NODE_ENV !== 'production') {
    SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app));
  }
  return app;
}
