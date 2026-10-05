import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/scripts/seed.ts',
  },
  datasource: {
    // Optional so `prisma generate` works without a database (CI, Docker builds).
    url: process.env.DATABASE_URL ?? '',
  },
});
