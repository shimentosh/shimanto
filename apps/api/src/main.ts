import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { loadEnv } from './config/env.js';

// Local development reads apps/api/.env; in production the platform injects real env vars.
if (existsSync('.env')) process.loadEnvFile('.env');

const env = loadEnv();
const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
  bufferLogs: true,
  // Stripe webhooks are verified against the exact raw request body.
  rawBody: true,
});
app.useLogger(app.get(Logger));
configureApp(app, env);
await app.listen(env.PORT);

const docs = env.NODE_ENV === 'production' ? '' : ` — docs at /docs`;
app.get(Logger).log(`API listening on port ${env.PORT}${docs}`, 'Bootstrap');
