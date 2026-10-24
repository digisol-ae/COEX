import { z } from 'zod';
import type { AnyRoute } from './route';

/**
 * The OpenAPI 3.0 document, generated from the declared routes and their zod schemas, so the
 * contract the developers read is never a second thing to keep in step with the code.
 */

type JsonSchema = Record<string, unknown>;

function schemaOf(schema: z.ZodType, io: 'input' | 'output'): JsonSchema {
  const { $schema, ...rest } = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  }) as JsonSchema;
  void $schema;
  return rest;
}

function parametersOf(schema: z.ZodType | undefined, where: 'query' | 'path') {
  if (!schema) return [];

  const json = schemaOf(schema, 'input');
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set((json.required ?? []) as string[]);

  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: where,
    required: where === 'path' || required.has(name),
    schema: property,
  }));
}

export function buildOpenApi(routes: AnyRoute[], version: string) {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    const path = `/api/v2${route.path}`.replace(/:(\w+)/g, '{$1}');
    paths[path] ??= {};

    paths[path][route.method] = {
      tags: [route.tag],
      summary: route.summary,
      description: route.public
        ? 'Public.'
        : `Requires sign in${route.permission ? ` and the permission \`${route.permission}\`` : ''}.`,
      parameters: [...parametersOf(route.query, 'query'), ...parametersOf(route.params, 'path')],
      ...(route.body
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: schemaOf(route.body, 'input') } },
            },
          }
        : {}),
      responses: {
        ...(route.redirect
          ? { '302': { description: 'Redirects the browser' } }
          : {
              [String(route.status ?? 200)]: {
                description: 'Success',
                content: { 'application/json': { schema: schemaOf(route.response, 'output') } },
              },
            }),
        ...(route.public
          ? {}
          : {
              '401': { description: 'Not signed in' },
              ...(route.permission ? { '403': { description: 'Permission missing' } } : {}),
            }),
        '422': { description: 'The service refused; the message says why' },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Worktello API',
      version,
      description:
        'The Worktello Express API. It reads the same session cookie as the web app. Errors are `{ error: { code, message } }`.',
    },
    paths,
  };
}
