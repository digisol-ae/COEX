import {
  copilotOptions,
  copilotPrepare,
  copilotCreate,
} from '@/modules/integrations/teams/copilot.service';
import { TeamsTabError } from '@/modules/integrations/teams/tab.service';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
async function handle(request: Request, context: { params: Promise<{ operation: string }> }) {
  if (process.env.COEX_COPILOT_ENABLED !== 'true')
    return Response.json(
      { error: 'Copilot task creation is not enabled.' },
      { status: 503, headers },
    );
  const { operation } = await context.params;
  const read = request.method === 'GET' && operation === 'options';
  const write = request.method === 'POST' && ['preview', 'create'].includes(operation);
  if (!read && !write) return Response.json({ error: 'Not found.' }, { status: 404, headers });
  const auth = request.headers.get('authorization') ?? '';
  if (!/^Bearer [^\s]+$/i.test(auth) || auth.length > 24007)
    return Response.json(
      { error: 'Sign in with your linked Worktello staff account.' },
      { status: 401, headers },
    );
  try {
    const token = auth.slice(7);
    if (read) return Response.json(await copilotOptions(token), { headers });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return Response.json({ error: 'Send JSON task details.' }, { status: 415, headers });
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: 'Task details are required.' }, { status: 400, headers });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 32 * 1024) {
        await reader.cancel();
        return Response.json({ error: 'Task details are too large.' }, { status: 413, headers });
      }
      chunks.push(chunk.value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return Response.json({ error: 'Check the task details.' }, { status: 400, headers });
    }
    return Response.json(
      await (operation === 'preview' ? copilotPrepare(token, body) : copilotCreate(token, body)),
      { headers },
    );
  } catch (cause) {
    const known = cause instanceof TeamsTabError;
    return Response.json(
      {
        error: known
          ? cause.message
          : 'Unable to complete this request. Check your tasks before retrying creation.',
      },
      { status: known ? cause.status : 500, headers },
    );
  }
}
export const GET = handle;
export const POST = handle;
