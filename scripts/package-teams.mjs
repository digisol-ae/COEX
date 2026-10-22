import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

// Only public registration values are used; never put a secret in a Teams app package.
const appId = process.env.COEX_TEAMS_APP_ID;
const baseUrl = new URL(process.env.COEX_APP_URL ?? 'https://coex.digisol.ae');
const privacyUrl = new URL(process.env.COEX_TEAMS_PRIVACY_URL ?? '/privacy', baseUrl.origin);
const termsUrl = new URL(process.env.COEX_TEAMS_TERMS_URL ?? '/terms', baseUrl.origin);
if (!appId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appId))
  throw new Error('Set COEX_TEAMS_APP_ID to the public Microsoft bot application ID.');
if (baseUrl.protocol !== 'https:') throw new Error('COEX_APP_URL must use HTTPS.');
if (privacyUrl.protocol !== 'https:' || termsUrl.protocol !== 'https:')
  throw new Error('Provide real HTTPS COEX_TEAMS_PRIVACY_URL and COEX_TEAMS_TERMS_URL pages.');
const output = resolve(process.argv[2] ?? '/private/tmp/coex-teams-package');
await mkdir(output, { recursive: true });
const manifest = {
  $schema:
    'https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json',
  manifestVersion: '1.17',
  version: '1.0.1',
  id: appId,
  developer: {
    name: 'Digisol LLC-FZ',
    websiteUrl: baseUrl.origin,
    privacyUrl: privacyUrl.href,
    termsOfUseUrl: termsUrl.href,
  },
  name: { short: 'COEX', full: 'COEX tasks for Microsoft Teams' },
  description: {
    short: 'Create a COEX task from a Teams message.',
    full: 'Turn a selected Teams message into a COEX task. Choose the space or folder, assignee, priority and due date. Requires a linked COEX staff account.',
  },
  icons: { color: 'color.png', outline: 'outline.png' },
  accentColor: '#101827',
  composeExtensions: [
    {
      botId: appId,
      canUpdateConfiguration: false,
      commands: [
        {
          id: 'createCoexTask',
          type: 'action',
          title: 'Create COEX task',
          description: 'Create a task from this message',
          fetchTask: true,
          context: ['message'],
        },
      ],
    },
  ],
  validDomains: [baseUrl.hostname],
};
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const icon = await readFile(new URL('../apps/web/public/brand/coex-monogram.svg', import.meta.url));
await sharp(icon).resize(192, 192).png().toFile(resolve(output, 'color.png'));
// Teams requires white artwork on transparency: preserve the C/dot and remove its red tile.
const outline = Buffer.from(icon.toString('utf8').replace(/<rect[^>]*\/>/, ''));
await sharp(outline).resize(32, 32).png().toFile(resolve(output, 'outline.png'));
const result = spawnSync(
  'zip',
  [
    '-j',
    resolve(output, 'coex-teams.zip'),
    ...['manifest.json', 'color.png', 'outline.png'].map((file) => resolve(output, file)),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0)
  throw new Error('Could not create zip; zip manifest.json color.png outline.png manually.');
console.log(`Teams package: ${resolve(output, 'coex-teams.zip')}`);
