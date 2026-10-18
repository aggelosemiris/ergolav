'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Search, User2 } from 'lucide-react';
import { useLibrary } from '@/store/library';

export function MobileNav() {
  const pathname = usePathname();
  const user = useLibrary((s) => s.user);
  const tabs = [
    { href: '/', label: 'Home', Icon: Home, match: (p: string) => p === '/' },
    { href: '/search', label: 'Search', Icon: Search, match: (p: string) => p.startsWith('/search') || p.startsWith('/genre') },
    { href: '/library', label: 'Your Library', Icon: Library, match: (p: string) => p.startsWith('/library') || p.startsWith('/collection') || p.startsWith('/history') },
    user
      ? { href: '/profile', label: 'Profile', Icon: User2, match: (p: string) => p.startsWith('/profile') }
      : { href: '/login', label: 'Log in', Icon: User2, match: (p: string) => p.startsWith('/login') },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 h-[var(--tabbar-h)] bg-gradient-to-t from-bg via-bg/95 to-bg/80 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid h-16 grid-cols-4">
        {tabs.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? 'text-text' : 'text-subtle'}`}>
                <Icon className={`size-6 ${active ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
