/**
 * Initials in a coloured circle.
 *
 * The colour comes from the person's name rather than being stored, so it is stable everywhere
 * without a field to maintain, and a team of ten reads as ten people rather than ten grey discs.
 * Nobody uploads a photograph to an internal tool, so there is no point designing around one.
 */

const PERSON_COLOURS = [
  'var(--color-person-1)',
  'var(--color-person-2)',
  'var(--color-person-3)',
  'var(--color-person-4)',
  'var(--color-person-5)',
  'var(--color-person-6)',
];

function colourFor(name: string): string {
  let total = 0;
  for (const character of name) total += character.charCodeAt(0);

  return PERSON_COLOURS[total % PERSON_COLOURS.length];
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'small' }) {
  return (
    <span
      title={name}
      className={
        size === 'small'
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white'
          : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white'
      }
      style={{ backgroundColor: colourFor(name) }}
    >
      {initialsOf(name)}
    </span>
  );
}
