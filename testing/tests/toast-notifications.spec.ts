import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame, SettingsModal } from '../page-objects';
import { TEST_TEMPLATE, waitForEditorReady } from '../helpers';

/**
 * Toast Notification Tests
 * 
 * Tests the toast notification system:
 * - Toasts appear for various actions
 * - Toasts have correct styling (success/error)
 * - Toasts auto-dismiss after timeout
 * - Multiple toasts can stack
 */
test.describe('Toast Notifications', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;
  let settings: SettingsModal;

  test.beforeEach(async ({ page }) => {
    await page.goto('/editor.html');
    await waitForEditorReady(page);
    await page.evaluate(() => localStorage.clear());

    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    settings = new SettingsModal(page);
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('saving settings should show success toast', async () => {
    await settings.open();
    await settings.setToken('test');
    await settings.save();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Configuratie opgeslagen' });
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/success/);
  });

  test('duplicating section should show success toast', async () => {
    const container = preview.getRepeatable('#cards-container');
    const card = container.locator('> .card').first();
    
    await card.hover();
    await preview.getDuplicateButton(card).click();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Sectie gedupliceerd' });
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/success/);
  });

  test('deleting section should show success toast', async () => {
    const container = preview.getRepeatable('#cards-container');
    const card = container.locator('> .card').first();
    
    await card.hover();
    await preview.getDeleteButton(card).click();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Sectie verwijderd' });
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/success/);
  });

  test('failing to delete last item should show error toast', async ({ page }) => {
    // Inject template with single item
    await editor.injectTestContent(`
      <!DOCTYPE html>
      <html><head><title>Single</title></head>
      <body>
        <div data-repeatable id="container">
          <div class="item"><p data-editable>Only item</p></div>
        </div>
      </body>
      </html>
    `);
    
    const container = preview.getRepeatable('#container');
    const item = container.locator('> .item').first();
    
    await item.hover();
    await preview.getDeleteButton(item).click();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Kan het laatste item niet verwijderen' });
    await expect(toast).toBeVisible();
    await expect(toast).toHaveClass(/error/);
  });

  test('toggling element should show toast', async () => {
    const banner = preview.getToggleable('#banner-visible');
    await banner.hover();
    await preview.getToggleButton(banner).click();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Element verborgen' });
    await expect(toast).toBeVisible();
  });

  test('updating link should show toast', async ({ page }) => {
    const link = preview.getEditableLink('#nav-link-home');
    await link.click();
    
    await page.locator('#link-save').click();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Link bijgewerkt' });
    await expect(toast).toBeVisible();
  });

  test('toasts should auto-dismiss after ~4 seconds', async () => {
    await settings.open();
    await settings.setToken('test');
    await settings.save();
    
    const toast = editor.toastContainer.locator('.toast', { hasText: 'Configuratie opgeslagen' });
    await expect(toast).toBeVisible();
    
    // Wait for auto-dismiss (4 seconds + buffer)
    await expect(toast).not.toBeVisible({ timeout: 5000 });
  });

  test('multiple toasts should stack', async () => {
    const container = preview.getRepeatable('#cards-container');
    
    // Trigger multiple toasts quickly
    const card1 = container.locator('> .card').first();
    await card1.hover();
    await preview.getDuplicateButton(card1).click();
    
    const card2 = container.locator('> .card').nth(1);
    await card2.hover();
    await preview.getDuplicateButton(card2).click();
    
    // Should have multiple toasts
    const toasts = editor.toastContainer.locator('.toast');
    const count = await toasts.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('toast should have icon based on type', async () => {
    await settings.open();
    await settings.setToken('test');
    await settings.save();
    
    const toast = editor.toastContainer.locator('.toast.success').first();
    const text = await toast.textContent();
    
    // Success toasts should have checkmark
    expect(text).toContain('✓');
  });

  test('error toast should have X icon', async ({ page }) => {
    // Inject template with single item to trigger error
    await editor.injectTestContent(`
      <!DOCTYPE html>
      <html><head><title>Single</title></head>
      <body>
        <div data-repeatable id="container">
          <div class="item"><p data-editable>Only item</p></div>
        </div>
      </body>
      </html>
    `);
    
    const container = preview.getRepeatable('#container');
    const item = container.locator('> .item').first();
    await item.hover();
    await preview.getDeleteButton(item).click();
    
    const toast = editor.toastContainer.locator('.toast.error').first();
    const text = await toast.textContent();
    
    expect(text).toContain('✕');
  });

  test('toast container should be positioned at bottom-right', async ({ page }) => {
    await settings.open();
    await settings.setToken('test');
    await settings.save();
    
    const container = editor.toastContainer;
    const box = await container.boundingBox();
    const viewport = page.viewportSize()!;
    
    // Should be near bottom-right
    expect(box!.x + box!.width).toBeGreaterThan(viewport.width - 100);
    expect(box!.y).toBeGreaterThan(viewport.height - 200);
  });
});

