'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { FullPlayer, MiniPlayer, PlayerBar } from '@/components/player/PlayerBar';
import { usePlayer } from '@/store/player';

/** Global keyboard shortcuts for the player (ignored while typing). */
function usePlayerShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      // let focused controls and open menus/dialogs handle their own keys
      if (t.closest('button, a, [role="menu"], dialog, [role="dialog"]')) return;
      const p = usePlayer.getState();
      if (e.key === ' ') {
        if (!p.current) return;
        e.preventDefault();
        p.togglePlay();
      } else if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        p.next();
      } else if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        p.previous();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  usePlayerShortcuts();

  // new page, start at the top of the scroll container
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col gap-2 md:p-2">
      <div className="flex min-h-0 flex-1 gap-2">
        <Sidebar />
        <div
          ref={mainRef}
          className="scroll-thin relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-bg pb-[calc(var(--player-h)+16px)] md:rounded-lg md:bg-surface md:pb-8"
        >
          <TopBar scrollRoot={mainRef} />
          <main id="main" tabIndex={-1} className="px-4 outline-none sm:px-6">
            {children}
          </main>
        </div>
      </div>
      <PlayerBar />
      <MiniPlayer />
      <MobileNav />
      <FullPlayer />
    </div>
  );
}
