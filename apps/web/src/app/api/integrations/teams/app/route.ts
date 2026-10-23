import {
  readTeamsTab,
  writeTeamsTab,
  TeamsTabError,
} from '@/modules/integrations/teams/tab.service';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
async function handle(request: Request, write: boolean) {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 24007)
    return Response.json(
      { error: 'Open COEX from Microsoft Teams to sign in.' },
      { status: 401, headers },
    );
  const token = authorization.slice(7);
  try {
    if (!write)
      return Response.json(
        await readTeamsTab(token, Object.fromEntries(new URL(request.url).searchParams)),
        { headers },
      );
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return Response.json({ error: 'Use a JSON form.' }, { status: 415, headers });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Complete the form.' }, { status: 400, headers });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32 * 1024) {
        await reader.cancel();
        return Response.json({ error: 'This update is too large.' }, { status: 413, headers });
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return Response.json({ error: 'Check the form and try again.' }, { status: 400, headers });
    }
    return Response.json(await writeTeamsTab(token, body), { headers });
  } catch (cause) {
    const known = cause instanceof TeamsTabError;
    return Response.json(
      {
        error: known
          ? cause.message
          : 'Unable to complete this request. Refresh your task list before trying again.',
      },
      { status: known ? cause.status : 500, headers },
    );
  }
}
export function GET(request: Request) {
  return handle(request, false);
}
export function POST(request: Request) {
  return handle(request, true);
}
