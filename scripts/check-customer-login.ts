import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { connectToDatabase } from '../apps/web/src/lib/db';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { LoginOtpModel } from '@coex/shared/core/models/login-otp.model';
import { signInWithPassword } from '../apps/web/src/modules/core/services/auth.service';
import {
  requestLoginOtp,
  signInWithEmailOtp,
} from '../apps/web/src/modules/core/services/login-otp.service';
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from '../apps/web/src/modules/core/services/password-reset.service';
import { verifyPassword } from '../apps/web/src/lib/password';
import { resolveSession } from '../apps/web/src/modules/core/services/session.service';
async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  assert(
    (uri.hostname === 'mongo' && uri.port === '27017') ||
      (uri.hostname === '127.0.0.1' && uri.port === '27028'),
  );
  assert.equal(uri.pathname, '/coex_test_customer_auth');
  await connectToDatabase();
  await LoginOtpModel.init();
  const stamp = Date.now();
  const tenant = await TenantModel.create({
    name: 'Isolated customer authentication QA',
    slug: `customer-auth-${stamp}`,
  });
  await EmailSettingsModel.create({ tenantId: tenant._id, outbound: { enabled: true } });
  const old = 'My remembered osTicket password!';
  const fresh = 'A different secure password 2026!';
  const customer = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Legacy Customer',
    email: `customer-${stamp}@example.test`,
    role: 'client_contact',
    status: 'active',
    legacySourceId: 'osticket:qa',
    legacyUsername: `legacy-${stamp}`,
    passwordHash: (await hash(old, 4)).replace('$2b$', '$2y$'),
  });
  assert.equal((await signInWithPassword({ email: customer.email, password: 'wrong' })).ok, false);
  const passwordLogin = await signInWithPassword({ email: `legacy-${stamp}`, password: old });
  assert(passwordLogin.ok);
  assert(
    (await UserModel.findById(customer._id).select('+passwordHash'))!.passwordHash!.startsWith(
      '$argon2id$',
    ),
  );
  assert.equal((await signInWithPassword({ email: customer.email, password: old })).ok, true);
  const invited = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA OTP Customer',
    email: `otp-${stamp}@example.test`,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    legacySourceId: 'osticket:qa-otp',
  });
  await Promise.all(Array.from({ length: 4 }, () => requestLoginOtp(invited.email)));
  const outbox = await EmailOutboxModel.find({ to: invited.email });
  assert.equal(outbox.length, 1);
  const code = outbox[0].text.match(/\b\d{6}\b/)![0];
  assert(!JSON.stringify(await LoginOtpModel.findOne({ userId: invited._id })).includes(code));
  const sessions = await Promise.allSettled([
    signInWithEmailOtp({ email: invited.email, code }),
    signInWithEmailOtp({ email: invited.email, code }),
  ]);
  assert.equal(sessions.filter((x) => x.status === 'fulfilled').length, 1);
  const session = (
    sessions.find((x) => x.status === 'fulfilled') as PromiseFulfilledResult<{ token: string }>
  ).value;
  assert.equal(String((await resolveSession(session.token))!.userId), String(invited._id));
  const activated = await UserModel.findById(invited._id).select('+passwordHash');
  assert.equal(activated!.status, 'active');
  assert.equal(activated!.mustChangePassword, false);
  assert.equal(activated!.passwordHash, null);
  await assert.rejects(() => signInWithEmailOtp({ email: invited.email, code }));
  await LoginOtpModel.updateOne({ userId: invited._id }, { $set: { sentAt: new Date(0) } });
  await requestLoginOtp(invited.email);
  const mail = (await EmailOutboxModel.find({ to: invited.email }).sort({ createdAt: -1 }))[0];
  const code2 = mail.text.match(/\b\d{6}\b/)![0];
  for (let i = 0; i < 5; i++)
    await assert.rejects(() =>
      signInWithEmailOtp({ email: invited.email, code: code2 === '000000' ? '000001' : '000000' }),
    );
  await assert.rejects(() => signInWithEmailOtp({ email: invited.email, code: code2 }));
  await LoginOtpModel.updateOne(
    { userId: invited._id },
    { $set: { attempts: 0, expiresAt: new Date(0) } },
  );
  await assert.rejects(() => signInWithEmailOtp({ email: invited.email, code: code2 }));
  await LoginOtpModel.updateOne({ userId: invited._id }, { $set: { sentAt: new Date(0) } });
  await requestLoginOtp(invited.email);
  const beforeReset = (
    await EmailOutboxModel.find({ to: invited.email }).sort({ createdAt: -1 })
  )[0].text.match(/\b\d{6}\b/)![0];
  assert.equal(await requestPasswordReset(invited.email), 'sent');
  const resetMail = await EmailOutboxModel.findOne({
    to: invited.email,
    subject: 'Change your Worktello password',
  }).sort({ createdAt: -1 });
  assert(resetMail);
  const token = resetMail.text.match(/token=([\w-]+)/)![1];
  await resetPasswordWithToken(token, fresh);
  await assert.rejects(() => resetPasswordWithToken(token, fresh));
  assert.equal(await resolveSession(session.token), null);
  await assert.rejects(() => signInWithEmailOtp({ email: invited.email, code: beforeReset }));
  assert.equal((await signInWithPassword({ email: invited.email, password: fresh })).ok, true);
  // A reset on a still-invited imported account activates it directly.
  const pending = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Pending Customer',
    email: `pending-${stamp}@example.test`,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    legacySourceId: 'osticket:pending',
  });
  assert.equal(await requestPasswordReset(pending.email), 'sent');
  const pendingMail = await EmailOutboxModel.findOne({ to: pending.email });
  await resetPasswordWithToken(pendingMail!.text.match(/token=([\w-]+)/)![1], fresh);
  assert.equal((await UserModel.findById(pending._id))!.status, 'active');
  // Legacy password has no fallback after reset, and its existing session is revoked.
  assert.equal(await requestPasswordReset(customer.email), 'sent');
  const legacyMail = await EmailOutboxModel.findOne({
    to: customer.email,
    subject: 'Change your Worktello password',
  }).sort({ createdAt: -1 });
  await resetPasswordWithToken(legacyMail!.text.match(/token=([\w-]+)/)![1], fresh);
  assert.equal((await signInWithPassword({ email: customer.email, password: old })).ok, false);
  assert.equal((await signInWithPassword({ email: customer.email, password: fresh })).ok, true);
  assert.equal(await resolveSession(passwordLogin.token!), null);
  const staff = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Staff',
    email: `staff-${stamp}@example.test`,
    role: 'agent',
    status: 'active',
    passwordHash: await hash(old, 4),
  });
  const count = await EmailOutboxModel.countDocuments();
  await requestLoginOtp(staff.email);
  await requestLoginOtp('missing@example.test');
  assert.equal(await EmailOutboxModel.countDocuments(), count);
  assert.equal((await signInWithPassword({ email: staff.email, password: old })).ok, false);
  await UserModel.updateOne({ _id: invited._id }, { $set: { status: 'suspended' } });
  await requestLoginOtp(invited.email);
  await assert.rejects(() => signInWithEmailOtp({ email: invited.email, code: beforeReset }));
  assert.equal(await requestPasswordReset(invited.email), 'no_account');
  await TenantModel.updateOne({ _id: tenant._id }, { $set: { status: 'suspended' } });
  assert.equal((await signInWithPassword({ email: customer.email, password: fresh })).ok, false);
  await requestLoginOtp(customer.email);
  assert.equal(await requestPasswordReset(customer.email), 'no_account');
  assert(
    await verifyPassword(
      fresh,
      (await UserModel.findById(customer._id).select('+passwordHash'))!.passwordHash!,
    ),
  );
  console.log(
    'PASS: legacy email/username, bcrypt upgrade, wrong password, OTP concurrency/rate/expiry/attempt/replay, activation without password, reset pending/active, old-password/session/OTP invalidation, staff denial, suspended account and tenant denial. No SMTP worker connected.',
  );
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error);
  void mongoose.disconnect();
  process.exitCode = 1;
});
