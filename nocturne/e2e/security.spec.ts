import { test, expect, createUser, deleteUser, login, idOf, type TestUser } from './helpers';

// Row level security: user B must never see or change user A's private data.
let a: TestUser;
let b: TestUser;
let privateId: string;
let publicId: string;
let trackId: string;

test.beforeAll(async () => {
  a = await createUser('Owner A');
  b = await createUser('Visitor B');
  const album = await idOf('albums', 'title', 'Neon Cartography');
  const { data: t } = await a.client.from('tracks').select('id').eq('album_id', album).limit(1).single();
  trackId = t!.id;
  const priv = await a.client.from('playlists').insert({ owner_id: a.id, name: 'A secret mix', is_public: false }).select('id').single();
  const pub = await a.client.from('playlists').insert({ owner_id: a.id, name: 'A public mix', is_public: true }).select('id').single();
  privateId = priv.data!.id;
  publicId = pub.data!.id;
  await a.client.rpc('playlist_add_track', { p_playlist: privateId, p_track: trackId });
  await a.client.rpc('playlist_add_track', { p_playlist: publicId, p_track: trackId });
  await a.client.from('liked_tracks').insert({ user_id: a.id, track_id: trackId });
});

test.afterAll(async () => {
  await deleteUser(a);
  await deleteUser(b);
});

test.describe('authorisation (RLS)', () => {
  test('a private playlist does not exist for anyone else', async ({ page }) => {
    const { data } = await b.client.from('playlists').select('id').eq('id', privateId);
    expect(data).toEqual([]);
    const items = await b.client.from('playlist_tracks').select('id').eq('playlist_id', privateId);
    expect(items.data).toEqual([]);
    await login(page, b);
    await page.goto(`/playlist/${privateId}`);
    await expect(page.getByRole('heading', { name: "We couldn't find that" })).toBeVisible();
    // and it never shows in search
    const { data: found } = await b.client.rpc('search_catalog', { q: 'secret mix' });
    expect(found.playlists).toEqual([]);
  });

  test("B cannot rename, delete or edit A's public playlist", async ({ page }) => {
    const upd = await b.client.from('playlists').update({ name: 'pwned' }).eq('id', publicId).select('id');
    expect(upd.data).toEqual([]);
    const del = await b.client.from('playlists').delete().eq('id', publicId).select('id');
    expect(del.data).toEqual([]);
    const add = await b.client.rpc('playlist_add_track', { p_playlist: publicId, p_track: trackId });
    expect(add.error?.message).toMatch(/not yours/);
    const rm = await b.client.rpc('playlist_remove_track', { p_playlist: publicId, p_track: trackId });
    expect(rm.error?.message).toMatch(/not yours/);
    const mv = await b.client.rpc('playlist_move_track', { p_playlist: publicId, p_track: trackId, p_to: 0 });
    expect(mv.error?.message).toMatch(/not yours/);
    const direct = await b.client.from('playlist_tracks').insert({ playlist_id: publicId, track_id: trackId, position: 5 });
    expect(direct.error).not.toBeNull();
    const steal = await b.client.from('playlists').insert({ owner_id: a.id, name: 'Fake A playlist' });
    expect(steal.error).not.toBeNull();

    const { data: still } = await a.client.from('playlists').select('name').eq('id', publicId).single();
    expect(still!.name).toBe('A public mix');

    // the UI offers no owner controls to a visitor
    await login(page, b);
    await page.goto(`/playlist/${publicId}`);
    await expect(page.getByRole('heading', { level: 1, name: 'A public mix' })).toBeVisible();
    await page.getByRole('button', { name: 'More options for A public mix' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit details' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('searchbox', { name: 'Search for songs to add' })).toHaveCount(0);
  });

  test("B cannot read or change A's likes, history or profile", async () => {
    const likes = await b.client.from('liked_tracks').select('*').eq('user_id', a.id);
    expect(likes.data).toEqual([]);
    const forge = await b.client.from('liked_tracks').insert({ user_id: a.id, track_id: trackId });
    expect(forge.error).not.toBeNull();
    const hist = await b.client.from('listening_history').insert({ user_id: a.id, track_id: trackId });
    expect(hist.error).not.toBeNull();
    const prof = await b.client.from('profiles').update({ display_name: 'pwned' }).eq('id', a.id).select('id');
    expect(prof.data).toEqual([]);
  });

  test('signed-out visitors cannot write anything', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const ins = await anon.from('playlists').insert({ owner_id: a.id, name: 'anon' });
    expect(ins.error).not.toBeNull();
    const rpc = await anon.rpc('playlist_add_track', { p_playlist: publicId, p_track: trackId });
    expect(rpc.error).not.toBeNull();
    const cat = await anon.from('tracks').update({ title: 'x' }).eq('id', trackId).select('id');
    expect(cat.data ?? []).toEqual([]);
  });
});
