import { test, expect, idOf, expectPlaying, nowPlaying, audioState } from './helpers';

test.describe('mobile layout (390px)', () => {
  test('tab bar navigation, mini player and full-screen player', async ({ page, problems }) => {
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Main' });
    await expect(tabs.getByRole('link', { name: 'Home' })).toBeVisible();
    await tabs.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL('/search');
    await page.getByRole('searchbox').fill('signal');
    await expect(page.getByTestId('track-row').filter({ hasText: 'Signal Fade' })).toBeVisible();

    // a tap on a row plays it
    await page.goto(`/album/${await idOf('albums', 'title', 'Rainy Window Tapes')}`);
    await page.getByTestId('track-row').filter({ hasText: 'Tea Gone Cold' }).getByText('Tea Gone Cold').tap();
    await expectPlaying(page);

    const mini = page.getByRole('region', { name: 'Now playing' });
    await expect(mini).toBeVisible();
    await mini.getByRole('button', { name: /Open player/ }).tap();
    const full = page.getByRole('dialog', { name: 'Now playing' });
    await expect(full).toBeVisible();
    await expect(full.getByText('Tea Gone Cold')).toBeVisible();
    await full.getByRole('button', { name: 'Pause' }).tap();
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
    await full.getByRole('button', { name: 'Play', exact: true }).tap();
    await expectPlaying(page);
    const before = await nowPlaying(page);
    await full.getByRole('button', { name: 'Next', exact: true }).tap();
    await expect.poll(() => nowPlaying(page)).not.toBe(before);
    await full.getByRole('button', { name: 'Close player' }).tap();
    await expect(full).toBeHidden();

    await tabs.getByRole('link', { name: 'Your Library' }).tap();
    await expect(page).toHaveURL('/library');
    expect(problems).toEqual([]);
  });

  test('no horizontal overflow on main screens', async ({ page }) => {
    const album = await idOf('albums', 'title', 'Neon Cartography');
    const artist = await idOf('artists', 'name', 'The Lamplight Quartet');
    const playlist = await idOf('playlists', 'name', 'Kitchen Floor Disco');
    for (const path of ['/', '/search', '/search?q=night', `/album/${album}`, `/artist/${artist}`, `/playlist/${playlist}`, '/login', '/signup', '/queue']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
