import { deliverPendingChannelMessages } from '../src/modules/channels/services/channel-messages.service';

/**
 * The WhatsApp channel worker (pm2 name: coex-channels). Every ten seconds it sends the outbox for
 * tenants whose delivery is "COEX sends" (test mode, or XVERSE Case A). Tenants on "XVERSE
 * collects" (Case B) are skipped; XVERSE pulls those itself.
 */
const INTERVAL_MS = 10 * 1000;
let running = false;

function log(message: string) {
  console.log(`${new Date().toISOString()} ${message}`);
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await deliverPendingChannelMessages();
    if (result.sent || result.retrying || result.failed || result.waiting) {
      log(
        `sent ${result.sent}, retrying ${result.retrying}, failed ${result.failed}, waiting ${result.waiting}.`,
      );
    }
  } catch (error) {
    log(`delivery failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    running = false;
  }
}

log('COEX channel worker starting.');
void tick();
setInterval(() => void tick(), INTERVAL_MS);
const shutdown = () => {
  log('COEX channel worker stopping.');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
