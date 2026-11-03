/** Start independent reads together; preserve their keys and resolved value types. */
export async function parallel<T extends Record<string, unknown>>(
  reads: T,
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  return Object.fromEntries(
    await Promise.all(Object.entries(reads).map(async ([key, value]) => [key, await value])),
  ) as { [K in keyof T]: Awaited<T[K]> };
}
