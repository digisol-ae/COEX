import { it, expect } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  WebsiteProvider,
  WebsiteScope,
  WebsiteText,
  WebsiteAnchor,
} from '@/components/landing/website-content';
import type { WebsiteContent } from '@/components/landing/website-schema';
import defaults from '@/components/landing/website-defaults.json';
import assets from '@/components/landing/website-assets.json';
import sections from '@/components/website-manager/sections.json';
const base: WebsiteContent = {
  texts: {},
  links: {},
  images: {},
  faq: [],
  seo: { title: 'Title', description: '', image: '' },
};
it('preserves legacy copy while allowing independent section edits', () => {
  const content = { ...base, texts: { Shared: 'Legacy', 'hero::Shared': 'Hero only' } };
  const html = renderToStaticMarkup(
    h(
      WebsiteProvider,
      { value: content, children: null },
      h(WebsiteScope, { name: 'hero', children: null }, h(WebsiteText, { value: 'Shared' })),
      h(WebsiteScope, { name: 'footer', children: null }, h(WebsiteText, { value: 'Shared' })),
    ),
  );
  expect(html).toBe('Hero onlyLegacy');
  expect(html).not.toContain('<span');
});
it('keeps section button destinations independent and preserves old destinations', () => {
  const content = { ...base, links: { '/register': '/legacy', 'hero::/register': '/new' } };
  const link = () => h(WebsiteAnchor, { href: '/register' }, 'Start');
  const html = renderToStaticMarkup(
    h(
      WebsiteProvider,
      { value: content, children: null },
      h(WebsiteScope, { name: 'hero', children: null }, link()),
      h(WebsiteScope, { name: 'footer', children: null }, link()),
    ),
  );
  expect(html).toContain('href="/new"');
  expect(html).toContain('href="/legacy"');
});
it('escapes edited copy and only attaches selection affordances in a private editor preview', () => {
  const content = { ...base, texts: { 'hero::Shared': '<script>alert(1)</script>' } };
  const html = renderToStaticMarkup(
    h(
      WebsiteProvider,
      { value: content, onSelect: () => {}, children: null },
      h(WebsiteScope, { name: 'hero', children: null }, h(WebsiteText, { value: 'Shared' })),
    ),
  );
  expect(html).toContain('data-website-copy="hero::Shared"');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
});
it('only exposes labelled, bound fields rather than arbitrary stored text entries', () => {
  for (const section of sections)
    for (const group of section.groups)
      for (const field of group.fields) {
        expect(Object.hasOwn(defaults, field.key), section.id + ': ' + field.label).toBe(true);
        expect(field.label.length).toBeLessThan(45);
      }
});

it('binds image cards to real website images', () => {
  for (const section of sections)
    for (const image of section.images ?? []) expect(assets).toContain(image.source);
});
