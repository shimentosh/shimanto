import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

/**
 * e2e global setup: make sure the `<db>_test` database exists and is migrated.
 * Tests never touch the dev database.
 */
export default async function setup(project: TestProject) {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is required for e2e tests (see apps/api/.env.example)');

  const url = new URL(base);
  const testDb = `${url.pathname.slice(1) || 'shimanto'}_test`;
  const testUrl = new URL(base);
  testUrl.pathname = `/${testDb}`;
  project.provide('testDatabaseUrl', testUrl.toString());

  const admin = new URL(base);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDb]);
  if (!rowCount) await client.query(`CREATE DATABASE "${testDb}"`);
  await client.end();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
}
