import { test, expect } from '@playwright/test';
import { EditorPage, SettingsModal } from '../page-objects';
import { TEST_TEMPLATE } from '../helpers';

/**
 * Netlify Configuration Tests
 *
 * Tests the settings modal and Netlify configuration:
 * - Opening and closing the settings modal
 * - Saving configuration to project file (.web-editor.json)
 * - Loading configuration from project file
 * - Deploy button state based on configuration
 * - Status indicator updates
 */
test.describe('Netlify Configuration', () => {
  let editor: EditorPage;
  let settings: SettingsModal;

  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/editor.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
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
    await expect(settings.customDomainInput).toBeVisible();
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
    await settings.fillNetlifySettings('test-token-123', 'site-id-456', 'my-domain');
    await settings.save();

    // Check mock config storage
    const savedConfig = await page.evaluate(() => {
      const win = window as any;
      return win._mockConfigStorage?.netlify || null;
    });

    expect(savedConfig).toEqual({
      token: 'test-token-123',
      siteId: 'site-id-456',
      customDomain: 'my-domain',
    });
  });

  test('saving config should show success toast', async () => {
    await settings.open();
    await settings.setToken('test-token');
    await settings.save();
    
    await editor.waitForToast('Configuration saved');
  });

  test('config values should update state correctly', async ({ page }) => {
    // Save config
    await settings.open();
    await settings.fillNetlifySettings('persistent-token', 'persistent-site', 'persistent-domain');
    await settings.save();

    // Check state was updated
    const stateConfig = await page.evaluate(() => {
      const win = window as any;
      return win.state?.netlifyConfig;
    });

    expect(stateConfig).toEqual({
      token: 'persistent-token',
      siteId: 'persistent-site',
      customDomain: 'persistent-domain',
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

  test('status indicator should show "Not configured" initially', async () => {
    await expect(editor.netlifyStatusText).toContainText('Not configured');
  });

  test('status indicator should update after saving config', async () => {
    await settings.open();
    await settings.setToken('my-token');
    await settings.save();
    
    await expect(editor.netlifyStatusText).toContainText('New site on deploy');
  });

  test('status indicator should show site ID when configured', async () => {
    await settings.open();
    await settings.fillNetlifySettings('my-token', 'abc123');
    await settings.save();
    
    await expect(editor.netlifyStatusText).toContainText('Site: abc123');
  });

  test('status dot should indicate connection state', async ({ page }) => {
    // Initially not connected (no 'connected' class)
    let hasConnected = await editor.netlifyStatus.evaluate(el => 
      el.classList.contains('connected')
    );
    expect(hasConnected).toBe(false);
    
    // After saving token, should be connected
    await settings.open();
    await settings.setToken('my-token');
    await settings.save();
    
    hasConnected = await editor.netlifyStatus.evaluate(el => 
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
});

