import { asUser, getSignedInUser } from '@/lib/session';
import { columns, isEntity } from '@/modules/data-transfer/spec';
import { toCsv } from '@/modules/data-transfer/csv';
import { assertTransferAccess, exportRecords } from '@/modules/data-transfer/service';
export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const actor = await getSignedInUser();
  if (!actor || actor.role === 'client_contact')
    return Response.json({ error: 'Staff sign-in required.' }, { status: 401 });
  const { entity } = await params;
  if (!isEntity(entity)) return Response.json({ error: 'Unknown record type.' }, { status: 404 });
  const template = new URL(request.url).searchParams.get('template') === '1';
  try {
    const csv = await asUser(actor, async () => {
      await assertTransferAccess(entity, template);
      return template ? toCsv(columns(entity), []) : exportRecords(entity);
    });
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="coex-${entity}-${template ? 'template' : new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Export failed.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
