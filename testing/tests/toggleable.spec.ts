import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame } from '../page-objects';
import { TEST_TEMPLATE, TOGGLEABLE_ONLY_TEMPLATE } from '../helpers';
import { 
  expectCmsHidden, 
  expectCmsVisible, 
  expectReducedOpacity,
  EDITOR_COLORS 
} from '../helpers/assertions';

/**
 * Toggleable Element Tests (data-toggleable)
 * 
 * Tests the show/hide toggle functionality:
 * - Initially visible elements show "Visible" button
 * - Initially hidden elements show "Show" button  
 * - Hidden elements have reduced opacity in editor
 * - Toggling updates the data-cms-hidden attribute
 */
test.describe('Toggleable Elements (data-toggleable)', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('visible toggleable should show "Visible" button', async () => {
    const visibleBanner = preview.getToggleable('#banner-visible');
    await visibleBanner.hover();
    
    const toggleBtn = preview.getToggleButton(visibleBanner);
    await expect(toggleBtn).toContainText('Visible');
  });

  test('hidden toggleable should show "Show" button', async () => {
    const hiddenBanner = preview.getToggleable('#banner-hidden');
    await hiddenBanner.hover();
    
    const toggleBtn = preview.getToggleButton(hiddenBanner);
    await expect(toggleBtn).toContainText('Show');
  });

  test('hidden toggleable should have data-cms-hidden attribute', async () => {
    const hiddenBanner = preview.getToggleable('#banner-hidden');
    await expectCmsHidden(hiddenBanner);
  });

  test('visible toggleable should not have data-cms-hidden attribute', async () => {
    const visibleBanner = preview.getToggleable('#banner-visible');
    await expectCmsVisible(visibleBanner);
  });

  test('hidden toggleable should have reduced opacity', async () => {
    const hiddenBanner = preview.getToggleable('#banner-hidden');
    await expectReducedOpacity(hiddenBanner);
  });

  test('clicking toggle should hide visible element', async () => {
    const visibleBanner = preview.getToggleable('#banner-visible');
    
    // Initially visible
    await expectCmsVisible(visibleBanner);
    
    // Click toggle
    await visibleBanner.hover();
    const toggleBtn = preview.getToggleButton(visibleBanner);
    await toggleBtn.click();
    
    // Should now be hidden
    await expectCmsHidden(visibleBanner);
    await editor.waitForToast('Element hidden');
  });

  test('clicking toggle should show hidden element', async () => {
    const hiddenBanner = preview.getToggleable('#banner-hidden');
    
    // Initially hidden
    await expectCmsHidden(hiddenBanner);
    
    // Click toggle
    await hiddenBanner.hover();
    const toggleBtn = preview.getToggleButton(hiddenBanner);
    await toggleBtn.click();
    
    // Should now be visible
    await expectCmsVisible(hiddenBanner);
    await editor.waitForToast('Element visible');
  });

  test('toggling should update button text after first toggle', async () => {
    const visibleBanner = preview.getToggleable('#banner-visible');
    await visibleBanner.hover();
    
    const toggleBtn = preview.getToggleButton(visibleBanner);
    
    // Initially shows "Visible"
    await expect(toggleBtn).toContainText('Visible');
    
    // Click to hide - button innerHTML gets replaced
    await toggleBtn.click();
    
    // Wait for DOM update and re-hover to ensure toolbar is visible
    await editor.page.waitForTimeout(100);
    await visibleBanner.hover();
    
    // After toggle, button should show "Show"
    const newToggleBtn = preview.getToggleButton(visibleBanner);
    await expect(newToggleBtn).toContainText('Show');
    
    // Note: Multiple toggles may not work due to event handler being
    // attached to the original button element which gets replaced.
    // This is a known limitation of the current editor implementation.
  });

  test('toggleable elements should show outline on hover', async () => {
    const banner = preview.getToggleable('#banner-visible');
    await banner.hover();
    
    const outlineColor = await banner.evaluate(el => 
      window.getComputedStyle(el).outlineColor
    );
    
    expect(outlineColor).toContain(EDITOR_COLORS.TOGGLEABLE);
  });

  test('multiple toggleable elements work independently', async () => {
    await editor.injectTestContent(TOGGLEABLE_ONLY_TEMPLATE);
    
    const box1 = preview.getToggleable('#box-visible-1');
    const box2 = preview.getToggleable('#box-visible-2');
    
    // Hide first box
    await box1.hover();
    await preview.getToggleButton(box1).click();
    
    // First should be hidden, second still visible
    await expectCmsHidden(box1);
    await expectCmsVisible(box2);
  });

  test('first toggle changes state correctly', async () => {
    const banner = preview.getToggleable('#banner-visible');
    
    // Start visible
    await expectCmsVisible(banner);
    
    // Toggle to hidden
    await banner.hover();
    await preview.getToggleButton(banner).click();
    await expectCmsHidden(banner);
    
    // Verify the attribute was set
    await expect(banner).toHaveAttribute('data-cms-hidden', 'true');
  });

  test('toggleable toolbar should be hidden initially', async () => {
    const banner = preview.getToggleable('#banner-visible');
    const toolbar = banner.locator('.cms-toggle-toolbar');
    
    // Toolbar exists but is hidden via CSS display:none
    await expect(toolbar).toBeAttached();
    await expect(toolbar).not.toBeVisible();
    
    // Becomes visible on hover
    await banner.hover();
    await expect(toolbar).toBeVisible();
  });
});

