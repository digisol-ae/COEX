/** Verify browser writes against the local URL or the explicitly configured public site.
 * Reverse proxies can leave Request.url pointing at the internal HTTP listener. Forwarded
 * headers alone are not a trust source: an arbitrary supplied host must never allow a write.
 */
export function hasTrustedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  const trusted = [request.url, process.env.COEX_APP_URL || process.env.AUTH_URL];
  return trusted.some((value) => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && origin === url.origin;
    } catch {
      return false;
    }
  });
}
