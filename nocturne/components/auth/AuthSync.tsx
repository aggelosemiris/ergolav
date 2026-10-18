'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useLibrary, type LibraryUser } from '@/store/library';

/** Keeps the client library store in step with the Supabase session. */
export function AuthSync({ initialUser }: { initialUser: LibraryUser | null }) {
  const router = useRouter();

  useEffect(() => {
    useLibrary.getState().setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const sb = getBrowserSupabase();
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useLibrary.getState().setUser(null);
        router.refresh();
      } else if (event === 'SIGNED_IN' && session?.user) {
        const current = useLibrary.getState().user;
        if (current?.id !== session.user.id) {
          const meta = session.user.user_metadata as { display_name?: string };
          useLibrary.getState().setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            displayName: meta.display_name || session.user.email?.split('@')[0] || 'Listener',
          });
          router.refresh();
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
}
