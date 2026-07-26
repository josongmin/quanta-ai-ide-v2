import { browser, expect } from '@wdio/globals';
import { describe, it } from 'mocha';

describe('Tauri shell', () => {
  it('boots the main window with the configured title', async () => {
    await expect(browser).toHaveTitle('2.5D Code City');
  });
});
