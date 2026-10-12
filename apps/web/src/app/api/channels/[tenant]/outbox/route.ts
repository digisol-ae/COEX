import { handleChannelCall } from '@/modules/channels/http';
import { leaseOutbox } from '@/modules/channels/services/channel-messages.service';

export const dynamic = 'force-dynamic';

/**
 * Case B: XVERSE collects messages to send. Each one is held for two minutes and must be
 * acknowledged at /outbox/ack; an unacknowledged message is offered again, up to six times.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return handleChannelCall(request, tenant, async (_body, auth) => {
    if (auth.delivery !== 'pull') {
      return Response.json(
        { error: 'This tenant is set to "COEX sends"; there is nothing to collect.' },
        { status: 409 },
      );
    }
    const limit = Number(new URL(request.url).searchParams.get('limit')) || 50;
    return Response.json({ messages: await leaseOutbox(limit) });
  });
}
