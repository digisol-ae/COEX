/** Turnstile is enabled only when configured; partial configuration fails closed. */
export async function verifyCaptcha(form: FormData, action: string): Promise<void> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!siteKey && !secret) return;
  if (!siteKey || !secret)
    throw new Error('Security check is unavailable. Please contact support.');
  const token = form.get('cf-turnstile-response');
  if (typeof token !== 'string' || !token || token.length > 2048)
    throw new Error('Please complete the security check.');
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    const hosts = (process.env.TURNSTILE_HOSTNAMES ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean);
    if (
      !response.ok ||
      result.success !== true ||
      result.action !== action ||
      !hosts.length ||
      !hosts.includes(result.hostname ?? '')
    )
      throw new Error('Invalid verification');
  } catch {
    throw new Error('Security check failed or expired. Please try again.');
  }
}
