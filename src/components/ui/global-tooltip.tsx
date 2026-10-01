'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One styled tooltip for every screen (John, 1 Oct 2026). Any element with a `title`, and any
 * icon-only button or link with an `aria-label`, shows its text on hover or keyboard focus after a
 * short pause. The native browser tooltip is suppressed while ours shows, so a title never appears
 * twice. Controls that already draw their own (`.has-tooltip`) are left alone. Touch is ignored.
 */
type Tip = { text: string; x: number; y: number; below: boolean };

const ACTION =
  'button, a, [role="button"], [role="menuitem"], [role="tab"], summary, [draggable="true"]';

function tipFor(target: Element | null): { el: HTMLElement; text: string } | null {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body) {
    if (node.classList.contains('has-tooltip')) return null;
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

export function GlobalTooltip() {
  const [tip, setTip] = useState<Tip | null>(null);
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
      setTip(null);
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
        const below = r.top < 48;
        setTip({
          text: found.text,
          x: r.left + r.width / 2,
          y: below ? r.bottom + 6 : r.top - 6,
          below,
        });
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
    return () => {
      hide();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('dragstart', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[100] max-w-xs whitespace-pre-line rounded-md bg-[rgb(20_20_20/92%)] px-2 py-1 text-center text-[11px] font-medium leading-snug text-white shadow"
      style={{
        left: Math.min(Math.max(tip.x, 90), window.innerWidth - 90),
        top: tip.y,
        transform: tip.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
      }}
    >
      {tip.text}
    </div>
  );
}
