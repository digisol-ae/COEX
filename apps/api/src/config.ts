import { z } from 'zod';

/**
 * Everything the API reads from the environment, checked once at start so a missing value stops the
 * process with a clear message instead of failing on the first request.
 *
 * It reads the same variables the web app and the workers read (the same `.env.local` or `.env`),
 * so there is nothing new to configure beyond the port.
 */

const schema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is not set'),
  API_PORT: z.coerce.number().int().positive().default(3002),
  /** Loopback only: the API is reached through Apache, never directly from outside. */
  API_HOST: z.string().default('127.0.0.1'),
  /** The public address of the app; the origin of browser requests that are allowed to write. */
  COEX_APP_URL: z.string().url().optional(),
  AUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export interface ApiConfig {
  port: number;
  host: string;
  /** Origins whose browsers may send state changing requests. */
  allowedOrigins: string[];
  production: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    throw new Error(
      `Invalid API configuration: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }

  const appUrl = parsed.data.COEX_APP_URL ?? parsed.data.AUTH_URL ?? 'https://coex.digisol.ae';
  const origins = new Set([new URL(appUrl).origin]);

  // The development server, so the local web app may write through a local API.
  if (parsed.data.NODE_ENV !== 'production') origins.add('http://localhost:3100');

  return {
    port: parsed.data.API_PORT,
    host: parsed.data.API_HOST,
    allowedOrigins: [...origins],
    production: parsed.data.NODE_ENV === 'production',
  };
}
