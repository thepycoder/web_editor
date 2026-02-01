import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ProjectWhy CMS Tests
 * 
 * Key settings:
 * - Uses Chromium only (editor recommends Chrome/Edge)
 * - JSON reporter for LLM-parseable output
 * - Auto-starts local server on port 3000
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  webServer: {
    command: 'node node_modules/.bin/serve .. -p 3000 --no-clipboard',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

