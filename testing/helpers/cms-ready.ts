import type { Page } from '@playwright/test';

/** Waits until the editor has finished detectBackend / openProjectHttp (or file:// init). */
export async function waitForEditorReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).__cmsReady === true, { timeout: 30000 });
}
