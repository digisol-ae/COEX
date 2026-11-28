import mongoose, { Types } from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { hashPassword } from '@/lib/password';
import { runWithContext } from '@/lib/tenant-context';
import {
  initializePayroll,
  savePayroll,
  listPayroll,
  createRun,
} from '@/modules/payroll/services/payroll.service';
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27029/?directConnection=true', {
    dbName: 'coex_test_payroll_browser',
  });
  if (mongoose.connection.name !== 'coex_test_payroll_browser')
    throw new Error('Refusing non-QA database.');
  if (globalThis.__coexMongoose) {
    globalThis.__coexMongoose.connection = mongoose;
    globalThis.__coexMongoose.promise = Promise.resolve(mongoose);
  } else globalThis.__coexMongoose = { connection: mongoose, promise: Promise.resolve(mongoose) };
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const tenant = await TenantModel.create({
    name: 'DigiSol Payroll QA',
    slug: 'digisol-payroll-qa',
  });
  const users: Record<string, Types.ObjectId> = {};
  const passwordHash = await hashPassword('Payroll-QA-2026!');
  for (const role of ['owner', 'hr', 'checker', 'accounts', 'employee']) {
    const user = await UserModel.create({
      tenantId: tenant._id,
      name: `QA ${role}`,
      email: `${role}@payroll.example.test`,
      role: role === 'owner' ? 'platform_admin' : 'agent',
      passwordHash,
      status: 'active',
      mustChangePassword: false,
    });
    users[role] = user._id;
  }
  const as = (role: string, fn: () => Promise<unknown>) =>
    runWithContext(
      { tenantId: tenant._id, userId: users[role], isPlatformAdmin: role === 'owner' },
      fn,
    );
  await as('owner', () =>
    initializePayroll({
      hrIds: [String(users.hr)],
      approverIds: [String(users.checker)],
      accountsIds: [String(users.accounts)],
    }),
  );
  await as('hr', async () => {
    const structure = (await listPayroll('structure'))[0];
    const employeeId = await savePayroll('employee', {
      code: 'QA-001',
      name: 'QA Employee',
      userId: String(users.employee),
      email: 'employee@payroll.example.test',
      department: 'QA Department',
      designation: 'Test employee',
      joinDate: '2026-11-01',
      currency: 'AED',
      payment: { method: 'bank', bankName: 'QA Bank', iban: 'AE00QA000001' },
    });
    await savePayroll('assignment', {
      employeeId,
      structureId: structure.id,
      effectiveFrom: '2026-11-01',
      package: 3000,
      reason: 'Synthetic QA salary',
    });
    await createRun('2026-11', 'AED');
  });
  console.log('Synthetic payroll browser database seeded. No live tenant or mail settings.');
  await mongoose.disconnect();
}
main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
