import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame } from '../page-objects';
import { TEST_TEMPLATE, EMPTY_TEMPLATE } from '../helpers';

/**
 * Editor State Tests
 * 
 * Tests the overall editor state management:
 * - Initial empty state
 * - File loaded state
 * - Unsaved changes tracking
 * - Content extraction
 */
test.describe('Editor State', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
  });

  test('should show empty state initially', async () => {
    await expect(editor.emptyState).toBeVisible();
    await expect(editor.previewWrapper).not.toBeVisible();
  });

  test('should hide empty state after loading content', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    await expect(editor.emptyState).not.toBeVisible();
    await expect(editor.previewWrapper).toBeVisible();
  });

  test('should show file name after loading', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    await expect(editor.fileName).toBeVisible();
    await expect(editor.fileName).toHaveText('Test Project');
  });

  test('save button should be disabled initially', async () => {
    await expect(editor.btnSave).toBeDisabled();
  });

  test('save button should be enabled after loading content', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    await expect(editor.btnSave).toBeEnabled();
  });

  test('unsaved indicator should be hidden initially', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    await expect(editor.unsavedIndicator).not.toBeVisible();
  });

  test('unsaved indicator should appear after edits', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    const title = preview.getEditableText('#main-title');
    await title.click();
    await title.fill('Changed');
    await title.evaluate(el => el.dispatchEvent(new Event('input', { bubbles: true })));
    
    await expect(editor.unsavedIndicator).toBeVisible();
  });

  test('open settings button should exist in empty state', async () => {
    await expect(editor.btnOpenSettings).toBeVisible();
  });

  test('deploy button should be disabled without config', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    
    editor = new EditorPage(page);
    await editor.injectTestContent(TEST_TEMPLATE);
    
    // Even with file loaded, deploy should be disabled without token
    await expect(editor.btnDeployNetlify).toBeDisabled();
  });

  test('should handle template with no editable elements', async () => {
    await editor.injectTestContent(EMPTY_TEMPLATE);
    
    // Should still load and display
    await expect(editor.previewWrapper).toBeVisible();
    
    // No editable elements should exist
    const editables = preview.getEditableText();
    await expect(editables).toHaveCount(0);
  });

  test('preview iframe should be visible after loading', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    const iframe = editor.page.locator('#preview-frame');
    await expect(iframe).toBeVisible();
  });

  test('iframe should contain the loaded content', async () => {
    await editor.injectTestContent(TEST_TEMPLATE);
    
    const title = preview.getEditableText('#main-title');
    await expect(title).toHaveText('Editable Main Title');
  });
});

test.describe('Content Extraction', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('getEditedContent should return HTML', async () => {
    const content = await editor.getEditedContent();
    
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html');
    expect(content).toContain('</html>');
  });

  test('getEditedContent should reflect edits', async () => {
    const title = preview.getEditableText('#main-title');
    await title.click();
    await title.fill('UNIQUE_EDIT_MARKER');
    
    const content = await editor.getEditedContent();
    expect(content).toContain('UNIQUE_EDIT_MARKER');
  });

  test('getEditedContent should not include editor styles', async () => {
    const content = await editor.getEditedContent();
    
    // Editor injects a style element with id 'cms-editor-styles'
    expect(content).not.toContain('cms-editor-styles');
  });

  test('getEditedContent should remove contenteditable attributes', async () => {
    const content = await editor.getEditedContent();
    
    // contenteditable is added by editor but should be removed on export
    expect(content).not.toContain('contenteditable="true"');
  });

  test('getEditedContent should preserve data attributes', async () => {
    const content = await editor.getEditedContent();
    
    expect(content).toContain('data-editable');
    expect(content).toContain('data-editable-image');
    expect(content).toContain('data-editable-link');
    expect(content).toContain('data-toggleable');
    expect(content).toContain('data-repeatable');
  });

  test('hidden toggleable should have display:none in exported content', async () => {
    // Hide a toggleable element
    const banner = preview.getToggleable('#banner-visible');
    await banner.hover();
    await preview.getToggleButton(banner).click();
    
    const content = await editor.getEditedContent();
    
    // The hidden element should have display:none
    // This is how the editor preserves visibility state
    expect(content).toMatch(/id="banner-visible"[^>]*style="[^"]*display:\s*none/);
  });
});

