import { GROUPS } from './navigation';

/** Group destinations keep their parent active; Tasks and Spaces retain separate rail entries. */
export function isRailActive(pathname: string, href: string, group?: string): boolean {
  const routes =
    group && group !== 'tasks'
      ? [href, ...(GROUPS.find((item) => item.id === group)?.items.map((item) => item.href) ?? [])]
      : href === '/tasks'
        ? [href, '/personal']
        : [href];
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
