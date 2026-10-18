import { randomUUID } from 'node:crypto';
import { test, expect, admin, createUser, deleteUser, login, type TestUser } from './helpers';

test.describe('authentication (F04)', () => {
  test('sign up, session survives reload, log out, log back in', async ({ page, problems }) => {
    const email = `e2e-signup-${randomUUID().slice(0, 8)}@nocturne.test`;
    try {
      await page.goto('/signup');
      await page.getByLabel('What should we call you?').fill('Ada Night');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('correct-horse-9');
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.waitForURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Ada Night');

      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Ada Night');

      await page.getByRole('button', { name: 'Account menu for Ada Night' }).click();
      await page.getByRole('menuitem', { name: 'Log out' }).click();
      await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Ada Night');

      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('correct-horse-9');
      await page.getByRole('button', { name: 'Log in' }).click();
      await page.waitForURL('/');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Ada Night');
      expect(problems.filter((p) => !p.includes('400'))).toEqual([]);
    } finally {
      const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
      const u = data.users.find((x) => x.email === email);
      if (u) await admin().auth.admin.deleteUser(u.id);
    }
  });

  test('validation and wrong-password messages', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Tell us what to call you.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 8 characters for your password.')).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@nocturne.test');
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText("That email and password don't match. Try again.");
  });

  test('an existing email cannot sign up twice', async ({ page }) => {
    let user: TestUser | null = null;
    try {
      user = await createUser('Existing');
      await page.goto('/signup');
      await page.getByLabel('What should we call you?').fill('Copycat');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password', { exact: true }).fill('another-password-1');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('main').getByRole('alert')).toContainText('already exists');
    } finally {
      await deleteUser(user);
    }
  });

  test('login returns to the page that asked for it', async ({ page }) => {
    let user: TestUser | null = null;
    try {
      user = await createUser('Return Trip');
      await page.goto('/library');
      await page.getByRole('main').getByRole('link', { name: 'Log in' }).click();
      await expect(page).toHaveURL(/\/login\?next=%2Flibrary/);
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password', { exact: true }).fill(user.password);
      await page.getByRole('button', { name: 'Log in' }).click();
      await expect(page).toHaveURL('/library');
      await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible();
    } finally {
      await deleteUser(user);
    }
  });

  test('profile: edit display name', async ({ page }) => {
    let user: TestUser | null = null;
    try {
      user = await createUser('Before Name');
      await login(page, user);
      await page.goto('/profile');
      await expect(page.getByTestId('profile-name')).toHaveText('Before Name');
      await page.getByRole('button', { name: 'Edit profile' }).click();
      await page.getByLabel('Display name').fill('After Name');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByTestId('profile-name')).toHaveText('After Name');
      await page.reload();
      await expect(page.getByTestId('profile-name')).toHaveText('After Name');
    } finally {
      await deleteUser(user);
    }
  });
});
