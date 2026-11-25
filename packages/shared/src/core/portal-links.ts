/** Slugs identify a workspace; permissions still come from its authenticated membership. */
export function portalPath(slug?: string) {
  return slug ? `/portal/${encodeURIComponent(slug)}` : '/portal';
}
export function portalAuthPath(path: string, slug?: string) {
  return slug ? `${path}?tenant=${encodeURIComponent(slug)}` : path;
}
export function assertPortalFormTenant(currentTenantId: string, submittedTenantId: unknown) {
  if (typeof submittedTenantId !== 'string' || currentTenantId !== submittedTenantId)
    throw new Error(
      'This form belongs to another company or session. Reload the correct company portal before submitting.',
    );
}
