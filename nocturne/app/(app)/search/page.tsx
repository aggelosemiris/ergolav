import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getServerSupabase } from '@/lib/supabase/server';
import { getGenres } from '@/lib/data/catalog';
import { SearchView } from './SearchView';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage() {
  const genres = await getGenres(await getServerSupabase());
  return (
    <Suspense>
      <SearchView genres={genres} />
    </Suspense>
  );
}
