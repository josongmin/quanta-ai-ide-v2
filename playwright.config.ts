import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/renderer',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The shipped macOS engine is WKWebView (WebKit). Run ONLY the CSP receipt
    // under WebKit so connect-src enforcement is verified on the real engine
    // family, without paying WebKit cost for the whole renderer suite.
    {
      name: 'webkit-csp',
      use: { ...devices['Desktop Safari'] },
      testMatch: /csp-websocket\.spec\.ts$/,
    },
  ],
  webServer: [
    {
      command: 'pnpm dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173/intelligence',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm storybook --ci --no-open --port 6006',
      url: 'http://127.0.0.1:6006',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
