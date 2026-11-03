/* eslint-disable @next/next/no-img-element -- Embedded tenant logo is part of the frozen agreement. */
import type { TenantLetterhead } from '@coex/shared/crm/letterhead';

export function LetterheadHeader({ letterhead }: { letterhead: TenantLetterhead }) {
  return (
    <header
      className="flex flex-col items-start justify-between gap-5 border-b-2 pb-5 sm:flex-row sm:flex-wrap"
      style={{ borderColor: letterhead.color }}
    >
      {letterhead.logoDataUrl && (
        <img
          src={letterhead.logoDataUrl}
          alt={`${letterhead.name} logo`}
          style={{ maxWidth: 'min(260px, 100%)', maxHeight: 100, objectFit: 'contain' }}
        />
      )}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1 sm:text-right" style={{ overflowWrap: 'anywhere' }}>
        <p className="text-xl font-semibold" style={{ color: letterhead.color }}>
          {letterhead.name}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{letterhead.address}</p>
        {letterhead.contact && (
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{letterhead.contact}</p>
        )}
      </div>
    </header>
  );
}

export function LetterheadFooter({ letterhead }: { letterhead: TenantLetterhead }) {
  return (
    <footer
      className="whitespace-pre-wrap break-words border-t pt-4 text-center text-xs"
      style={{ borderColor: letterhead.color }}
    >
      {letterhead.footer || letterhead.name}
    </footer>
  );
}
