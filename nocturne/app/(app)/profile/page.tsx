import type { Metadata } from 'next';
import Link from 'next/link';
import { User2 } from 'lucide-react';
import { getCurrentProfile, getCurrentUser, getServerSupabase } from '@/lib/supabase/server';
import { getUserPlaylists } from '@/lib/data/catalog';
import { SignedOut } from '@/components/auth/SignedOut';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { PlaylistCard } from '@/components/media/Cards';
import { ProfileActions } from './ProfileActions';
import { pluralize } from '@/lib/format';

export const metadata: Metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  if (!profile || !user) {
    return <SignedOut icon={<User2 />} title="Your profile" body="Log in to see your profile, playlists and listening stats." next="/profile" />;
  }
  const sb = await getServerSupabase();
  const [playlists, likes, follows, plays] = await Promise.all([
    getUserPlaylists(sb, profile.id),
    sb.from('liked_tracks').select('track_id', { count: 'exact', head: true }).eq('user_id', profile.id),
    sb.from('followed_artists').select('artist_id', { count: 'exact', head: true }).eq('user_id', profile.id),
    sb.from('listening_history').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
  ]);
  const publicPlaylists = playlists.filter((p) => p.isPublic);

  return (
    <div>
      <header className="relative -mx-4 -mt-[var(--topbar-h)] bg-gradient-to-b from-[#4b3f8f] to-transparent px-4 pt-[calc(var(--topbar-h)+24px)] pb-6 sm:-mx-6 sm:px-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <div className="flex size-40 shrink-0 items-center justify-center rounded-full bg-surface-3 text-6xl font-black text-accent uppercase shadow-pop sm:size-48" aria-hidden="true">
            {profile.displayName.slice(0, 1)}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold">Profile</p>
            <h1 className="text-5xl font-black tracking-tight break-words sm:text-6xl lg:text-7xl" data-testid="profile-name">
              {profile.displayName}
            </h1>
            <p className="mt-3 flex flex-wrap justify-center gap-x-2 text-sm sm:justify-start">
              <span>{pluralize(publicPlaylists.length, 'public playlist')}</span>
              <span className="text-muted">•</span>
              <Link href="/collection/tracks" className="hover:underline">
                {pluralize(likes.count ?? 0, 'liked song')}
              </Link>
              <span className="text-muted">•</span>
              <Link href="/library?filter=artists" className="hover:underline">
                Following {follows.count ?? 0}
              </Link>
              <span className="text-muted">•</span>
              <Link href="/history" className="hover:underline">
                {pluralize(plays.count ?? 0, 'play')}
              </Link>
            </p>
          </div>
        </div>
      </header>

      <ProfileActions displayName={profile.displayName} email={user.email ?? ''} />

      {playlists.length > 0 ? (
        <Shelf title="Your playlists" href="/library?filter=playlists">
          {playlists.map((p) => (
            <ShelfItem key={p.id}>
              <PlaylistCard playlist={p} />
            </ShelfItem>
          ))}
        </Shelf>
      ) : (
        <p className="mb-8 text-muted">You have not made any playlists yet.</p>
      )}
    </div>
  );
}
