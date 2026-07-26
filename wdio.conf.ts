import type {} from 'webdriverio';
import type { TauriCapabilities } from '@wdio/tauri-service';

const application = process.env.TAURI_APP_BINARY ?? './src-tauri/target/debug/quanta-ai-ide-v2';
const tauriCapability: TauriCapabilities = {
  browserName: 'tauri',
  'tauri:options': {
    application,
  },
};

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./e2e/tauri/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [tauriCapability],
  services: [[
    '@wdio/tauri-service',
    {
      appBinaryPath: application,
      driverProvider: 'external',
      autoInstallTauriDriver: false,
      captureBackendLogs: true,
      captureFrontendLogs: true,
    },
  ]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { timeout: 60_000 },
};
