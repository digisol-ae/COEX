/**
 * Resets one person's password directly in the database and prints it once.
 *
 * For the case the "Reset password" button on the Users page cannot cover: nobody who still has
 * access can sign in to press it. Connects straight to Mongo the same way scripts/seed.ts does,
 * so it works even when every session is gone.
 *
 * Run with: RESET_EMAIL=someone@digisol.ae npm run reset:password
 */

import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { UserModel } from '../src/modules/core/models/user.model';
import { AuditLogModel } from '../src/modules/core/models/audit-log.model';
import { hashPassword } from '../src/lib/password';

const EMAIL = process.env.RESET_EMAIL;

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run this with npm run reset:password so .env.local is loaded.');
  }

  if (!EMAIL) {
    throw new Error('Set RESET_EMAIL, e.g. RESET_EMAIL=ali@digisol.ae npm run reset:password');
  }

  await mongoose.connect(uri);
  console.log('Connected to', mongoose.connection.name);

  const user = await UserModel.findOne({ email: EMAIL.toLowerCase() });

  if (!user) {
    throw new Error(`No user with email ${EMAIL}.`);
  }

  const password = randomBytes(9).toString('base64url');

  await UserModel.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(password), mustChangePassword: true } },
  );

  await AuditLogModel.create({
    tenantId: user.tenantId,
    actorId: user._id,
    action: 'user.password_reset',
    entityType: 'User',
    entityId: user._id,
    after: { source: 'reset-password script' },
  });

  console.log('');
  console.log('Password reset for', user.email);
  console.log('  New password:', password);
  console.log('');
  console.log('Copy it now. It is not stored anywhere and will not be shown again.');

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
