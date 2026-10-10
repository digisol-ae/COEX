import type { AnyRoute } from '../http/route';
import { createAuthRoutes, type AuthRouteLimits } from './auth';
import { leadRoutes } from './leads';
import { systemRoutes } from './system';

/**
 * Every route the API serves. A module's routes are added here as the module moves over.
 * The limits are a parameter only so the tests can use small ones.
 */
export function buildRoutes(options: { authLimits?: AuthRouteLimits } = {}): AnyRoute[] {
  return [...systemRoutes, ...createAuthRoutes(options.authLimits), ...leadRoutes];
}
