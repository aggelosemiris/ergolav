'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, History, LogOut, Search, User2, X } from 'lucide-react';
import { useLibrary } from '@/store/library';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { openMenuFrom } from '@/components/ui/Menu';
import { buttonClass } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { toast } from '@/store/ui';

export async function signOut() {
  const { error } = await getBrowserSupabase().auth.signOut();
  if (error) toast('Could not log out. Try again.', { tone: 'error' });
}

function TopSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = pathname === '/search' ? (params.get('q') ?? '') : '';
  const [value, setValue] = useState(urlQ);
  const inputRef = useRef<HTMLInputElement>(null);

  // follow the URL (back/forward, clearing on other pages)
  const [seenQ, setSeenQ] = useState(urlQ);
  if (seenQ !== urlQ) {
    setSeenQ(urlQ);
    setValue(urlQ);
  }

  // "/" focuses search, like most media apps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const update = (v: string) => {
    setValue(v);
    const target = v ? `/search?q=${encodeURIComponent(v)}` : '/search';
    if (pathname === '/search') router.replace(target, { scroll: false });
    else router.push(target);
  };

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onFocus={() => {
          if (pathname !== '/search') router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search');
        }}
        placeholder="What do you want to hear?"
        aria-label="Search songs, artists, albums and playlists"
        maxLength={100}
        className="h-12 w-full rounded-full border border-transparent bg-surface-2 pr-10 pl-11 text-[15px] text-text placeholder:text-subtle transition hover:border-border hover:bg-surface-3 focus:border-text focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => update('')} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted hover:text-text">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}

export function TopBar({ scrollRoot }: { scrollRoot: React.RefObject<HTMLElement | null> }) {
  const router = useRouter();
  const user = useLibrary((s) => s.user);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const el = scrollRoot.current;
    if (!el) return;
    const onScroll = () => setSolid(el.scrollTop > 40);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRoot]);

  const accountMenu = (e: React.MouseEvent<HTMLButtonElement>) =>
    openMenuFrom(e.currentTarget, 'Account', [
      { label: 'Profile', icon: <User2 />, href: '/profile' },
      { label: 'Recently played', icon: <History />, href: '/history' },
      { label: 'Log out', icon: <LogOut />, separatorBefore: true, onSelect: () => void signOut() },
    ]);

  return (
    <header className={`sticky top-0 z-30 flex h-[var(--topbar-h)] items-center gap-3 px-4 transition-colors duration-200 sm:px-6 ${solid ? 'bg-surface/95 backdrop-blur' : 'bg-transparent'}`}>
      <Link href="/" className="md:hidden" aria-label="Nocturne home">
        <Logo />
      </Link>
      <div className="hidden items-center gap-2 md:flex">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className="inline-flex size-8 items-center justify-center rounded-full bg-black/40 text-text transition hover:bg-black/60">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => router.forward()} aria-label="Go forward" className="inline-flex size-8 items-center justify-center rounded-full bg-black/40 text-text transition hover:bg-black/60">
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <Suspense fallback={<div className="hidden h-12 w-full max-w-md md:block" />}>
        <TopSearch />
      </Suspense>
      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <button
            type="button"
            onClick={accountMenu}
            aria-label={`Account menu for ${user.displayName}`}
            aria-haspopup="menu"
            className="inline-flex size-9 items-center justify-center rounded-full bg-black/50 p-1 transition hover:scale-105"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-on-accent uppercase">{user.displayName.slice(0, 1)}</span>
          </button>
        ) : (
          <>
            <Link href="/signup" className="hidden px-3 text-sm font-bold text-muted transition hover:scale-105 hover:text-text sm:inline">
              Sign up
            </Link>
            <Link href="/login" className={buttonClass('light', 'md')}>
              Log in
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
