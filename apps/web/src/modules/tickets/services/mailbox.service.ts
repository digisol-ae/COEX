import type { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import {
  mailboxConfig,
  recordMailboxProgress,
  type MailboxConfig,
} from '@/modules/core/services/email.service';
import { importInboundEmail } from './inbound-email.service';

/** A message that fails this many times is skipped, so one bad email cannot stop all the others. */
const MAX_ATTEMPTS = 3;

/**
 * Brings one tenant's support mailbox up to date on an open, INBOX-selected connection.
 *
 * Progress is the highest UID handled, not the unread flag: people read the support mailbox too,
 * and a message someone opened in Outlook first must still become a ticket. The first run only
 * records where the mailbox stands, so mail that was already there is left alone.
 */
export async function syncMailbox(client: ImapFlow, initial: MailboxConfig): Promise<number> {
  const config = (await mailboxConfig(initial.settingsId)) ?? initial;
  const mailbox = client.mailbox;
  if (!mailbox) throw new Error('The inbox is not open.');

  if (config.lastUid === null) {
    const baseline = Math.max(Number(mailbox.uidNext ?? 1) - 1, 0);
    await recordMailboxProgress(config.settingsId, {
      lastUid: baseline,
      lastCheckedAt: new Date(),
      lastError: null,
    });
    return 0;
  }

  const found = await client.search({ uid: `${config.lastUid + 1}:*` }, { uid: true });
  // "n:*" always matches the newest message, even when it is older than n, so filter again.
  const uids = (Array.isArray(found) ? found : [])
    .filter((uid) => uid > (config.lastUid ?? 0))
    .sort((a, b) => a - b);

  let lastUid = config.lastUid;
  let imported = 0;

  for (const uid of uids) {
    try {
      const message = await client.fetchOne(String(uid), { source: true }, { uid: true });
      if (message && message.source) {
        await importInboundEmail(
          {
            tenantId: String(config.tenantId),
            actorUserId: String(config.actorUserId),
            queueId: String(config.queueId),
          },
          await simpleParser(message.source),
        );
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        imported += 1;
      }
      lastUid = uid;
      await recordMailboxProgress(config.settingsId, {
        lastUid,
        retryUid: null,
        retryAttempts: 0,
        lastError: null,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const attempts = config.retryUid === uid ? config.retryAttempts + 1 : 1;

      if (attempts >= MAX_ATTEMPTS) {
        lastUid = uid;
        await recordMailboxProgress(config.settingsId, {
          lastUid,
          retryUid: null,
          retryAttempts: 0,
          lastError: `Email UID ${uid} skipped after ${attempts} failed attempts: ${text}`,
        });
        continue;
      }

      await recordMailboxProgress(config.settingsId, {
        retryUid: uid,
        retryAttempts: attempts,
        lastError: `Email UID ${uid} failed (attempt ${attempts} of ${MAX_ATTEMPTS}): ${text}`,
      });
      // Stop here and retry this message on the next pass, keeping the mailbox order intact.
      break;
    }
  }

  await recordMailboxProgress(config.settingsId, { lastCheckedAt: new Date() });
  return imported;
}
