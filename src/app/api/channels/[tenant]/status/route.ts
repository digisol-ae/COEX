import { handleChannelCall } from '@/modules/channels/http';
import { providerFor } from '@/modules/channels/providers';
import { applyStatuses } from '@/modules/channels/services/channel-messages.service';

export const dynamic = 'force-dynamic';

/** Delivery receipts: sent, delivered, read or failed. */
export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  return handleChannelCall(request, tenant, async (body, auth) => {
    const parsed = providerFor(auth.provider).parseStatus(body);
    const result = await applyStatuses(parsed.items);
    return Response.json(
      { ...result, invalid: parsed.errors },
      {
        status: parsed.items.length ? 200 : 400,
      },
    );
  });
}
