import { publicWebsiteDelivery } from '@/modules/core/services/website-delivery.service';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET() {
  try {
    return Response.json(await publicWebsiteDelivery(), { headers });
  } catch {
    return Response.json({ error: 'Website content unavailable' }, { status: 503, headers });
  }
}
