import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const repoRoot = path.join(__dirname, '..');
const emptyCmsProject = path.join(repoRoot, 'testing', 'fixtures', 'empty-cms-project');

/**
 * Playwright Configuration for ProjectWhy CMS Tests
 * 
 * Key settings:
 * - Uses Chromium only (editor recommends Chrome/Edge)
 * - JSON reporter for LLM-parseable output
 * - Auto-starts Go projectwhy host on port 3000 with an empty project dir
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Shared PROJECTWHY_DIR on disk for Go server; prevent parallel races on .web-editor.json / assets.
  workers: 1,
  
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
    command: 'go run ./cmd/projectwhy -listen 127.0.0.1:3000 -no-browser',
    cwd: repoRoot,
    env: {
      ...process.env,
      PROJECTWHY_DIR: emptyCmsProject,
    },
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

