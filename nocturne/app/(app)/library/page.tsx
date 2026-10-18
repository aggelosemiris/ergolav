import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LibraryView } from './LibraryView';

export const metadata: Metadata = { title: 'Your Library' };

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  );
}
