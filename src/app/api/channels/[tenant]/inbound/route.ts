import { handleChannelCall } from '@/modules/channels/http';
import { providerFor } from '@/modules/channels/providers';
import { storeInbound } from '@/modules/channels/services/channel-messages.service';
import { processPendingSupportInbound } from '@/modules/channels/services/support-inbound.service';

export const dynamic = 'force-dynamic';

/** Incoming WhatsApp messages from XVERSE. Signed; see docs/M6-CHANNELS-SPEC.md section 4. */
export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return handleChannelCall(request, tenant, async (body, auth) => {
    const parsed = providerFor(auth.provider).parseInbound(body);
    const result = await storeInbound(parsed.items);
    // Best effort: tickets are created now; anything that fails is retried by the channel worker.
    if (result.stored) await processPendingSupportInbound().catch(() => undefined);
    const status = parsed.items.length ? 200 : 400;
    return Response.json({ ...result, invalid: parsed.errors }, { status });
  });
}
