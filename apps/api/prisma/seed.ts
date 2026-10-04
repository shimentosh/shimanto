/**
 * Seed: creates the first super admin from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Page content lives in the web app's code, and products are created in the admin panel,
 * so this is the only data the database needs to start.
 *
 * Idempotent: an existing account is left untouched (its password is never overwritten).
 *
 *   pnpm db:seed
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created.');
    return;
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const email = ADMIN_EMAIL.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`Admin ${email} already exists: left unchanged.`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: 'Shimanto',
      role: 'SUPER_ADMIN',
      passwordHash: await hash(ADMIN_PASSWORD),
    },
  });
  console.log(`Created super admin ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
