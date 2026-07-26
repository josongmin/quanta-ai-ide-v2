import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('global settings dialog uses one Escape owner', async ({ page }) => {
  await page.goto('/intelligence');
  await page.getByRole('button', { name: 'Facet settings' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('canonical modal story has no automatic WCAG A/AA violations', async ({ page }) => {
  await page.goto('http://127.0.0.1:6006/iframe.html?id=shared-ui-modal--open');
  const dialog = page.getByRole('dialog', { name: 'Example dialog' });
  await expect(dialog).toBeVisible();
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});
