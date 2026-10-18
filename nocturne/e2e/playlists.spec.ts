import { test, expect, createUser, deleteUser, login, idOf, expectPlaying, nowPlaying, type TestUser } from './helpers';

let user: TestUser;

test.beforeEach(async ({ page }) => {
  user = await createUser('Playlist Maker');
  await login(page, user);
});
test.afterEach(async () => {
  await deleteUser(user);
});

const rows = (page: import('@playwright/test').Page) => page.getByTestId('track-row');

test.describe('playlists (F05, F09)', () => {
  test('create, rename, add, reorder, remove, play, persist, delete', async ({ page, problems }) => {
    // create
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Create playlist' }).click();
    await expect(page).toHaveURL(/\/playlist\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Playlist #1');
    await expect(page.getByRole('heading', { name: "Let's find something for your playlist" })).toBeVisible();

    // rename + description
    await page.getByRole('button', { name: 'More options for My Playlist #1' }).click();
    await page.getByRole('menuitem', { name: 'Edit details' }).click();
    await page.getByLabel('Name').fill('Late Night Drive');
    await page.getByLabel(/Description/).fill('Roads, lights, synths.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Late Night Drive');
    await expect(page.getByRole('main').locator('header').getByText('Roads, lights, synths.')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Late Night Drive')).toBeVisible();

    // add from the in-page finder
    const finder = page.getByRole('searchbox', { name: 'Search for songs to add' });
    for (const title of ['Grid Runner', 'Chrome Horizon', 'Signal Fade']) {
      await finder.fill(title);
      await page.getByRole('button', { name: `Add ${title} to playlist` }).click();
      await expect(rows(page).filter({ hasText: title })).toBeVisible();
    }
    await expect(page.getByTestId('playlist-count')).toContainText('3 songs');

    // add from a track menu elsewhere
    const album = await idOf('albums', 'title', 'Velvet Transit');
    await page.goto(`/album/${album}`);
    await page.getByRole('button', { name: 'More options for Sleeper Car' }).click();
    await page.getByRole('menuitem', { name: 'Add to playlist' }).click();
    await page.getByRole('menuitem', { name: 'Late Night Drive' }).click();
    await expect(page.getByRole('status').getByText('Added to Late Night Drive')).toBeVisible();
    // adding twice is refused politely
    await page.getByRole('button', { name: 'More options for Sleeper Car' }).click();
    await page.getByRole('menuitem', { name: 'Add to playlist' }).click();
    await page.getByRole('menuitem', { name: 'Late Night Drive' }).click();
    await expect(page.getByRole('status').getByText('Already in Late Night Drive')).toBeVisible();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Late Night Drive/ }).click();
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).nth(3)).toContainText('Sleeper Car');

    // reorder: move the first song down
    await rows(page).nth(0).getByRole('button', { name: 'More options for Grid Runner' }).click();
    await page.getByRole('menuitem', { name: 'Move down' }).click();
    await expect(rows(page).nth(0)).toContainText('Chrome Horizon');
    await expect(rows(page).nth(1)).toContainText('Grid Runner');

    // remove
    await rows(page).filter({ hasText: 'Signal Fade' }).getByRole('button', { name: 'More options for Signal Fade' }).click();
    await page.getByRole('menuitem', { name: 'Remove from this playlist' }).click();
    await expect(rows(page)).toHaveCount(3);

    // persisted in the database
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).nth(0)).toContainText('Chrome Horizon');
    await expect(rows(page).nth(1)).toContainText('Grid Runner');
    await expect(rows(page).nth(2)).toContainText('Sleeper Car');

    // play the whole playlist, then shuffle play
    await page.getByRole('button', { name: 'Play Late Night Drive', exact: true }).click();
    await expectPlaying(page);
    expect(await nowPlaying(page)).toBe('Chrome Horizon');
    await page.getByRole('button', { name: 'Shuffle play Late Night Drive' }).click();
    await expectPlaying(page);
    await expect(page.getByRole('button', { name: 'Disable shuffle' })).toBeVisible();

    // make private, then delete
    await page.getByRole('button', { name: 'More options for Late Night Drive' }).click();
    await page.getByRole('menuitem', { name: 'Make private' }).click();
    await expect(page.getByText('Private playlist')).toBeVisible();
    await page.getByRole('button', { name: 'More options for Late Night Drive' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog', { name: 'Delete playlist?' }).getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL('/library');
    await expect(page.getByText('Late Night Drive')).toHaveCount(0);
    const { count } = await user.client.from('playlists').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
    expect(count).toBe(0);
    expect(problems).toEqual([]);
  });

  test('drag and drop reorders on desktop', async ({ page }) => {
    const { data } = await user.client.from('playlists').insert({ owner_id: user.id, name: 'Drag Test' }).select('id').single();
    const album = await idOf('albums', 'title', 'Pixel Harvest');
    const { data: tr } = await user.client.from('tracks').select('id, title').eq('album_id', album).order('track_number');
    for (const t of tr!) await user.client.rpc('playlist_add_track', { p_playlist: data!.id, p_track: t.id });
    await page.goto(`/playlist/${data!.id}`);
    await rows(page).nth(0).dragTo(rows(page).nth(2));
    await expect(rows(page).nth(2)).toContainText('Pixel Harvest');
    await page.reload();
    await expect(rows(page).nth(2)).toContainText('Pixel Harvest');
  });

  test('a validation error keeps the dialog open', async ({ page }) => {
    const { data } = await user.client.from('playlists').insert({ owner_id: user.id, name: 'Keep Me' }).select('id').single();
    await page.goto(`/playlist/${data!.id}`);
    await page.getByRole('button', { name: 'Edit details' }).click();
    await page.getByLabel('Name').fill('   ');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Give your playlist a name.');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep Me');
  });

  test('save a curated playlist to Your Library', async ({ page }) => {
    const id = await idOf('playlists', 'name', 'Quiet Hours');
    await page.goto(`/playlist/${id}`);
    await page.getByRole('button', { name: 'Save to Your Library' }).click();
    await expect(page.getByRole('button', { name: 'Remove from Your Library' })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/library?filter=playlists');
    await expect(page.getByRole('main').getByRole('link', { name: /Quiet Hours/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('main').getByRole('link', { name: /Quiet Hours/ })).toBeVisible();
  });
});

test.describe('likes, library and history (F06, F10)', () => {
  test('like and unlike songs; Liked Songs persists', async ({ page }) => {
    const album = await idOf('albums', 'title', 'Paper Lanterns');
    await page.goto(`/album/${album}`);
    await page.getByRole('button', { name: 'Save The Long Hallway to Liked Songs' }).click();
    await expect(page.getByRole('button', { name: 'Remove The Long Hallway from Liked Songs' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'More options for Low Tide Waltz' }).click();
    await page.getByRole('menuitem', { name: 'Save to Liked Songs' }).click();

    await page.goto('/collection/tracks');
    await expect(rows(page)).toHaveCount(2);
    await page.reload();
    await expect(rows(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove The Long Hallway from Liked Songs' }).click();
    await expect(rows(page)).toHaveCount(1);
    await page.reload();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Low Tide Waltz');
  });

  test('save an album and follow an artist', async ({ page }) => {
    const album = await idOf('albums', 'title', 'Tidal Hours');
    await page.goto(`/album/${album}`);
    await page.getByRole('button', { name: 'Save to Your Library' }).click();
    await page.getByRole('main').getByRole('link', { name: 'Juno Abara', exact: true }).first().click();
    await page.getByRole('button', { name: 'Follow' }).click();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await page.goto('/library?filter=albums');
    await expect(page.getByRole('main').getByRole('link', { name: /Tidal Hours/ })).toBeVisible();
    await page.goto('/library?filter=artists');
    await expect(page.getByRole('main').getByRole('link', { name: /Juno Abara/ })).toBeVisible();
  });

  test('recently played records what you play', async ({ page }) => {
    const album = await idOf('albums', 'title', 'After Hours at the Lamplight');
    await page.goto(`/album/${album}`);
    await page.getByRole('row', { name: /Blue Booth/ }).dblclick();
    await expectPlaying(page);
    await page.goto('/history');
    await expect(rows(page).first()).toContainText('Blue Booth');
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Recently played' }).getByText('Blue Booth')).toBeVisible();
  });
});
