import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const ENTRA_STATE_COOKIE = 'coex_entra_state';
const STATE_LIFETIME_SECONDS = 10 * 60;

type EntraState = { state: string; nonce: string; verifier: string };
type EntraConfig = { clientId: string; clientSecret: string; issuer: string; redirectUri: string };

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function issuerFromEnvironment() {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.replace(/\/$/, '');
  if (!issuer) return null;
  try {
    const parsed = new URL(issuer);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'login.microsoftonline.com' ||
      !parsed.pathname.endsWith('/v2.0')
    )
      return null;
    return issuer;
  } catch {
    return null;
  }
}

function config(): EntraConfig | null {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  const issuer = issuerFromEnvironment();
  const appUrl = process.env.AUTH_URL ?? process.env.COEX_APP_URL;
  if (!clientId || !clientSecret || !issuer || !appUrl) return null;
  return {
    clientId,
    clientSecret,
    issuer,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/auth/entra/callback`,
  };
}

export function isEntraConfigured() {
  return Boolean(config());
}

function endpoints(issuer: string) {
  const authority = issuer.replace(/\/v2\.0$/, '');
  return {
    authorize: `${authority}/oauth2/v2.0/authorize`,
    token: `${authority}/oauth2/v2.0/token`,
    jwks: `${authority}/discovery/v2.0/keys`,
  };
}

function challenge(verifier: string) {
  return base64url(createHash('sha256').update(verifier).digest());
}

/** Starts a server-side OAuth authorization-code flow. The encrypted session cookie is still
 * created only after the callback verifies Entra's signed ID token. */
export function startEntraSignIn() {
  const settings = config();
  if (!settings) throw new Error('Microsoft sign-in is not configured.');
  const state: EntraState = {
    state: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
    verifier: randomBytes(48).toString('base64url'),
  };
  const parameters = new URLSearchParams({
    client_id: settings.clientId,
    response_type: 'code',
    redirect_uri: settings.redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state: state.state,
    nonce: state.nonce,
    code_challenge: challenge(state.verifier),
    code_challenge_method: 'S256',
  });
  return {
    authorizationUrl: `${endpoints(settings.issuer).authorize}?${parameters}`,
    stateCookie: base64url(JSON.stringify(state)),
  };
}

function readState(value: string | undefined): EntraState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as EntraState;
    return parsed.state && parsed.nonce && parsed.verifier ? parsed : null;
  } catch {
    return null;
  }
}

function same(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function completeEntraSignIn(input: {
  code: string;
  state: string;
  stateCookie?: string;
}) {
  const settings = config();
  const state = readState(input.stateCookie);
  if (!settings || !state || !same(input.state, state.state))
    throw new Error('Microsoft sign-in could not be verified.');

  const response = await fetch(endpoints(settings.issuer).token, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    cache: 'no-store',
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: settings.redirectUri,
      code_verifier: state.verifier,
    }),
  });
  const token = (await response.json()) as { id_token?: string };
  if (!response.ok || !token.id_token) throw new Error('Microsoft sign-in could not be completed.');

  const keys = createRemoteJWKSet(new URL(endpoints(settings.issuer).jwks));
  const { payload } = await jwtVerify(token.id_token, keys, {
    issuer: settings.issuer,
    audience: settings.clientId,
  });
  if (payload.nonce !== state.nonce || typeof payload.oid !== 'string')
    throw new Error('Microsoft sign-in could not be verified.');
  const email =
    typeof payload.preferred_username === 'string'
      ? payload.preferred_username
      : typeof payload.email === 'string'
        ? payload.email
        : null;
  if (!email) throw new Error('Your Microsoft account has no usable email address.');
  return { email: email.toLowerCase(), entraObjectId: payload.oid };
}

export const entraStateCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: STATE_LIFETIME_SECONDS,
};
