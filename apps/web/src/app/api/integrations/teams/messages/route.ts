import {
  activitySchema,
  messageResponse,
  verifyConnector,
} from '@/modules/integrations/teams/teams-protocol';
import { handleTeamsActivity, teamsConfig } from '@/modules/integrations/teams/teams.service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const settings = teamsConfig();
  if (!settings)
    return Response.json(
      { error: 'Teams integration is not configured.' },
      { status: 503, headers },
    );
  // Bound the stream itself; Content-Length alone cannot protect against chunked requests.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Invalid request.' }, { status: 400, headers });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 128 * 1024) {
      await reader.cancel();
      return Response.json({ error: 'Request too large.' }, { status: 413, headers });
    }
    chunks.push(value);
  }
  let activity;
  try {
    activity = activitySchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    return Response.json({ error: 'Unsupported Teams action.' }, { status: 400, headers });
  }
  try {
    await verifyConnector(request.headers.get('authorization'), activity, settings.appId);
  } catch {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers });
  }
  try {
    return Response.json(await handleTeamsActivity(activity, settings), { headers });
  } catch {
    // Never return database errors or log selected private message contents/tokens.
    return Response.json(
      messageResponse(
        'COEX could not finish this request. Check your task list before trying again. If no task was created, open a new form or contact your administrator.',
      ),
      { headers },
    );
  }
}
