import { clsx } from 'clsx';

/**
 * A coloured square carrying one or two letters, used for projects and tenants.
 *
 * The same trick as the person avatar: colour derived from the name, so it is stable everywhere
 * without a field to maintain. A list of projects then has landmarks rather than being sixteen
 * identical lines of text.
 */

const COLOURS = [
  'var(--color-person-1)',
  'var(--color-person-2)',
  'var(--color-person-3)',
  'var(--color-person-4)',
  'var(--color-person-5)',
  'var(--color-person-6)',
];

export function Monogram({
  name,
  size = 'normal',
  className,
}: {
  name: string;
  size?: 'normal' | 'small';
  className?: string;
}) {
  let total = 0;
  for (const character of name) total += character.charCodeAt(0);

  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-[6px] font-medium text-white',
        size === 'small' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]',
        className,
      )}
      style={{ backgroundColor: COLOURS[total % COLOURS.length] }}
    >
      {letters}
    </span>
  );
}
