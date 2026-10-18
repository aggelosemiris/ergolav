import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AudioEngine } from '@/components/player/AudioEngine';
import { AuthSync } from '@/components/auth/AuthSync';
import { MenuHost } from '@/components/ui/Menu';
import { Toaster } from '@/components/ui/Toaster';
import { getCurrentProfile, getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: { default: 'Nocturne', template: '%s · Nocturne' },
  description: 'Nocturne is a music player for late listeners: playlists, a shared queue and an original catalogue you can play right now.',
  applicationName: 'Nocturne',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  const initialUser = user ? { id: user.id, email: user.email ?? null, displayName: profile?.displayName ?? 'Listener' } : null;
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only fixed top-2 left-2 z-[100] rounded-md bg-accent px-4 py-2 font-bold text-on-accent focus:not-sr-only">
          Skip to content
        </a>
        <AuthSync initialUser={initialUser} />
        {children}
        <AudioEngine />
        <MenuHost />
        <Toaster />
      </body>
    </html>
  );
}
