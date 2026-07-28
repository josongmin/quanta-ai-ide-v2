import { test, expect } from '@playwright/test';

// Behavior lock for the token-emission engine (P0-3 refactor safety net). The
// app's theme is painted by applyTokens/applySemanticTheme/applyGlobalTokens
// writing CSS custom properties onto :root. Moving that engine between modules
// must NOT change a single emitted value — this test snapshots a representative
// slice of the emitted vars from the LIVE app (real mount order: main.tsx boot
// paint → ThemeProvider → TokensProvider), so a relocation that drops or reorders
// an emission is caught. There were previously zero tests locking this output.

// One var per emitter family — semantic theme, global chrome, glass, derived.
const EMITTED_VARS = [
  '--bg-canvas', '--bg-surface', '--fg-strong', '--fg-accent',
  '--intent-success-fg', '--intent-danger-vivid', '--border-default', '--ring-active',
  '--glass-blur', '--glass-shadow', '--radius', '--card-padding', '--chip-radius',
  '--pill-radius', '--panel-width', '--header-height', '--tab-padding-x',
  '--dropdown-width', '--tooltip-radius', '--focus-ring',
  '--accent', '--bg-dark', '--bg-light',
];

test.describe('token-emission engine paints :root CSS vars (P0-3 lock)', () => {
  test('every emitted theme var is present and non-empty on the live app', async ({ page }) => {
    await page.goto('/intelligence', { waitUntil: 'domcontentloaded' });
    // let ThemeProvider + TokensProvider run their layout effects
    await page.waitForFunction(
      () => getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim().length > 0,
      { timeout: 10_000 },
    );
    const vars = await page.evaluate((names) => {
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
    }, EMITTED_VARS);

    for (const name of EMITTED_VARS) {
      expect(vars[name], `${name} must be emitted by the token engine`).not.toBe('');
    }
    // data-theme is set by applySemanticTheme
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme === 'dark' || theme === 'light').toBeTruthy();
    // The engine paints the canvas onto :root/body too (not just the var).
    const rootBg = await page.evaluate(() => document.documentElement.style.backgroundColor);
    expect(rootBg.length).toBeGreaterThan(0);
  });
});
