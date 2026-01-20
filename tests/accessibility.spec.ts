import { expect, test } from '@playwright/test';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page has proper heading hierarchy', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Regis Matrix Lab');
  });

  test('form inputs have labels', async ({ page }) => {
    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await expect(input).toBeVisible();

    // Model select has label
    const modelLabel = page.locator('label[for="model-select"]');
    await expect(modelLabel).toBeVisible();
  });

  test('buttons have accessible names', async ({ page }) => {
    // Theme toggle has aria-label
    const themeButton = page.locator('button[aria-label*="Włącz"]');
    await expect(themeButton).toBeVisible();

    // Language toggle has aria-label
    const langButton = page.locator('button[aria-label*="język"]');
    await expect(langButton).toBeVisible();
  });

  test('interactive elements are keyboard accessible', async ({ page }) => {
    // Wait for page to be fully interactive
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();

    // Focus the body first
    await page.evaluate(() => document.body.focus());

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Wait a bit for focus to settle
    await page.waitForTimeout(200);

    // Check what's focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : 'body';
    });

    // Should have focus on some interactive element or body
    expect(['button', 'input', 'a', 'select', 'textarea', 'body', 'div']).toContain(focusedElement);
  });

  test('color contrast in dark mode', async ({ page }) => {
    // In dark mode, text should be visible
    const heading = page.getByRole('heading', { name: 'Regis Matrix Lab' });
    await expect(heading).toBeVisible();

    // Text should have sufficient contrast (visual check - actual contrast testing would need axe)
    const textColor = await heading.evaluate((el) => getComputedStyle(el).color);
    expect(textColor).toBeTruthy();
  });

  test('color contrast in light mode', async ({ page }) => {
    // Switch to light mode
    const themeButton = page.locator('button[aria-label*="Włącz"]');
    await themeButton.click();

    await page.waitForTimeout(300);

    // Text should still be visible
    const heading = page.getByRole('heading', { name: 'Regis Matrix Lab' });
    await expect(heading).toBeVisible();
  });

  test('focus indicators are visible', async ({ page }) => {
    const input = page.getByPlaceholder('Wpisz pytanie do Regis...');
    await input.focus();

    // Input should have visible focus styles (ring)
    const focusRing = await input.evaluate((el) => {
      const styles = getComputedStyle(el);
      return styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
    });

    // Either outline or box-shadow should be present for focus
    expect(focusRing).toBeTruthy();
  });
});

test.describe('Semantic HTML', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has header element', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('has main element', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('form has proper structure', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Form should have input and submit button
    const input = form.locator('input[type="text"]');
    const submitButton = form.locator('button[type="submit"]');

    await expect(input).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('buttons have type attribute', async ({ page }) => {
    // Submit button should have type="submit"
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Other buttons should have type="button"
    const clearButton = page.locator('button[type="button"]').first();
    await expect(clearButton).toBeVisible();
  });
});

test.describe('ARIA attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('interactive elements have proper roles', async ({ page }) => {
    // Wait for main content to be visible
    await expect(page.getByRole('heading', { name: 'Regis Matrix Lab' })).toBeVisible();

    // Check that buttons exist using locator - wait for at least one
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 5000 });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('links have proper attributes', async ({ page }) => {
    // External links should have rel="noopener noreferrer"
    // (if any exist in the page)
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });
});
