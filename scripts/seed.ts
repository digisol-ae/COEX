/**
 * Creates the DigiSol tenant and its first administrator.
 *
 * Safe to run more than once: it creates what is missing and leaves anything that already exists
 * alone. The administrator password is generated here and printed once, because a password that
 * travels through chat or a file is a password that leaks.
 *
 * Run with: npm run seed
 */

import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { TenantModel } from '../src/modules/core/models/tenant.model';
import { UserModel } from '../src/modules/core/models/user.model';
import { AuditLogModel } from '../src/modules/core/models/audit-log.model';
import { hashPassword } from '../src/lib/password';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'ali@digisol.ae';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Syed Muhammad Jan Ali';

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run this with npm run seed so .env.local is loaded.');
  }

  await mongoose.connect(uri);
  console.log('Connected to', mongoose.connection.name);

  let tenant = await TenantModel.findOne({ slug: 'digisol' });

  if (tenant) {
    console.log('Tenant already exists:', tenant.name);
  } else {
    tenant = await TenantModel.create({
      name: 'DigiSol',
      slug: 'digisol',
      timezone: 'Asia/Dubai',
      currency: 'AED',
      numbering: { taskPrefix: 'DGS-T', ticketPrefix: 'DGS-S' },
    });
    console.log('Created tenant:', tenant.name);
  }

  const existingAdmin = await UserModel.findOne({ tenantId: tenant._id, email: ADMIN_EMAIL });

  if (existingAdmin) {
    console.log('Administrator already exists:', existingAdmin.email);
  } else {
    const password = randomBytes(9).toString('base64url');

    const admin = await UserModel.create({
      tenantId: tenant._id,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      title: 'Chief Executive Officer',
      role: 'platform_admin',
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      status: 'active',
    });

    await AuditLogModel.create({
      tenantId: tenant._id,
      actorId: admin._id,
      actorEmail: ADMIN_EMAIL,
      action: 'user.created',
      entityType: 'User',
      entityId: admin._id,
      after: { email: ADMIN_EMAIL, role: 'platform_admin', source: 'seed' },
    });

    console.log('');
    console.log('  Administrator created');
    console.log('  Email    ', ADMIN_EMAIL);
    console.log('  Password ', password);
    console.log('');
    console.log('  Copy the password now. It is not stored anywhere and will not be shown again.');
    console.log('');
  }

  // Indexes are declared on the schemas. Building them here means the first real query does not
  // pay for it, and a missing index shows up now rather than under load.
  await Promise.all([
    TenantModel.syncIndexes(),
    UserModel.syncIndexes(),
    AuditLogModel.syncIndexes(),
  ]);
  console.log('Indexes are in place.');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
