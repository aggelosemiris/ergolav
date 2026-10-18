import type { ReactNode } from 'react';

/** Big header for album, playlist, artist and collection pages, tinted from the artwork's colour. */
export function DetailHeader({ art, kind, title, meta, tint, description }: { art: ReactNode; kind: string; title: string; meta: ReactNode; tint: string; description?: ReactNode }) {
  const size = title.length > 28 ? 'text-3xl sm:text-4xl lg:text-5xl' : title.length > 14 ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-5xl sm:text-6xl lg:text-7xl';
  return (
    <header
      className="relative -mx-4 -mt-[var(--topbar-h)] px-4 pt-[calc(var(--topbar-h)+24px)] pb-6 sm:-mx-6 sm:px-6"
      style={{ backgroundImage: `linear-gradient(to bottom, ${tint}cc 0%, ${tint}55 60%, transparent 100%)` }}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div className="w-48 shrink-0 shadow-pop sm:w-52 lg:w-56">{art}</div>
        <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <span className="text-sm font-semibold">{kind}</span>
          <h1 className={`${size} line-clamp-3 font-black tracking-tight break-words [text-wrap:balance]`}>{title}</h1>
          {description && <div className="line-clamp-2 max-w-2xl text-sm text-muted">{description}</div>}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-text/90 sm:justify-start">{meta}</div>
        </div>
      </div>
    </header>
  );
}

export function Dot() {
  return <span aria-hidden="true" className="text-muted">•</span>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-4 py-5">{children}</div>;
}
