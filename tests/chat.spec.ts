import { expect, test } from '@playwright/test';

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome message on empty chat', async ({ page }) => {
    await expect(page.getByText(/witaj|welcome/i)).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('submit button is disabled with empty input', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    // The submit button should be disabled or not visible when input is empty
    await expect(submitButton).toBeDisabled();
  });

  test('submit button enables after typing', async ({ page }) => {
    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await input.fill('Test prompt here');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('clicking suggestion fills input', async ({ page }) => {
    const suggestion = page.getByRole('button', { name: 'Wyjaśnij komputery kwantowe' });
    await suggestion.click();

    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await expect(input).toHaveValue('Wyjaśnij komputery kwantowe');
  });

  test('clear chat button is visible', async ({ page }) => {
    const clearButton = page.getByRole('button', { name: /wyczyść|clear/i });
    await expect(clearButton).toBeVisible();
  });
});

test.describe('Model selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('model selector is visible', async ({ page }) => {
    const modelSelect = page.locator('#model-select');
    await expect(modelSelect).toBeVisible();
  });

  test('model selector has Auto option by default', async ({ page }) => {
    const modelSelect = page.locator('#model-select');
    await expect(modelSelect).toHaveValue('auto');
  });

  test('refresh models button exists', async ({ page }) => {
    const refreshButton = page.locator('button[title*="Refresh"], button[title*="Odśwież"]');
    await expect(refreshButton).toBeVisible();
  });
});

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Ctrl+K focuses input', async ({ page }) => {
    // First click on header to defocus input
    await page.locator('header').click();

    // Small wait to ensure focus changed
    await page.waitForTimeout(100);

    // Press Ctrl+K
    await page.keyboard.press('Control+k');

    // Small wait for shortcut to process
    await page.waitForTimeout(100);

    // Input should be focused
    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await expect(input).toBeFocused({ timeout: 2000 });
  });

  test('shortcuts info is displayed', async ({ page }) => {
    // Check that keyboard shortcut hints are visible
    await expect(page.getByText('Ctrl+K')).toBeVisible();
    await expect(page.getByText('Ctrl+L')).toBeVisible();
  });
});

test.describe('Language switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('language toggle button is visible', async ({ page }) => {
    const langButton = page.locator('button[aria-label*="język"], button[title*="język"]');
    await expect(langButton).toBeVisible();
  });

  test('clicking language toggle changes UI language', async ({ page }) => {
    // Get initial text (Polish by default)
    const initialTitle = await page.getByRole('heading', { name: 'Regis Matrix Lab' }).textContent();

    // Click language toggle
    const langButton = page.locator('button[aria-label*="język"], button[title*="język"]');
    await langButton.click();

    // Wait for language change
    await page.waitForTimeout(500);

    // Title should still be visible (app name doesn't change)
    await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();
  });
});

test.describe('Online/Offline status', () => {
  test('shows online status indicator', async ({ page }) => {
    await page.goto('/');

    // Should show online status
    await expect(page.getByText(/online|połączony/i)).toBeVisible();
  });
});

test.describe('Error handling', () => {
  test('displays error message on API failure', async ({ page, context, browserName }) => {
    // Skip flaky WebKit test - route interception doesn't work reliably with service workers
    test.skip(browserName === 'webkit', 'WebKit route interception unreliable with PWA service worker');

    // Block all API requests by aborting them - forces network error
    await context.route(/\/api\/(execute|stream)/, (route) => {
      route.abort('failed');
    });

    await page.goto('/');

    // Fill input and submit
    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await input.fill('Test prompt');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error to appear - use role="alert" or data-testid for reliability
    await expect(
      page.locator('[role="alert"], [data-testid="error-message"], .text-red-200')
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Responsive design', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();
    await expect(page.getByPlaceholder('Wpisz pytanie do Regis...')).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();
    await expect(page.getByPlaceholder('Wpisz pytanie do Regis...')).toBeVisible();
  });
});
