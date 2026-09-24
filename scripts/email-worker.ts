import { ImapFlow } from 'imapflow';
import {
  deliverQueuedEmail,
  enabledMailboxes,
  recordMailboxProgress,
  type MailboxConfig,
} from '../src/modules/core/services/email.service';
import { syncMailbox } from '../src/modules/tickets/services/mailbox.service';

/**
 * The email worker: one long running process beside the web app (pm2 name: coex-mail).
 *
 * Inbound: it keeps an IMAP connection open to each support mailbox and waits in IDLE, so the
 * mail server tells it the moment a message arrives. A full check still runs every five minutes,
 * because an idle connection can die silently behind a firewall and nobody would notice.
 *
 * Outbound: it sends whatever requests have queued, every ten seconds, with retries.
 *
 * Settings are re-read every minute, so a change saved in Setup, Email needs no restart.
 */

const SWEEP_MS = 5 * 60 * 1000;
const SETTINGS_MS = 60 * 1000;
const OUTBOX_MS = 10 * 1000;
const RECONNECT_MS = 30 * 1000;

interface Watcher {
  config: MailboxConfig;
  client: ImapFlow | null;
  syncing: boolean;
  again: boolean;
  stopped: boolean;
  reconnectTimer: NodeJS.Timeout | null;
}

const watchers = new Map<string, Watcher>();

function log(message: string) {
  console.log(`${new Date().toISOString()} ${message}`);
}

async function runSync(watcher: Watcher) {
  if (!watcher.client || watcher.stopped) return;
  if (watcher.syncing) {
    // A message arrived mid sync; go round once more when this pass ends.
    watcher.again = true;
    return;
  }
  watcher.syncing = true;
  try {
    do {
      watcher.again = false;
      const imported = await syncMailbox(watcher.client, watcher.config);
      if (imported > 0) log(`${watcher.config.username}: imported ${imported} email(s).`);
    } while (watcher.again && !watcher.stopped);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    log(`${watcher.config.username}: sync failed: ${text}`);
    await recordMailboxProgress(watcher.config.settingsId, { lastError: text }).catch(
      () => undefined,
    );
  } finally {
    watcher.syncing = false;
  }
}

function scheduleReconnect(watcher: Watcher) {
  if (watcher.stopped || watcher.reconnectTimer) return;
  watcher.reconnectTimer = setTimeout(() => {
    watcher.reconnectTimer = null;
    void connect(watcher);
  }, RECONNECT_MS);
}

async function connect(watcher: Watcher) {
  if (watcher.stopped) return;
  const { config } = watcher;
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    logger: false,
  });

  client.on('exists', () => void runSync(watcher));
  client.on('error', (error: Error) =>
    log(`${config.username}: connection error: ${error.message}`),
  );
  client.on('close', () => {
    if (watcher.client === client) watcher.client = null;
    if (!watcher.stopped) {
      log(`${config.username}: connection closed, reconnecting in ${RECONNECT_MS / 1000}s.`);
      scheduleReconnect(watcher);
    }
  });

  try {
    await client.connect();
    // Keeping INBOX open lets the library sit in IDLE between commands, which is the push.
    await client.mailboxOpen('INBOX');
    watcher.client = client;
    log(`${config.username}: connected, waiting for new mail.`);
    await runSync(watcher);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    log(`${config.username}: cannot connect: ${text}`);
    await recordMailboxProgress(config.settingsId, { lastError: `Cannot connect: ${text}` }).catch(
      () => undefined,
    );
    await client.logout().catch(() => undefined);
    scheduleReconnect(watcher);
  }
}

async function stop(watcher: Watcher) {
  watcher.stopped = true;
  if (watcher.reconnectTimer) clearTimeout(watcher.reconnectTimer);
  await watcher.client?.logout().catch(() => undefined);
}

/** Starts, restarts or stops watchers to match what is saved in Setup, Email. */
async function reconcile() {
  const configs = await enabledMailboxes();
  const wanted = new Set(configs.map((config) => String(config.settingsId)));

  for (const [id, watcher] of watchers) {
    if (!wanted.has(id)) {
      log(`${watcher.config.username}: intake turned off, disconnecting.`);
      await stop(watcher);
      watchers.delete(id);
    }
  }

  for (const config of configs) {
    const id = String(config.settingsId);
    const current = watchers.get(id);
    if (current && current.config.version === config.version) continue;

    if (current) {
      log(`${config.username}: settings changed, reconnecting.`);
      await stop(current);
    }
    const watcher: Watcher = {
      config,
      client: null,
      syncing: false,
      again: false,
      stopped: false,
      reconnectTimer: null,
    };
    watchers.set(id, watcher);
    void connect(watcher);
  }
}

let delivering = false;
async function deliver() {
  if (delivering) return;
  delivering = true;
  try {
    const sent = await deliverQueuedEmail();
    if (sent > 0) log(`sent ${sent} email(s).`);
  } catch (error) {
    log(`outbox failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    delivering = false;
  }
}

async function main() {
  log('COEX email worker starting.');
  await reconcile();
  await deliver();

  setInterval(
    () => void reconcile().catch((error) => log(`settings reload failed: ${error}`)),
    SETTINGS_MS,
  );
  setInterval(() => void deliver(), OUTBOX_MS);
  setInterval(() => {
    for (const watcher of watchers.values()) void runSync(watcher);
  }, SWEEP_MS);

  const shutdown = async () => {
    log('COEX email worker stopping.');
    await Promise.all([...watchers.values()].map(stop));
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
