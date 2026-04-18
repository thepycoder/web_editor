import { test, expect } from '@playwright/test';
import { EditorPage, SettingsModal } from '../page-objects';
import { TEST_TEMPLATE, waitForEditorReady, resetEmptyCmsFixture } from '../helpers';

/**
 * Deploy configuration tests (Netlify + Cloudflare Pages)
 *
 * Tests the settings modal and Netlify configuration:
 * - Opening and closing the settings modal
 * - Saving configuration to project file (.web-editor.json)
 * - Loading configuration from project file
 * - Deploy button state based on configuration
 * - Status indicator updates
 */
test.describe('Deploy configuration', () => {
  let editor: EditorPage;
  let settings: SettingsModal;

  test.beforeEach(async ({ page }) => {
    resetEmptyCmsFixture();
    // Clear localStorage before each test
    await page.goto('/editor.html');
    await waitForEditorReady(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await waitForEditorReady(page);

    editor = new EditorPage(page);
    settings = new SettingsModal(page);
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('settings button should open modal', async () => {
    await editor.btnSettings.click();
    expect(await settings.isOpen()).toBe(true);
  });

  test('settings modal should have all input fields', async () => {
    await settings.open();

    await expect(settings.projectFolderInput).toBeVisible();
    await expect(settings.selectFolderButton).toBeVisible();
    await expect(settings.tokenInput).toBeVisible();
    await expect(settings.siteIdInput).toBeVisible();
  });

  test('close button should close modal', async () => {
    await settings.open();
    await settings.close();
    expect(await settings.isOpen()).toBe(false);
  });

  test('cancel button should close modal', async () => {
    await settings.open();
    await settings.cancel();
    expect(await settings.isOpen()).toBe(false);
  });

  test('clicking outside should close modal', async () => {
    await settings.open();
    await settings.clickOutside();
    expect(await settings.isOpen()).toBe(false);
  });

  test('saving config should persist to project file', async ({ page }) => {
    await settings.open();
    await settings.fillNetlifySettings('test-token-123', 'site-id-456');
    await settings.save();

    // Check mock config storage
    const savedConfig = await page.evaluate(() => {
      const win = window as any;
      return win._mockConfigStorage?.netlify || null;
    });

    expect(savedConfig).toEqual({
      token: 'test-token-123',
      siteId: 'site-id-456',
    });
  });

  test('saving config should show success toast', async () => {
    await settings.open();
    await settings.setToken('test-token');
    await settings.save();
    
    await editor.waitForToast('Configuratie opgeslagen');
  });

  test('config values should update state correctly', async ({ page }) => {
    // Save config
    await settings.open();
    await settings.fillNetlifySettings('persistent-token', 'persistent-site');
    await settings.save();

    // Check state was updated
    const stateConfig = await page.evaluate(() => {
      const win = window as any;
      return win.state?.netlifyConfig;
    });

    expect(stateConfig).toEqual({
      token: 'persistent-token',
      siteId: 'persistent-site',
    });
  });

  test('deploy button should be disabled without token', async () => {
    await expect(editor.btnDeployNetlify).toBeDisabled();
  });

  test('deploy button should be enabled with token and file', async () => {
    // Save token
    await settings.open();
    await settings.setToken('valid-token');
    await settings.save();
    
    // Button should be enabled (file is already loaded)
    await expect(editor.btnDeployNetlify).toBeEnabled();
  });

  test('status indicator should show "niet geconfigureerd" initially', async () => {
    await expect(editor.providerStatusText).toContainText('niet geconfigureerd');
  });

  test('status indicator should update after saving config', async () => {
    await settings.open();
    await settings.setToken('my-token');
    await settings.save();
    
    await expect(editor.providerStatusText).toContainText('Nieuwe site bij publicatie');
  });

  test('status indicator should show site ID when configured', async () => {
    await settings.open();
    await settings.fillNetlifySettings('my-token', 'abc123');
    await settings.save();
    
    await expect(editor.providerStatusText).toContainText('Site: abc123');
  });

  test('status dot should indicate connection state', async ({ page }) => {
    // Initially not connected (no 'connected' class)
    let hasConnected = await editor.providerStatus.evaluate(el => 
      el.classList.contains('connected')
    );
    expect(hasConnected).toBe(false);
    
    // After saving token, should be connected
    await settings.open();
    await settings.setToken('my-token');
    await settings.save();
    
    hasConnected = await editor.providerStatus.evaluate(el => 
      el.classList.contains('connected')
    );
    expect(hasConnected).toBe(true);
  });

  test('cancel should not save changes', async ({ page }) => {
    // First save some config
    await settings.open();
    await settings.setToken('original-token');
    await settings.save();

    // Open again and make changes but cancel
    await settings.open();
    await settings.setToken('new-token-that-should-not-save');
    await settings.cancel();

    // Check that saved config still has original value
    const savedConfig = await page.evaluate(() => {
      const win = window as any;
      return win._mockConfigStorage?.netlify || null;
    });

    expect(savedConfig.token).toBe('original-token');
  });

  test('token input should be password type', async () => {
    await settings.open();
    await expect(settings.tokenInput).toHaveAttribute('type', 'password');
  });

  test('cloudflare token input should be password type', async () => {
    await settings.open();
    await settings.setDeployProvider('cloudflare');
    await expect(settings.cloudflareTokenInput).toHaveAttribute('type', 'password');
  });

  test('saving Cloudflare config updates state', async ({ page }) => {
    await settings.open();
    await settings.setDeployProvider('cloudflare');
    await settings.fillCloudflareSettings('cf-token', 'acc123', 'my-pages');
    await settings.save();

    const cf = await page.evaluate(() => (window as any).state?.cloudflareConfig);
    expect(cf).toMatchObject({
      apiToken: 'cf-token',
      accountId: 'acc123',
      projectName: 'my-pages',
    });
    const prov = await page.evaluate(() => (window as any).state?.deployProvider);
    expect(prov).toBe('cloudflare');
  });

  test('status shows Cloudflare project when configured', async () => {
    await settings.open();
    await settings.setDeployProvider('cloudflare');
    await settings.fillCloudflareSettings('t', 'acct', 'projname');
    await settings.save();
    await expect(editor.providerStatusText).toContainText('Project: projname');
  });
});

