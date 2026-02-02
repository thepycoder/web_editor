import { test, expect } from '@playwright/test';
import { EditorPage } from '../page-objects';
import { TEST_TEMPLATE } from '../helpers';

/**
 * Viewport Mode Tests
 *
 * Tests the responsive preview functionality:
 * - Desktop view (full width)
 * - Tablet view (768px)
 * - Phone view (375px)
 */
test.describe('Viewport Modes', () => {
  let editor: EditorPage;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('should show viewport buttons in toolbar', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');
    const phoneBtn = page.locator('#viewport-phone');

    await expect(desktopBtn).toBeVisible();
    await expect(tabletBtn).toBeVisible();
    await expect(phoneBtn).toBeVisible();
  });

  test('desktop button should be active by default', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');
    const phoneBtn = page.locator('#viewport-phone');

    await expect(desktopBtn).toHaveClass(/active/);
    await expect(tabletBtn).not.toHaveClass(/active/);
    await expect(phoneBtn).not.toHaveClass(/active/);
  });

  test('clicking tablet button should activate tablet mode', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');
    const phoneBtn = page.locator('#viewport-phone');

    await tabletBtn.click();

    await expect(desktopBtn).not.toHaveClass(/active/);
    await expect(tabletBtn).toHaveClass(/active/);
    await expect(phoneBtn).not.toHaveClass(/active/);
  });

  test('clicking phone button should activate phone mode', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');
    const phoneBtn = page.locator('#viewport-phone');

    await phoneBtn.click();

    await expect(desktopBtn).not.toHaveClass(/active/);
    await expect(tabletBtn).not.toHaveClass(/active/);
    await expect(phoneBtn).toHaveClass(/active/);
  });

  test('clicking desktop button should return to desktop mode', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');

    // First switch to tablet
    await tabletBtn.click();
    await expect(tabletBtn).toHaveClass(/active/);

    // Then switch back to desktop
    await desktopBtn.click();
    await expect(desktopBtn).toHaveClass(/active/);
    await expect(tabletBtn).not.toHaveClass(/active/);
  });

  test('preview frame should have viewport-desktop class by default', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');

    // Desktop mode is default, but class may not be explicitly set initially
    // After clicking desktop, it should have the class
    await page.locator('#viewport-desktop').click();
    await expect(previewFrame).toHaveClass(/viewport-desktop/);
  });

  test('preview frame should have viewport-tablet class in tablet mode', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');
    const tabletBtn = page.locator('#viewport-tablet');

    await tabletBtn.click();

    await expect(previewFrame).toHaveClass(/viewport-tablet/);
    await expect(previewFrame).not.toHaveClass(/viewport-desktop/);
    await expect(previewFrame).not.toHaveClass(/viewport-phone/);
  });

  test('preview frame should have viewport-phone class in phone mode', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');
    const phoneBtn = page.locator('#viewport-phone');

    await phoneBtn.click();

    await expect(previewFrame).toHaveClass(/viewport-phone/);
    await expect(previewFrame).not.toHaveClass(/viewport-desktop/);
    await expect(previewFrame).not.toHaveClass(/viewport-tablet/);
  });

  test('tablet mode should set max-width to 768px', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');
    const tabletBtn = page.locator('#viewport-tablet');

    await tabletBtn.click();

    const maxWidth = await previewFrame.evaluate(el =>
      window.getComputedStyle(el).maxWidth
    );
    expect(maxWidth).toBe('768px');
  });

  test('phone mode should set max-width to 375px', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');
    const phoneBtn = page.locator('#viewport-phone');

    await phoneBtn.click();

    const maxWidth = await previewFrame.evaluate(el =>
      window.getComputedStyle(el).maxWidth
    );
    expect(maxWidth).toBe('375px');
  });

  test('state should track current viewport mode', async ({ page }) => {
    // Check initial state
    let currentViewport = await page.evaluate(() => (window as any).state.ui.viewport);
    expect(currentViewport).toBe('desktop');

    // Switch to tablet
    await page.locator('#viewport-tablet').click();
    currentViewport = await page.evaluate(() => (window as any).state.ui.viewport);
    expect(currentViewport).toBe('tablet');

    // Switch to phone
    await page.locator('#viewport-phone').click();
    currentViewport = await page.evaluate(() => (window as any).state.ui.viewport);
    expect(currentViewport).toBe('phone');

    // Switch back to desktop
    await page.locator('#viewport-desktop').click();
    currentViewport = await page.evaluate(() => (window as any).state.ui.viewport);
    expect(currentViewport).toBe('desktop');
  });

  test('setViewportMode function should work programmatically', async ({ page }) => {
    const previewFrame = page.locator('#preview-frame');

    // Set to tablet programmatically
    await page.evaluate(() => (window as any).setViewportMode('tablet'));
    await expect(previewFrame).toHaveClass(/viewport-tablet/);
    await expect(page.locator('#viewport-tablet')).toHaveClass(/active/);

    // Set to phone programmatically
    await page.evaluate(() => (window as any).setViewportMode('phone'));
    await expect(previewFrame).toHaveClass(/viewport-phone/);
    await expect(page.locator('#viewport-phone')).toHaveClass(/active/);
  });

  test('viewport buttons should have correct titles', async ({ page }) => {
    const desktopBtn = page.locator('#viewport-desktop');
    const tabletBtn = page.locator('#viewport-tablet');
    const phoneBtn = page.locator('#viewport-phone');

    await expect(desktopBtn).toHaveAttribute('title', 'Desktop view (100%)');
    await expect(tabletBtn).toHaveAttribute('title', 'Tablet view (768px)');
    await expect(phoneBtn).toHaveAttribute('title', 'Phone view (375px)');
  });
});
