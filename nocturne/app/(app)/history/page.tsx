import type { Metadata } from 'next';
import { History } from 'lucide-react';
import { getCurrentProfile, getServerSupabase } from '@/lib/supabase/server';
import { getHistory } from '@/lib/data/catalog';
import { SignedOut } from '@/components/auth/SignedOut';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { TrackList } from '@/components/media/TrackList';
import { ActionBar, DetailHeader } from '@/components/media/DetailHeader';
import { HistoryCover } from '@/components/media/Artwork';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { pluralize } from '@/lib/format';

export const metadata: Metadata = { title: 'Recently played' };
export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <SignedOut icon={<History />} title="Your listening history" body="Log in and everything you play is kept here, newest first." next="/history" />;
  }
  const history = await getHistory(await getServerSupabase(), profile.id, 100);
  const context = { type: 'history' as const, id: null, name: 'Recently played', href: '/history' };
  return (
    <div>
      <DetailHeader
        kind="Your history"
        title="Recently played"
        tint="#1f5f6b"
        art={<HistoryCover className="w-full" />}
        meta={<span>{history.length ? `Last ${pluralize(history.length, 'play')}` : 'Nothing yet'}</span>}
      />
      {history.length === 0 ? (
        <EmptyState icon={<History />} title="Nothing played yet" body="Start listening and your history will build up here." action={<ButtonLink href="/" variant="light">Find something to play</ButtonLink>} />
      ) : (
        <>
          <ActionBar>
            <PlayContextButton context={context} tracks={history} size="lg" />
          </ActionBar>
          <TrackList tracks={history} context={context} showAlbum showAdded="played" label="Recently played" />
        </>
      )}
    </div>
  );
}
