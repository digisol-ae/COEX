'use client';
import NextImage from 'next/image';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';
import type { WebsiteContent } from './website-schema';
const Selection = createContext<((key: string) => void) | undefined>(undefined);
const Scope = createContext('');
export function WebsiteScope({ name, children }: { name: string; children: ReactNode }) {
  return <Scope.Provider value={name}>{children}</Scope.Provider>;
}
const Context = createContext<WebsiteContent | undefined>(undefined);
export const useWebsiteContent = () => useContext(Context);
export function WebsiteProvider({
  value,
  children,
  onSelect,
}: {
  value?: WebsiteContent;
  children: ReactNode;
  onSelect?: (key: string) => void;
}) {
  return (
    <Selection.Provider value={onSelect}>
      <Context.Provider value={value}>{children}</Context.Provider>
    </Selection.Provider>
  );
}
export function WebsiteText({ value }: { value: string }) {
  const c = useWebsiteContent();
  const select = useContext(Selection);
  const scope = useContext(Scope);
  const field = scope + '::' + value.trim();
  const replacement = c?.texts[field] ?? c?.texts[value.trim()];
  if (select)
    return (
      <span
        data-website-copy={field}
        onClick={() => select(field)}
        style={{ cursor: 'text' }}
        title="Edit this text"
      >
        {replacement ?? value}
      </span>
    );
  return (
    <>
      {replacement === undefined
        ? value
        : value.match(/^\s*/)?.[0] + replacement + (value.match(/\s*$/)?.[0] ?? '')}
    </>
  );
}
export function WebsiteImage(props: ComponentProps<typeof NextImage>) {
  const c = useWebsiteContent();
  const scope = useContext(Scope);
  const replacement =
    typeof props.src === 'string'
      ? (c?.images[scope + '::' + props.src] ?? c?.images[props.src])
      : undefined;
  const src = replacement || props.src;
  return (
    <NextImage
      {...props}
      src={src}
      unoptimized={
        props.unoptimized || (typeof src === 'string' && src.startsWith('/api/website-media/'))
      }
    />
  );
}

import NextLink from 'next/link';
export function WebsiteLink(props: ComponentProps<typeof NextLink>) {
  const c = useWebsiteContent();
  const scope = useContext(Scope);
  const href =
    typeof props.href === 'string'
      ? (c?.links[scope + '::' + props.href] ?? c?.links[props.href] ?? props.href)
      : props.href;
  return <NextLink {...props} href={href} />;
}
export function WebsiteAnchor(props: ComponentProps<'a'>) {
  const c = useWebsiteContent();
  const scope = useContext(Scope);
  return (
    <a
      {...props}
      href={
        props.href
          ? (c?.links[scope + '::' + props.href] ?? c?.links[props.href] ?? props.href)
          : undefined
      }
    />
  );
}
