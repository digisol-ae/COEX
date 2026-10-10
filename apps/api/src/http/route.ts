import { Router, type RequestHandler, type Request } from 'express';
import { z, type ZodType } from 'zod';
import type { Permission } from '@coex/shared/core/permissions';
import type { AuthenticatedUser } from '@/modules/core/services/auth-context.service';
import { authenticate, requirePermission } from './middleware';

/**
 * Routes are declared as data, not wired by hand.
 *
 * One declaration gives the route its middleware (sign in, permission), checks the query, path
 * parameters and body against their schemas, shapes the response through its schema (which also
 * strips any field the schema does not name, so a service can never leak one by accident), and is
 * what the OpenAPI document is generated from. The frontend and backend developers work from that
 * document, so a route that is not declared here does not exist.
 */

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteContext<Q, B, P> {
  query: Q;
  body: B;
  params: P;
  /** Present on every route that is not public. */
  auth: AuthenticatedUser;
  req: Request;
}

export interface RouteDefinition<
  Q extends ZodType = ZodType<unknown>,
  B extends ZodType = ZodType<unknown>,
  P extends ZodType = ZodType<unknown>,
  R extends ZodType = ZodType<unknown>,
> {
  method: HttpMethod;
  /** Relative to /api/v2, for example '/leads' or '/leads/:id'. */
  path: string;
  tag: string;
  summary: string;
  /** No sign in. Only the health check and the OpenAPI document are public. */
  public?: boolean;
  /** Needed on top of being signed in. */
  permission?: Permission;
  query?: Q;
  body?: B;
  params?: P;
  response: R;
  status?: number;
  handler: (context: RouteContext<z.output<Q>, z.output<B>, z.output<P>>) => Promise<z.input<R>>;
}

// A route declares its own schema types; the registry only needs to treat them uniformly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRoute = RouteDefinition<any, any, any, any>;

export function defineRoute<
  Q extends ZodType = ZodType<unknown>,
  B extends ZodType = ZodType<unknown>,
  P extends ZodType = ZodType<unknown>,
  R extends ZodType = ZodType<unknown>,
>(definition: RouteDefinition<Q, B, P, R>): RouteDefinition<Q, B, P, R> {
  return definition;
}

export function mountRoutes(routes: AnyRoute[]): Router {
  const router = Router();

  for (const route of routes) {
    const chain: RequestHandler[] = [];

    if (!route.public) {
      chain.push(authenticate);
      if (route.permission) chain.push(requirePermission(route.permission));
    }

    chain.push(async (req, res, next) => {
      try {
        const result = await route.handler({
          query: route.query ? route.query.parse(req.query) : undefined,
          body: route.body ? route.body.parse(req.body) : undefined,
          params: route.params ? route.params.parse(req.params) : undefined,
          auth: req.auth as AuthenticatedUser,
          req,
        });

        // Parsing through the response schema is what strips fields it does not name.
        res.status(route.status ?? 200).json(route.response.parse(result));
      } catch (error) {
        next(error);
      }
    });

    router[route.method](route.path, ...chain);
  }

  return router;
}
