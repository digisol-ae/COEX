import { loadTeamsForm, teamsConfig } from '@/modules/integrations/teams/teams.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  const settings = teamsConfig();
  if (!settings) return Response.json({ error: 'Unavailable' }, { status: 503, headers });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Invalid form' }, { status: 400, headers });
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32 * 1024) {
      await reader.cancel();
      return Response.json({ error: 'Too large' }, { status: 413, headers });
    }
    chunks.push(value);
  }
  try {
    const { draft } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof draft !== 'string' || draft.length > 24000) throw new Error('Invalid form');
    return Response.json(await loadTeamsForm(draft, settings), { headers });
  } catch {
    return Response.json({ error: 'Form expired or access denied' }, { status: 403, headers });
  }
}
