import { expect, test as base, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* CI passes env vars directly */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = () => createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  /** a Supabase client signed in as this user (for setup and RLS checks) */
  client: SupabaseClient;
}

export async function createUser(displayName = 'Test Listener'): Promise<TestUser> {
  const email = `e2e-${randomUUID().slice(0, 8)}@nocturne.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (error || !data.user) throw new Error(`could not create test user: ${error?.message}`);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, password, displayName, client };
}

export async function deleteUser(user: TestUser | null | undefined) {
  if (user) await admin().auth.admin.deleteUser(user.id);
}

export async function login(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(user.displayName);
}

/** Collects console errors and failed (5xx) responses; specs assert it is empty at the end. */
export const test = base.extend<{ problems: string[] }>({
  problems: async ({ page }, use) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
    });
    await use(problems);
  },
});
export { expect };

export async function audioState(page: Page) {
  return page.evaluate(() => {
    const a = document.querySelector('audio')!;
    return { src: a.currentSrc.split('/').pop() ?? '', time: a.currentTime, paused: a.paused, volume: a.volume, muted: a.muted, duration: a.duration };
  });
}

/** Waits until the audio element is really playing and time is moving. */
export async function expectPlaying(page: Page) {
  await expect.poll(async () => (await audioState(page)).paused, { message: 'audio should be playing' }).toBe(false);
  const t0 = (await audioState(page)).time;
  await expect.poll(async () => (await audioState(page)).time, { message: 'playback time should advance' }).toBeGreaterThan(t0 + 0.3);
}

export async function nowPlaying(page: Page) {
  return (await page.getByTestId('now-playing-title').textContent())?.trim();
}

export async function idOf(table: 'albums' | 'artists' | 'playlists', column: string, value: string): Promise<string> {
  const { data, error } = await admin().from(table).select('id').eq(column, value).single();
  if (error || !data) throw new Error(`no ${table} with ${column}=${value}`);
  return data.id as string;
}

export async function axe(page: Page) {
  // @axe-core/playwright types its Page from its own playwright-core copy
  const results = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
}
