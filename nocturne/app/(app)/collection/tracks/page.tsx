import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getCurrentProfile, getServerSupabase } from '@/lib/supabase/server';
import { getLikedTracks } from '@/lib/data/catalog';
import { SignedOut } from '@/components/auth/SignedOut';
import { LikedView } from './LikedView';

export const metadata: Metadata = { title: 'Liked Songs' };
export const dynamic = 'force-dynamic';

export default async function LikedSongsPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <SignedOut icon={<Heart />} title="Songs you like will appear here" body="Log in and tap the heart on any song to save it to Liked Songs." next="/collection/tracks" />;
  }
  const tracks = await getLikedTracks(await getServerSupabase(), profile.id);
  return <LikedView tracks={tracks} ownerName={profile.displayName} />;
}
