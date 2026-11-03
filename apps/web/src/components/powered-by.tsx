import Image from 'next/image';

export function PoweredBy({ rail = false }: { rail?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 ${rail ? 'items-start text-[var(--color-rail-ink-muted)]' : 'items-center text-[var(--color-ink-muted)]'}`}
    >
      <span className="text-xs">Powered by</span>
      <a
        href="https://www.digisol.ae"
        aria-label="Visit DigiSol website"
        className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <Image
          src="/brand/logo-long.png"
          alt="DigiSol logo"
          width={3671}
          height={1240}
          className="h-auto w-20 max-w-full object-contain"
          unoptimized
        />
      </a>
      <span className="text-[11px] opacity-80">&copy; Digisol LLC-FZ</span>
    </div>
  );
}
