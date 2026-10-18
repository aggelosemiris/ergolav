import { test, expect, idOf, audioState, expectPlaying, nowPlaying } from './helpers';

test.describe('playback (F01, F02, F08)', () => {
  test.beforeEach(async ({ page }) => {
    // start each test with a clean player (no restored queue)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-cleared')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-cleared', '1');
      }
    });
  });

  test('play, pause, resume, seek, next, previous', async ({ page, problems }) => {
    const id = await idOf('albums', 'title', 'Neon Cartography');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Neon Cartography', exact: true }).click();
    await expectPlaying(page);
    expect(await nowPlaying(page)).toBe('Grid Runner');
    expect((await audioState(page)).src).toBe('neon-cartography-01.mp3');

    // pause: time stops
    await page.getByRole('region', { name: 'Player' }).getByTestId('player-play-pause').click();
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
    const t = (await audioState(page)).time;
    await page.waitForTimeout(600);
    expect((await audioState(page)).time).toBeCloseTo(t, 1);

    // resume
    await page.getByRole('region', { name: 'Player' }).getByTestId('player-play-pause').click();
    await expectPlaying(page);

    // seek by the progress bar
    await page.getByTestId('seek-slider').fill('42');
    await expect.poll(async () => (await audioState(page)).time).toBeGreaterThan(41.5);
    await expect(page.getByTestId('player-current-time')).toHaveText(/0:4[2-4]/);
    await expect(page.getByTestId('player-duration')).toHaveText('1:25');

    // keyboard seek on the focused slider (5 s steps)
    const before = (await audioState(page)).time;
    await page.getByTestId('seek-slider').focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await audioState(page)).time).toBeGreaterThan(before + 4);

    // next / previous
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Chrome Horizon');
    await expectPlaying(page);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Grid Runner');

    // previous after 3 s restarts the same track
    await page.getByTestId('seek-slider').fill('20');
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Grid Runner');
    await expect.poll(async () => (await audioState(page)).time).toBeLessThan(3);
    expect(problems).toEqual([]);
  });

  test('volume and mute drive the audio element', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Tidal Hours');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Tidal Hours', exact: true }).click();
    await expectPlaying(page);
    await page.getByTestId('volume-slider').fill('0.25');
    await expect.poll(async () => (await audioState(page)).volume).toBeCloseTo(0.25, 2);
    await page.getByRole('button', { name: 'Mute' }).click();
    await expect.poll(async () => (await audioState(page)).muted).toBe(true);
    await page.getByRole('button', { name: 'Unmute' }).click();
    await expect.poll(async () => (await audioState(page)).muted).toBe(false);
    // volume survives a reload
    await page.reload();
    await expect(page.getByTestId('volume-slider')).toHaveValue('0.25');
  });

  test('shuffle keeps the current track and plays the album in another order; repeat cycles', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Rainy Window Tapes');
    await page.goto(`/album/${id}`);
    await page.getByRole('row', { name: /Umbrella Shop/ }).dblclick();
    await expectPlaying(page);
    await page.getByRole('button', { name: 'Enable shuffle' }).click();
    await expect(page.getByRole('button', { name: 'Disable shuffle' })).toHaveAttribute('aria-pressed', 'true');
    expect(await nowPlaying(page)).toBe('Umbrella Shop');

    const seen = new Set<string>(['Umbrella Shop']);
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect.poll(async () => seen.has((await nowPlaying(page)) ?? '')).toBe(false);
      seen.add((await nowPlaying(page))!);
    }
    expect(seen.size).toBe(5); // every track once, none repeated

    await page.getByRole('button', { name: 'Enable repeat' }).click();
    await expect(page.getByRole('button', { name: 'Repeat one' })).toBeVisible();
    await page.getByRole('button', { name: 'Repeat one' }).click();
    await expect(page.getByRole('button', { name: 'Disable repeat' })).toBeVisible();

    // repeat one: at the end, the same track starts again
    const title = await nowPlaying(page);
    const duration = (await audioState(page)).duration;
    await page.getByTestId('seek-slider').fill(String(Math.floor(duration - 1)));
    await expect.poll(async () => (await audioState(page)).time, { timeout: 8000 }).toBeLessThan(3);
    expect(await nowPlaying(page)).toBe(title);
    await expectPlaying(page);
  });

  test('repeat off: the queue ends and playback stops; repeat all wraps around', async ({ page }) => {
    const id = await idOf('albums', 'title', 'First Frost');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play First Frost', exact: true }).click();
    await expectPlaying(page);
    const d = (await audioState(page)).duration;
    await page.getByTestId('seek-slider').fill(String(Math.floor(d - 1)));
    await expect.poll(async () => (await audioState(page)).paused, { timeout: 8000 }).toBe(true);
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Enable repeat' }).click();
    await page.getByRole('region', { name: 'Player' }).getByTestId('player-play-pause').click();
    await expectPlaying(page);
    await page.getByTestId('seek-slider').fill(String(Math.floor(d - 1)));
    // single-track album with repeat all: it ends, wraps to itself and keeps playing
    await expect.poll(async () => (await audioState(page)).time, { timeout: 8000 }).toBeLessThan(3);
    await expectPlaying(page);
  });

  test('playback continues while navigating between pages', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Velvet Transit');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Velvet Transit', exact: true }).click();
    await expectPlaying(page);
    const src = (await audioState(page)).src;
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/search/);
    await page.getByRole('link', { name: 'Ambient' }).click();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
    expect((await audioState(page)).src).toBe(src);
    await expectPlaying(page);
  });

  test('queue: add, play next, reorder, remove, jump', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Pixel Harvest');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Pixel Harvest', exact: true }).click();
    await expectPlaying(page);

    await page.getByRole('button', { name: 'More options for Save Point' }).click();
    await page.getByRole('menuitem', { name: 'Add to queue' }).click();
    await expect(page.getByRole('status').getByText('Added to queue')).toBeVisible();
    await page.getByRole('button', { name: 'More options for Boss Rush Picnic' }).click();
    await page.getByRole('menuitem', { name: 'Play next' }).click();

    await page.getByRole('button', { name: 'Queue' }).click();
    await expect(page).toHaveURL('/queue');
    const items = page.getByTestId('queue-item');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('Boss Rush Picnic');
    await expect(items.nth(1)).toContainText('Save Point');
    await page.getByRole('button', { name: 'Move Save Point up' }).click();
    await expect(items.nth(0)).toContainText('Save Point');
    await page.getByRole('button', { name: 'Remove Boss Rush Picnic from queue' }).click();
    await expect(items).toHaveCount(1);

    // next plays the hand-queued track before the album continues
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Save Point');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Moonlit Dungeon');

    await page.getByTestId('context-item').filter({ hasText: 'Boss Rush Picnic' }).getByRole('button').first().click();
    await expect.poll(() => nowPlaying(page)).toBe('Boss Rush Picnic');
  });

  test('a missing audio file shows an error instead of failing silently', async ({ page }) => {
    await page.route('**/media/audio/slow-weather-01.mp3', (route) => route.fulfill({ status: 404, body: 'gone' }));
    const id = await idOf('albums', 'title', 'Slow Weather');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Slow Weather', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: /missing|can't play/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Player' }).getByTestId('player-play-pause')).toHaveAttribute('data-status', 'error');
    // the listener can move on to the next track
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => nowPlaying(page)).toBe('Fog Lifting');
    await expectPlaying(page);
  });

  test('keyboard: space toggles playback outside inputs', async ({ page }) => {
    const id = await idOf('albums', 'title', 'Glasshouse');
    await page.goto(`/album/${id}`);
    await page.getByRole('button', { name: 'Play Glasshouse', exact: true }).click();
    await expectPlaying(page);
    await page.locator('main h1').click();
    await page.keyboard.press('Space');
    await expect.poll(async () => (await audioState(page)).paused).toBe(true);
    await page.keyboard.press('Space');
    await expectPlaying(page);
  });
});
