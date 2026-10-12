import { runWithContext } from '@/lib/tenant-context';
import { authenticateChannelRequest } from './services/channel-messages.service';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Shared handling for every call from XVERSE: read the raw body (the signature covers the exact
 * bytes), authenticate, then run `work` in the tenant's context. Errors never leak internals.
 */
export async function handleChannelCall(
  request: Request,
  slug: string,
  work: (body: unknown, auth: { provider: string; delivery: string }) => Promise<Response>,
): Promise<Response> {
  const raw = request.method === 'GET' ? '' : await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'Request too large.' }, { status: 413 });
  }

  const auth = await authenticateChannelRequest(slug, request.headers, raw);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: 'The body is not valid JSON.' }, { status: 400 });
    }
  }

  try {
    return await runWithContext(auth.context, () =>
      work(body, { provider: auth.provider, delivery: auth.delivery }),
    );
  } catch (error) {
    console.error('channels: request failed', error);
    return Response.json({ error: 'COEX could not process the request.' }, { status: 500 });
  }
}
