import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    locale: 'en-GB',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'npm run preview -- --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
