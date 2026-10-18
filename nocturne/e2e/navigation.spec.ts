import { test, expect, idOf, axe } from './helpers';

test.describe('navigation (F01, F07)', () => {
  test('home shows greeting, quick grid and shelves', async ({ page, problems }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Good (morning|afternoon|evening)|Still up/);
    for (const shelf of ['Featured playlists', 'Recommended albums', 'Popular artists', 'Trending on Nocturne', 'New releases', 'Explore by mood']) {
      await expect(page.getByRole('heading', { name: shelf })).toBeVisible();
    }
    expect(problems).toEqual([]);
  });

  test('sidebar and cards lead to the right screens', async ({ page, problems }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Midnight Motorway' }).last().click();
    await expect(page).toHaveURL(/\/playlist\//);
    await expect(page.getByRole('heading', { level: 1, name: 'Midnight Motorway' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: 'Kestrel & Vane' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Kestrel & Vane' })).toBeVisible();
    await expect(page.getByText(/monthly listeners/).first()).toBeVisible();

    await page.getByRole('region', { name: 'Discography' }).getByRole('link', { name: 'Neon Cartography' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Neon Cartography' })).toBeVisible();
    await expect(page.getByText('2022', { exact: true })).toBeVisible();
    await expect(page.getByText(/4 songs/)).toBeVisible();

    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Kestrel & Vane' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Browse all' })).toBeVisible();
    await page.getByRole('link', { name: 'Synthwave' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Synthwave' })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('album page lists tracks with year and total duration', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Rainy Window Tapes');
    await page.goto(`/album/${id}`);
    await expect(page.getByRole('table', { name: 'Tracks on Rainy Window Tapes' }).getByTestId('track-row')).toHaveCount(5);
    await expect(page.getByText(/5 songs/)).toBeVisible();
    await expect(page.getByText(/\d+ min \d+ sec|\d+ min/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shuffle play Rainy Window Tapes' })).toBeVisible();
  });

  test('unknown pages and ids show a friendly not-found screen', async ({ page }) => {
    await page.goto('/album/00000000-0000-4000-8000-000000000000');
    await expect(page.getByRole('heading', { name: "We couldn't find that" })).toBeVisible();
    await page.goto('/album/not-a-uuid');
    await expect(page.getByRole('heading', { name: "We couldn't find that" })).toBeVisible();
    const res = await page.goto('/definitely/not/here');
    expect(res?.status()).toBe(404);
  });

  test('signed-out library pages invite you to log in', async ({ page }) => {
    for (const path of ['/library', '/collection/tracks', '/history', '/profile']) {
      await page.goto(path);
      await expect(page.getByRole('main').getByRole('link', { name: 'Log in' })).toBeVisible();
    }
  });

  test('main screens have no serious accessibility violations', async ({ page }) => {
    const album = await idOf('albums', 'title', 'Neon Cartography');
    for (const path of ['/', '/search', `/album/${album}`, '/login']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await axe(page), path).toEqual([]);
    }
  });
});
