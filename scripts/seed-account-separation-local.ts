import mongoose from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
async function main() {
  if (process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27020/worktello_feedback_local')
    throw new Error('Isolated local feedback database only');
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await UserModel.findOne({
    email: 'feedback-admin@example.test',
    role: 'tenant_admin',
  });
  if (!admin) throw new Error('Feedback admin is missing');
  await UserModel.bulkWrite(
    Array.from({ length: 431 }, (_, index) => {
      const staff = index < 11;
      const email = `account-qa-${index}@example.test`;
      return {
        updateOne: {
          filter: { tenantId: admin.tenantId, email },
          update: {
            $setOnInsert: {
              name: staff
                ? `[Account QA] Agent ${index + 1}`
                : `[Account QA] Customer ${index - 10}`,
              role: staff ? 'agent' : 'client_contact',
              status: 'active',
              deletedAt: null,
            },
          },
          upsert: true,
        },
      };
    }),
  );
  console.log(
    JSON.stringify({
      staff: await UserModel.countDocuments({
        tenantId: admin.tenantId,
        role: { $ne: 'client_contact' },
        deletedAt: null,
      }),
      customers: await UserModel.countDocuments({
        tenantId: admin.tenantId,
        role: 'client_contact',
        deletedAt: null,
      }),
      database: mongoose.connection.name,
    }),
  );
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
