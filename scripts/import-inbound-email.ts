import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { importInboundEmail } from '../src/modules/tickets/services/inbound-email.service';

const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`${name} is required.`); return value; };

async function main() {
  // Do not convert historic unread mail into tickets just because an inbox is connected for the
  // first time. This number is the last UID deliberately left outside COEX; only newer mail is
  // eligible. UIDs are monotonic within one mailbox and are safer than date searches at midnight.
  const minimumUid = Number(required('COEX_INBOUND_MIN_UID'));
  if (!Number.isSafeInteger(minimumUid) || minimumUid < 1) {
    throw new Error('COEX_INBOUND_MIN_UID must be a positive mailbox UID.');
  }

  const client = new ImapFlow({ host: required('COEX_IMAP_HOST'), port: Number(process.env.COEX_IMAP_PORT ?? 993), secure: process.env.COEX_IMAP_SECURE === 'true', auth: { user: required('COEX_IMAP_USER'), pass: required('COEX_IMAP_PASSWORD') }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const searchResult = await client.search({ seen: false }, { uid: true });
    const unread = Array.isArray(searchResult) ? searchResult.filter((uid) => uid > minimumUid) : [];
    let processed = 0;
    let failed = 0;
    for await (const message of client.fetch(unread, { uid: true, source: true }, { uid: true })) {
      if (!message.source) continue;
      try {
        await importInboundEmail({ tenantId: required('COEX_INBOUND_TENANT_ID'), actorUserId: required('COEX_INBOUND_ACTOR_ID'), queueId: required('COEX_INBOUND_QUEUE_ID') }, await simpleParser(message.source));
        await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
        processed += 1;
      } catch (error) {
        // Leave it unread so a temporary database or attachment failure is never silently lost.
        failed += 1;
        console.error(`Email UID ${message.uid} was not imported:`, error instanceof Error ? error.message : error);
      }
    }
    console.log(`Processed ${processed} new email(s); ${failed} left unread for retry.`);
    if (failed > 0) process.exitCode = 1;
  } finally { lock.release(); await client.logout(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
