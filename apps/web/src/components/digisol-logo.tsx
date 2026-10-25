import Image from 'next/image';

/** Workspace identity; the Worktello product mark stays in the icon rail. */
export function DigisolLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-long.png"
      alt="DigiSol"
      width={3671}
      height={1240}
      priority={priority}
      unoptimized
      className="block h-10 w-44 max-w-full shrink-0 object-contain brightness-0 dark:invert"
    />
  );
}
