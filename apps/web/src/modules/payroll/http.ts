import { asUser, getSignedInUser } from '@/lib/session';
export const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie',
};
export async function payrollResponse(work: () => Promise<Response>) {
  const user = await getSignedInUser();
  if (!user || user.role === 'client_contact')
    return Response.json(
      { error: 'Sign in as staff first.' },
      { status: 401, headers: privateHeaders },
    );
  try {
    return await asUser(user, work);
  } catch {
    return Response.json(
      { error: 'Payroll record unavailable or access denied.' },
      { status: 403, headers: privateHeaders },
    );
  }
}
