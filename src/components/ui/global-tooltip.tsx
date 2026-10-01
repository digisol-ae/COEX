'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * One styled tooltip for every screen (John, 1 Oct 2026). Any element with a `title` or a
 * `data-tooltip`, and any icon-only button or link with an `aria-label`, shows its text on hover or
 * keyboard focus after a short pause. The native browser tooltip is suppressed while ours shows, so
 * a title never appears twice. Touch is ignored.
 *
 * The tooltip is measured before it is shown and kept inside the window: above its control when
 * there is room, otherwise below, and slid sideways near the left or right edge. It sits in the
 * browser's top layer, so it also shows over an open dialog.
 */
type Anchor = { text: string; left: number; right: number; top: number; bottom: number };
type Place = { left: number; top: number };

const ACTION =
  'button, a, [role="button"], [role="menuitem"], [role="tab"], summary, [draggable="true"]';
const GAP = 6;
const MARGIN = 8;

function tipFor(target: Element | null): { el: HTMLElement; text: string } | null {
  // The pointer is usually over an icon's SVG, not the button itself, so start from any element.
  let node: Element | null = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    if (!(node instanceof HTMLElement)) {
      node = node.parentElement;
      continue;
    }
    const drawn = node.dataset.tooltip;
    if (drawn && drawn.trim()) return { el: node, text: drawn.trim() };
    const stored = node.dataset.tipTitle;
    const title = stored ?? node.getAttribute('title');
    if (title && title.trim()) return { el: node, text: title.trim() };
    if (node.matches(ACTION)) {
      const label = node.getAttribute('aria-label');
      if (label && !(node.textContent ?? '').trim()) return { el: node, text: label };
    }
    node = node.parentElement;
  }
  return null;
}

function placeWithin(anchor: Anchor, width: number, height: number): Place {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const centre = (anchor.left + anchor.right) / 2;

  const left = Math.min(
    Math.max(centre - width / 2, MARGIN),
    Math.max(MARGIN, viewportWidth - width - MARGIN),
  );

  const above = anchor.top - GAP - height;
  const below = anchor.bottom + GAP;
  let top = above >= MARGIN ? above : below;
  if (top + height > viewportHeight - MARGIN) {
    top = Math.max(MARGIN, viewportHeight - height - MARGIN);
  }
  return { left, top };
}

export function GlobalTooltip() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const restore = () => {
      const el = current.current;
      if (el && el.dataset.tipTitle !== undefined) {
        el.setAttribute('title', el.dataset.tipTitle);
        delete el.dataset.tipTitle;
      }
      current.current = null;
    };
    const hide = () => {
      if (timer.current) clearTimeout(timer.current);
      restore();
      setAnchor(null);
    };
    const show = (target: EventTarget | null) => {
      const found = tipFor(target as Element | null);
      if (!found) return hide();
      if (found.el === current.current) return;
      hide();
      current.current = found.el;
      if (found.el.hasAttribute('title')) {
        found.el.dataset.tipTitle = found.el.getAttribute('title') ?? '';
        found.el.removeAttribute('title');
      }
      timer.current = setTimeout(() => {
        const r = found.el.getBoundingClientRect();
        setAnchor({ text: found.text, left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }, 350);
    };
    const over = (e: PointerEvent) => (e.pointerType === 'touch' ? undefined : show(e.target));
    const focus = (e: FocusEvent) => {
      if ((e.target as HTMLElement)?.matches?.(':focus-visible')) show(e.target);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('dragstart', hide);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('dragstart', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // Measured after it renders invisibly, then placed before the browser paints.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !anchor) return;
    try {
      if (!el.matches(':popover-open')) el.showPopover();
    } catch {
      // Older browsers without popover still get a fixed tooltip, just not over dialogs.
    }
    const place = placeWithin(anchor, el.offsetWidth, el.offsetHeight);
    el.style.left = `${place.left}px`;
    el.style.top = `${place.top}px`;
    el.style.visibility = 'visible';
  }, [anchor]);

  if (!anchor) return null;
  return (
    <div
      ref={box}
      popover="manual"
      role="tooltip"
      className="pointer-events-none fixed z-[100] m-0 max-w-[min(20rem,calc(100vw-16px))] overflow-visible rounded-md border-0 bg-[rgb(20_20_20/92%)] px-2 py-1 text-center text-[11px] leading-snug font-medium whitespace-pre-line text-white shadow"
      style={{
        inset: 'auto',
        left: 0,
        top: 0,
        visibility: 'hidden',
      }}
    >
      {anchor.text}
    </div>
  );
}
