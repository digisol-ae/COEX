import { copilotPackage } from './lib/copilot-package.mjs';
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
const copilot = process.env.COEX_COPILOT_AUTH_CONFIG_ID
  ? copilotPackage({
      baseUrl: baseUrl.origin,
      appId,
      tenantId: process.env.COEX_TEAMS_TENANT_ID,
      authConfigId: process.env.COEX_COPILOT_AUTH_CONFIG_ID,
    })
  : null;
const manifest = {
  $schema:
    'https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json',
  manifestVersion: '1.19',
  version: copilot ? '1.3.0' : '1.2.0',
  id: appId,
  developer: {
    name: 'Digisol LLC-FZ',
    websiteUrl: baseUrl.origin,
    privacyUrl: privacyUrl.href,
    termsOfUseUrl: termsUrl.href,
  },
  name: { short: 'Worktello', full: 'Worktello tasks for Microsoft Teams' },
  description: {
    short: 'Manage your Worktello tasks inside Teams.',
    full: 'View your tasks, read and post updates, and create tasks inside Teams. Turn selected messages into tasks too. Requires a linked Worktello staff account.',
  },
  icons: { color: 'color.png', outline: 'outline.png' },
  accentColor: '#101827',
  staticTabs: [
    {
      entityId: 'coex-my-tasks',
      name: 'My Tasks',
      contentUrl: `${baseUrl.origin}/integrations/teams/app`,
      websiteUrl: `${baseUrl.origin}/tasks?mine=1`,
      scopes: ['personal'],
    },
  ],
  webApplicationInfo: { id: appId, resource: `api://${baseUrl.hostname}/${appId}` },
  composeExtensions: [
    {
      botId: appId,
      canUpdateConfiguration: false,
      commands: [
        {
          id: 'createCoexTask',
          type: 'action',
          title: 'Create Worktello task',
          description: 'Create a task from this message',
          fetchTask: true,
          context: ['message'],
        },
      ],
    },
  ],
  ...(copilot
    ? {
        copilotAgents: {
          declarativeAgents: [{ id: 'worktelloTasks', file: 'copilot-agent.json' }],
        },
      }
    : {}),
  validDomains: [baseUrl.hostname],
};
if (copilot)
  for (const [name, data] of Object.entries(copilot))
    await writeFile(resolve(output, name), JSON.stringify(data, null, 2) + '\n');
await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const icon = await readFile(
  new URL('../apps/web/public/brand/worktello-monogram.svg', import.meta.url),
);
await sharp(icon).resize(192, 192).png().toFile(resolve(output, 'color.png'));
// Teams requires white artwork on transparency; reuse the approved handoff W alpha.
const symbol = await readFile(
  new URL('../apps/web/public/brand/worktello-symbol.png', import.meta.url),
);
const alpha = await sharp(symbol)
  .resize(28, 28, { fit: 'contain', background: '#00000000' })
  .ensureAlpha()
  .extractChannel(3)
  .raw()
  .toBuffer();
const outline = await sharp({
  create: { width: 28, height: 28, channels: 3, background: '#ffffff' },
})
  .joinChannel(alpha, { raw: { width: 28, height: 28, channels: 1 } })
  .extend({ top: 2, bottom: 2, left: 2, right: 2, background: '#00000000' })
  .png()
  .toBuffer();
await sharp(outline).resize(32, 32).png().toFile(resolve(output, 'outline.png'));
const result = spawnSync(
  'zip',
  [
    '-j',
    resolve(output, 'worktello-teams.zip'),
    ...['manifest.json', 'color.png', 'outline.png', ...Object.keys(copilot ?? {})].map((file) =>
      resolve(output, file),
    ),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0)
  throw new Error('Could not create zip; zip manifest.json color.png outline.png manually.');
console.log(`Teams package: ${resolve(output, 'worktello-teams.zip')}`);
