/** Creates a labelled review share in the disposable local fixture; no mail worker runs. */
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ResourceModel } from '@coex/shared/resources/models';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { createResourceShare } from '../apps/web/src/modules/resources/service';
async function main() {
  if (
    process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27020/worktello_resources_local' ||
    process.env.COEX_APP_URL !== 'http://localhost:3123'
  )
    throw new Error('Dedicated local resource preview only');
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await UserModel.findOne({ email: 'resource-admin@example.test' });
  if (!user) throw new Error('Seed local resources first.');
  await runWithContext(
    { tenantId: user.tenantId, userId: user._id, isPlatformAdmin: false },
    async () => {
      const organisation = await OrganisationModel.findOne({
        tenantId: user.tenantId,
        name: '[Resource QA] Customer',
        email: 'resource-customer@example.test',
      });
      const resource = await ResourceModel.findOne({
        tenantId: user.tenantId,
        title: '[Resource QA] PDF guide',
        status: 'published',
      });
      if (!organisation || !resource) throw new Error('Missing local fixtures');
      await createResourceShare(
        {
          resourceIds: [String(resource._id)],
          organisationId: String(organisation._id),
          recipientEmail: organisation.email!,
          title: '[Resource QA] Review preview',
          message: 'Your requested tutorial guide, shared with an email code.',
          requestKey: randomUUID(),
        },
        { id: String(user._id), permissions: ['resource.share', 'customer.read'] },
      );
      const mail = (await EmailOutboxModel.findOne({
        tenantId: user.tenantId,
        subject: '[Resource QA] Review preview',
      }).sort({ createdAt: -1, _id: -1 }))!;
      const url = /Open: (\S+)/.exec(mail.text)![1];
      const code = /One-time code: (\d{8})/.exec(mail.text)![1];
      writeFileSync(
        '/private/tmp/worktello-resource-review-access.json',
        JSON.stringify({ url, code }),
        { mode: 0o600 },
      );
      console.log('Synthetic review link and OTP written privately. No SMTP send.');
    },
  );
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
