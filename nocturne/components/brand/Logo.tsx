import { APP_NAME } from '@/lib/constants';

/** Nocturne mark: a crescent cradling three sound bars. */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <mask id="nocturne-crescent">
          <rect width="32" height="32" fill="white" />
          <circle cx="21" cy="12" r="11" fill="black" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r="14" className="fill-accent" mask="url(#nocturne-crescent)" />
      <rect x="17" y="17" width="2.6" height="8" rx="1.3" className="fill-accent" />
      <rect x="21.2" y="13" width="2.6" height="12" rx="1.3" className="fill-accent" />
      <rect x="25.4" y="19" width="2.6" height="6" rx="1.3" className="fill-accent" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="size-8 shrink-0" />
      {!compact && <span className="text-xl font-extrabold tracking-tight text-text">{APP_NAME.toLowerCase()}</span>}
    </span>
  );
}
