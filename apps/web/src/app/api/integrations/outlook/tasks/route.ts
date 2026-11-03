import { getSignedInUser, asUser } from '@/lib/session';
import { outlookChoices, createOutlookTask } from '@/modules/integrations/outlook/outlook.service';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
async function actor() {
  const user = await getSignedInUser();
  return user && user.role !== 'client_contact' && user.permissions.includes('task.manage')
    ? user
    : null;
}
export async function GET() {
  const user = await actor();
  if (!user)
    return Response.json(
      { error: 'Sign in with a staff account that can create tasks.' },
      { status: 401, headers },
    );
  return Response.json(
    await asUser(user, () => outlookChoices(user.permissions.includes('customer.read'))),
    { headers },
  );
}
export async function POST(request: Request) {
  const user = await actor();
  if (!user)
    return Response.json(
      { error: 'Sign in with a staff account that can create tasks.' },
      { status: 401, headers },
    );
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Request origin denied.' }, { status: 403, headers });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'Missing form.' }, { status: 400, headers });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 15 * 1024 * 1024) {
      await reader.cancel();
      return Response.json({ error: 'Email attachments are too large.' }, { status: 413, headers });
    }
    chunks.push(value);
  }
  try {
    return Response.json(
      await asUser(user, () =>
        createOutlookTask(
          JSON.parse(Buffer.concat(chunks).toString('utf8')),
          user.permissions.includes('customer.read'),
        ),
      ),
      { headers },
    );
  } catch (error) {
    console.error('Outlook task creation failed', error);
    return Response.json(
      {
        error:
          'Could not create the task. Check the destination, assignees and file limits. If you retried this email, check your tasks before submitting again.',
      },
      { status: 400, headers },
    );
  }
}
