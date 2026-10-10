import { ackSchema, parseBatch } from '@coex/shared/channels/canonical';
import { handleChannelCall } from '@/modules/channels/http';
import { acknowledgeOutbox } from '@/modules/channels/services/channel-messages.service';

export const dynamic = 'force-dynamic';

/** Case B: XVERSE reports each collected message as sent (with its own id) or failed. */
export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return handleChannelCall(request, tenant, async (body) => {
    const parsed = parseBatch(body, 'acks', ackSchema);
    const result = await acknowledgeOutbox(parsed.items);
    return Response.json(
      { ...result, invalid: parsed.errors },
      {
        status: parsed.items.length ? 200 : 400,
      },
    );
  });
}
