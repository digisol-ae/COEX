import { connectToDatabase } from '@/lib/db';
import { createApp } from './app';
import { loadConfig } from './config';

/**
 * Starts the API. Run with `npm run api:start` (pm2 process `coex-api`) or `npm run api:dev`.
 *
 * Nothing here is reachable from outside until Apache is told to send /api/v2 to this port
 * (deploy/apache-coex.conf), so starting it changes nothing for anyone.
 */

async function main() {
  const config = loadConfig();
  await connectToDatabase();

  const server = createApp(config).listen(config.port, config.host, () => {
    console.log(`COEX API listening on http://${config.host}:${config.port}/api/v2`);
  });

  const shutdown = () => {
    console.log('COEX API stopping.');
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
