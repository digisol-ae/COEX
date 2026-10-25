import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export const TEAMS_CLIENT_IDS = [
  '1fec8e78-bce4-4aaf-ab1b-5451cc387264',
  '5e3ce6c0-2b1f-4285-8d4b-75ee78787346',
  // Outlook web only; desktop/mobile clients need separate rollout and acceptance.
  'bc59ab01-8403-45c6-8796-ac3ef710b3e3',
];
const guid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const keys = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'),
);

/** Only v2 delegated tokens for OUR API, issued to an explicitly approved Teams/Outlook web client. Never trust context/email. */
export async function verifyTeamsTabToken(
  token: string,
  settings: { appId: string; microsoftTenant: string },
  verificationKeys: JWTVerifyGetKey = keys,
) {
  if (!guid.test(settings.appId) || !guid.test(settings.microsoftTenant) || token.length > 24000)
    throw new Error('Invalid Teams configuration or token');
  const { payload } = await jwtVerify(token, verificationKeys, {
    algorithms: ['RS256'],
    audience: settings.appId,
    issuer: `https://login.microsoftonline.com/${settings.microsoftTenant}/v2.0`,
    requiredClaims: ['exp', 'iat', 'oid', 'tid', 'scp', 'azp'],
  });
  if (
    payload.ver !== '2.0' ||
    payload.tid !== settings.microsoftTenant ||
    typeof payload.oid !== 'string' ||
    !guid.test(payload.oid) ||
    typeof payload.scp !== 'string' ||
    !payload.scp.split(' ').includes('access_as_user') ||
    typeof payload.azp !== 'string' ||
    !TEAMS_CLIENT_IDS.includes(payload.azp)
  )
    throw new Error('Invalid Teams identity');
  return payload.oid;
}
