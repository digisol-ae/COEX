import { expect, it } from 'vitest';
import { copilotPackage } from '../../scripts/lib/copilot-package.mjs';
import config from '../../config/microsoft/copilot.public.json';
const files = () =>
  copilotPackage({
    baseUrl: 'https://coex.digisol.ae',
    appId: config.appId,
    tenantId: config.tenantId,
    authConfigId: config.authConfigId,
  });
it('supports the actual Microsoft base64 registration ID without embedding a credential', () => {
  const plugin = files()['copilot-plugin.json'];
  expect(plugin.runtimes[0].auth).toEqual({
    type: 'OAuthPluginVault',
    reference_id: config.authConfigId,
  });
  expect(JSON.stringify(plugin)).not.toMatch(/client_secret|api_key/i);
});
it('keeps creation consequential and the preview non-mutating with an explicit review card', () => {
  const data = files();
  expect(data['copilot-openapi.json'].paths['/create'].post['x-openai-isConsequential']).toBe(true);
  expect(data['copilot-openapi.json'].paths['/preview'].post['x-openai-isConsequential']).toBe(
    false,
  );
  expect(JSON.stringify(data['copilot-plugin.json'])).toContain('Create this Worktello task?');
  expect(JSON.stringify(data['copilot-plugin.json'])).toContain('Review Worktello task');
  expect(Object.keys(data['copilot-openapi.json'].paths)).toEqual([
    '/options',
    '/preview',
    '/create',
  ]);
});
it('fails package creation without valid public registration metadata', () => {
  expect(() =>
    copilotPackage({
      baseUrl: 'https://coex.digisol.ae',
      appId: config.appId,
      tenantId: config.tenantId,
      authConfigId: '',
    }),
  ).toThrow();
});
