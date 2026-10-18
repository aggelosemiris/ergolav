import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { supabaseEnv } from './env';
import type { Profile } from '@/lib/types';

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user for this request, verified with the auth server. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await getServerSupabase();
  const { data } = await supabase.from('profiles').select('id, display_name').eq('id', user.id).maybeSingle();
  if (!data) return { id: user.id, displayName: user.email?.split('@')[0] ?? 'Listener' };
  return { id: data.id, displayName: data.display_name };
});
