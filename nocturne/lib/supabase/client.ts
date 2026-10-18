'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

let browserClient: SupabaseClient | null = null;

/** One browser client per tab; it shares the session cookie with the server. */
export function getBrowserSupabase(): SupabaseClient {
  if (!browserClient) {
    const { url, anonKey } = supabaseEnv();
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
