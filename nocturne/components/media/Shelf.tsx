'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** A titled, horizontally scrollable row of cards with scroll buttons on wide screens. */
export function Shelf({ title, href, children, id }: { title: string; href?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const headingId = id ?? `shelf-${title.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <section aria-labelledby={headingId} className="mb-8">
      <div className="mb-2 flex items-end justify-between gap-4 px-1">
        <h2 id={headingId} className="text-xl font-extrabold tracking-tight sm:text-2xl">
          {href ? (
            <Link href={href} className="hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <div className="flex items-center gap-1">
          {href && (
            <Link href={href} className="mr-2 text-sm font-bold text-muted hover:text-text hover:underline">
              Show all
            </Link>
          )}
          <button type="button" aria-label={`Scroll ${title} back`} onClick={() => scroll(-1)} disabled={edges.start} className="hidden size-8 items-center justify-center rounded-full bg-surface-2 text-text transition hover:bg-surface-3 disabled:opacity-30 md:inline-flex">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label={`Scroll ${title} forward`} onClick={() => scroll(1)} disabled={edges.end} className="hidden size-8 items-center justify-center rounded-full bg-surface-2 text-text transition hover:bg-surface-3 disabled:opacity-30 md:inline-flex">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth px-0 pb-1">
        {children}
      </div>
    </section>
  );
}

/** Fixed-width slot for a card inside a Shelf. */
export function ShelfItem({ children }: { children: ReactNode }) {
  return <div className="w-[42vw] max-w-[200px] min-w-[140px] shrink-0 snap-start sm:w-[180px] lg:w-[196px]">{children}</div>;
}
