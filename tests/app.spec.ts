import { expect, test } from '@playwright/test';

test('shows the matrix header and input', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();
  await expect(page.getByText('Asystent badawczy z efektem digital rain')).toBeVisible();
  await expect(page.getByPlaceholder('Wpisz pytanie do Regis...')).toBeVisible();
});

test('renders suggestion chips', async ({ page }) => {
  await page.goto('/');

  const suggestions = [
    'Wyjaśnij komputery kwantowe',
    'Napisz sortowanie w Pythonie',
    'Porównaj REST vs GraphQL',
  ];

  for (const label of suggestions) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('toggles the theme switch', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: /Włącz/ });
  await expect(toggle).toBeVisible();

  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  await toggle.click();
  await expect(page).toHaveFunction(
    (expected) => document.documentElement.dataset.theme !== expected,
    initialTheme
  );
});
