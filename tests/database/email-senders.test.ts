import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { sealSecret } from '@/lib/secret-box';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { deliverQueuedEmail, queueEmail } from '@/modules/core/services/email.service';
import { resetPassword } from '@/modules/core/services/user.service';
import { createQueue } from '@/modules/tickets/services/queue.service';
import { createTicket } from '@/modules/tickets/services/ticket.service';

// Capture what would have gone out, and through which account, instead of talking to a server.
const sent: { account: string; from: string; to: string; kind: string }[] = [];
vi.mock('nodemailer', () => ({
  default: {
    createTransport: (options: { auth?: { user: string } }) => ({
      sendMail: async (mail: { from: string; to: string; subject: string }) => {
        sent.push({
          account: options.auth?.user ?? '',
          from: mail.from,
          to: mail.to,
          kind: mail.subject,
        });
      },
      close: () => undefined,
    }),
  },
}));

const tenantId = new Types.ObjectId();
const adminId = new Types.ObjectId();
const agentId = new Types.ObjectId();
const deskLeadId = new Types.ObjectId();
const admin = { tenantId, userId: adminId, isPlatformAdmin: false };
const agent = { tenantId, userId: agentId, isPlatformAdmin: false };

async function settings(overrides: Record<string, unknown> = {}) {
  await EmailSettingsModel.create({
    tenantId,
    outbound: {
      enabled: true,
      host: 'smtp.example.com',
      username: 'helpdesk@digisolteam.com',
      passwordSealed: sealSecret('x'),
      fromName: 'DigiSol Support',
      fromAddress: 'helpdesk@digisolteam.com',
    },
    ...overrides,
  });
}

beforeAll(async () => {
  // A throwaway key: these tests seal fake SMTP passwords and never read a real one.
  process.env.COEX_ENCRYPTION_KEY ??= 'test-only-email-senders';
  await connectForTests('email-senders');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  sent.length = 0;
  await TenantModel.create({
    _id: tenantId,
    name: 'DigiSol',
    slug: 'digisol',
    numbering: { taskPrefix: 'DGS-T', ticketPrefix: 'DGS-S' },
  });
  await UserModel.create([
    {
      _id: adminId,
      tenantId,
      name: 'Ali Admin',
      email: 'ali@example.com',
      role: 'tenant_admin',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: agentId,
      tenantId,
      name: 'Sara Agent',
      email: 'sara@example.com',
      role: 'agent',
      passwordHash: 'x',
      status: 'active',
    },
    {
      _id: deskLeadId,
      tenantId,
      name: 'Omar Lead',
      email: 'omar@example.com',
      role: 'manager',
      passwordHash: 'x',
      status: 'active',
    },
  ]);
});

describe('three senders', () => {
  it('sends everything from the standard address until Alert and Admin are set up', async () => {
    await settings();
    await runWithContext(admin, async () => {
      await queueEmail({ kind: 'mentioned', to: 'sara@example.com', subject: 'alert', text: 'x' });
      await queueEmail({
        kind: 'password_reset',
        to: 'sara@example.com',
        subject: 'admin',
        text: 'x',
      });
    });
    await deliverQueuedEmail();
    expect(sent.map((mail) => mail.from)).toEqual([
      '"DigiSol Support" <helpdesk@digisolteam.com>',
      '"DigiSol Support" <helpdesk@digisolteam.com>',
    ]);
  });

  it('sends customer, alert and account mail from their own addresses and accounts', async () => {
    await settings({
      senders: {
        alert: {
          fromName: 'DigiSol Alerts',
          fromAddress: 'alerts@digisolteam.com',
          ownAccount: false,
        },
        admin: {
          fromName: 'DigiSol Admin',
          fromAddress: 'admin@digisolteam.com',
          ownAccount: true,
          host: 'smtp.example.com',
          username: 'admin@digisolteam.com',
          passwordSealed: sealSecret('y'),
        },
      },
    });
    await runWithContext(admin, async () => {
      await queueEmail({
        kind: 'ticket_reply',
        to: 'customer@example.org',
        subject: 'standard',
        text: 'x',
      });
      await queueEmail({
        kind: 'ticket_assigned',
        to: 'sara@example.com',
        subject: 'alert',
        text: 'x',
      });
      await queueEmail({
        kind: 'password_reset',
        to: 'sara@example.com',
        subject: 'admin',
        text: 'x',
      });
    });
    await deliverQueuedEmail();

    const by = Object.fromEntries(sent.map((mail) => [mail.kind, mail]));
    expect(by.standard.from).toBe('"DigiSol Support" <helpdesk@digisolteam.com>');
    // Alert borrows the standard mailbox's connection ("Send As"); Admin signs in on its own.
    expect(by.alert).toMatchObject({
      from: '"DigiSol Alerts" <alerts@digisolteam.com>',
      account: 'helpdesk@digisolteam.com',
    });
    expect(by.admin).toMatchObject({
      from: '"DigiSol Admin" <admin@digisolteam.com>',
      account: 'admin@digisolteam.com',
    });
  });
});

describe('new ticket alert', () => {
  async function aTicket(context: typeof admin, channel: 'agent' | 'email' = 'agent') {
    const queueId = await runWithContext(admin, () => createQueue({ name: 'Support' }));
    await runWithContext(context, () =>
      createTicket({ subject: 'Printer offline', body: 'Help', queueId, channel }),
    );
    return EmailOutboxModel.find({ kind: 'ticket_created' }).then((rows) =>
      rows.map((row) => row.to).sort(),
    );
  }

  it('tells administrators only, by default', async () => {
    await settings();
    expect(await aTicket(agent)).toEqual(['ali@example.com']);
  });

  it('tells everyone who works the whole desk when set to', async () => {
    await settings({ staff: { ticketCreated: 'desk' } });
    expect(await aTicket(agent)).toEqual(['ali@example.com', 'omar@example.com']);
  });

  it('tells nobody when switched off', async () => {
    await settings({ staff: { ticketCreated: 'off' } });
    expect(await aTicket(agent)).toEqual([]);
  });

  it('still tells the administrator an email ticket was created in their name', async () => {
    await settings();
    expect(await aTicket(admin, 'email')).toEqual(['ali@example.com']);
  });
});

describe('an administrator resets a password', () => {
  it('emails the person from Admin when ticked, with a link and never the password', async () => {
    await settings();
    const { password, notified } = await runWithContext(admin, () =>
      resetPassword(String(agentId), { notify: true }),
    );
    expect(notified).toBe(true);
    const mail = await EmailOutboxModel.findOne({ kind: 'password_set_by_admin' });
    expect(mail?.to).toBe('sara@example.com');
    expect(mail?.text).toContain('Ali Admin has reset the password');
    expect(mail?.text).toMatch(/reset-password\?token=/);
    expect(mail?.text).not.toContain(password);
  });

  it('sends nothing when not ticked', async () => {
    await settings();
    await runWithContext(admin, () => resetPassword(String(agentId)));
    expect(await EmailOutboxModel.countDocuments({ kind: 'password_set_by_admin' })).toBe(0);
  });
});
