'use client';
import NextImage from 'next/image';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';
import type { WebsiteContent } from './website-schema';
const Context = createContext<WebsiteContent | undefined>(undefined);
export const useWebsiteContent = () => useContext(Context);
export function WebsiteProvider({
  value,
  children,
}: {
  value?: WebsiteContent;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function WebsiteText({ value }: { value: string }) {
  const c = useWebsiteContent();
  const replacement = c?.texts[value.trim()];
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
  const replacement = typeof props.src === 'string' ? c?.images[props.src] : undefined;
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
  const href = typeof props.href === 'string' ? (c?.links[props.href] ?? props.href) : props.href;
  return <NextLink {...props} href={href} />;
}
export function WebsiteAnchor(props: ComponentProps<'a'>) {
  const c = useWebsiteContent();
  return <a {...props} href={props.href ? (c?.links[props.href] ?? props.href) : undefined} />;
}
