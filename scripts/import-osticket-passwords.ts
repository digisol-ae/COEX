/** Private input only. Dry-run by default; never logs hashes, usernames or emails. */
import fs from 'node:fs';
import mongoose from 'mongoose';
import { connectToDatabase } from '../apps/web/src/lib/db';
import { UserModel } from '@coex/shared/core/models/user.model';
import { isLegacyPasswordHash } from '../apps/web/src/lib/password';
interface Source {
  sourceUserId: number;
  status: number;
  username: string;
  passwordHash: string;
  backend: string | null;
}
async function main() {
  const path = process.env.OST_PASSWORD_INPUT,
    tenant = process.env.OST_TENANT_ID;
  if (!path || !tenant || !mongoose.isValidObjectId(tenant))
    throw new Error('Private input and exact tenant ID are required.');
  const input = JSON.parse(fs.readFileSync(path, 'utf8')) as Source[];
  if (!Array.isArray(input) || new Set(input.map((x) => x.sourceUserId)).size !== input.length)
    throw new Error('Invalid or duplicate source IDs');
  await connectToDatabase();
  const counts = {
    source: input.length,
    eligible: 0,
    imported: 0,
    pendingOrLocked: 0,
    unavailableHash: 0,
    preservedExisting: 0,
    unmappedOrStaff: 0,
  };
  const plan = [];
  for (const item of input) {
    if ((item.status & 1) !== 1 || (item.status & 6) !== 0) {
      counts.pendingOrLocked++;
      continue;
    }
    if (!isLegacyPasswordHash(item.passwordHash) || (item.backend && item.backend !== 'client')) {
      counts.unavailableHash++;
      continue;
    }
    const users = await UserModel.find({
      tenantId: tenant,
      legacySourceId: `osticket:${item.sourceUserId}`,
      role: 'client_contact',
      deletedAt: null,
    })
      .select('+passwordHash')
      .limit(2);
    const user = users.length === 1 ? users[0] : null;
    if (!user) {
      counts.unmappedOrStaff++;
      continue;
    }
    if (
      user.passwordHash ||
      user.status !== 'invited' ||
      !user.mustChangePassword ||
      user.lastSignedInAt
    ) {
      counts.preservedExisting++;
      continue;
    }
    counts.eligible++;
    plan.push({ user, item });
  }
  if (process.env.APPLY === '1') {
    for (const { user, item } of plan) {
      const changed = await UserModel.updateOne(
        {
          _id: user._id,
          tenantId: tenant,
          role: 'client_contact',
          legacySourceId: `osticket:${item.sourceUserId}`,
          passwordHash: null,
          status: 'invited',
          mustChangePassword: true,
          lastSignedInAt: null,
          deletedAt: null,
        },
        {
          $set: {
            passwordHash: item.passwordHash,
            legacyUsername: item.username.includes('@')
              ? null
              : item.username.trim().toLowerCase() || null,
            status: 'active',
            mustChangePassword: false,
          },
        },
      );
      counts.imported += changed.modifiedCount;
    }
    if (counts.imported !== counts.eligible)
      throw new Error(
        'Concurrent account changes detected; inspect aggregate import outcome before rerun.',
      );
  }
  console.log(JSON.stringify({ mode: process.env.APPLY === '1' ? 'apply' : 'dry-run', ...counts }));
  await mongoose.disconnect();
}
main().catch(() => {
  console.error(
    'Credential import stopped. Review private input and connection; no secrets printed.',
  );
  void mongoose.disconnect();
  process.exitCode = 1;
});
