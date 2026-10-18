import { test, expect, expectPlaying, nowPlaying } from './helpers';

test.describe('search (F03)', () => {
  test('results update while typing and can be played', async ({ page, problems }) => {
    await page.goto('/search');
    const input = page.getByRole('searchbox', { name: 'Search songs, artists, albums and playlists' }).first();
    await input.fill('kestrel');
    await expect(page).toHaveURL(/q=kestrel/);
    await expect(page.getByRole('heading', { name: 'Top result' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kestrel & Vane' }).first()).toBeVisible();

    await input.fill('grid runner');
    const songs = page.getByRole('table', { name: 'Songs' });
    await expect(songs.getByTestId('track-row').first()).toContainText('Grid Runner');
    await songs.getByTestId('track-row').first().dblclick();
    await expectPlaying(page);
    expect(await nowPlaying(page)).toBe('Grid Runner');
    expect(problems).toEqual([]);
  });

  test('finds songs, artists, albums and playlists, with filters', async ({ page }) => {
    await page.goto('/search?q=night');
    await expect(page.getByRole('heading', { name: 'Songs' })).toBeVisible();
    await page.getByRole('button', { name: 'Playlists', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Nightfall Focus' })).toBeVisible();
    await page.getByRole('button', { name: 'Albums', exact: true }).click();
    await expect(page.getByRole('link', { name: 'After Hours at the Lamplight' }).or(page.getByRole('heading', { name: 'No albums match' }))).toBeVisible();
    await page.getByRole('button', { name: 'Songs', exact: true }).click();
    await expect(page.getByTestId('track-row').filter({ hasText: 'Night Bus Home' })).toBeVisible();
  });

  test('is accent and case insensitive and tolerates typos', async ({ page }) => {
    await page.goto('/search?q=' + encodeURIComponent('CAFÉ'));
    // nothing is called café: a clear empty state, not an error
    await expect(page.getByRole('heading', { name: /No results for/ })).toBeVisible();
    await page.goto('/search?q=' + encodeURIComponent('Mïra Sölenne'));
    await expect(page.getByRole('link', { name: 'Mira Solenne' }).first()).toBeVisible();
    await page.goto('/search?q=lamplite');
    await expect(page.getByRole('link', { name: 'The Lamplight Quartet' }).first()).toBeVisible();
  });

  test('shows an error with retry when the catalogue cannot be reached', async ({ page }) => {
    let fail = true;
    await page.route('**/rest/v1/rpc/search_catalog', (route) => (fail ? route.abort('failed') : route.continue()));
    await page.goto('/search?q=tides');
    await expect(page.getByRole('heading', { name: 'Search is not responding' })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Top result' })).toBeVisible();
  });

  test('clearing the query returns to browse', async ({ page }) => {
    await page.goto('/search?q=house');
    await expect(page.getByRole('heading', { name: 'Top result' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).first().click();
    await expect(page.getByRole('heading', { name: 'Browse all' })).toBeVisible();
  });
});
