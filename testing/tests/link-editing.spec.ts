import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame, LinkModal } from '../page-objects';
import { TEST_TEMPLATE, LINKS_ONLY_TEMPLATE } from '../helpers';
import { EDITOR_COLORS } from '../helpers/assertions';

/**
 * Link Editing Tests (data-editable-link)
 * 
 * Tests the link editing modal functionality:
 * - Clicking link opens modal
 * - Modal is pre-filled with current values
 * - Save updates link text and URL
 * - Cancel/close preserves original values
 * - Various close mechanisms work
 */
test.describe('Link Editing (data-editable-link)', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;
  let linkModal: LinkModal;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    linkModal = new LinkModal(page);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('clicking editable link should open modal', async () => {
    const link = preview.getEditableLink('#nav-link-contact');
    await link.click();
    
    expect(await linkModal.isOpen()).toBe(true);
  });

  test('link modal should be pre-filled with current values', async () => {
    const link = preview.getEditableLink('#nav-link-contact');
    await link.click();
    await linkModal.waitForOpen();
    
    // Check input values match the link
    expect(await linkModal.getLinkText()).toBe('Contact');
    expect(await linkModal.getUrl()).toBe('https://example.com/contact');
  });

  test('saving link should update href and text', async () => {
    const link = preview.getEditableLink('#nav-link-home');
    await link.click();
    await linkModal.waitForOpen();
    
    // Modify values
    await linkModal.setLinkText('Homepage');
    await linkModal.setUrl('https://newsite.com');
    await linkModal.save();
    
    // Link should be updated
    await expect(link).toHaveText('Homepage');
    await expect(link).toHaveAttribute('href', 'https://newsite.com');
    
    // Should show toast
    await editor.waitForToast('Link updated');
  });

  test('cancel button should close modal without changes', async () => {
    const link = preview.getEditableLink('#nav-link-about');
    const originalText = await link.textContent();
    const originalHref = await link.getAttribute('href');
    
    await link.click();
    await linkModal.waitForOpen();
    
    // Make changes
    await linkModal.setLinkText('Should Not Apply');
    await linkModal.setUrl('https://should-not-apply.com');
    
    // Cancel
    await linkModal.cancel();
    
    // Link should be unchanged
    await expect(link).toHaveText(originalText!);
    await expect(link).toHaveAttribute('href', originalHref!);
  });

  test('close button (X) should close modal without changes', async () => {
    const link = preview.getEditableLink('#nav-link-about');
    const originalText = await link.textContent();
    
    await link.click();
    await linkModal.waitForOpen();
    await linkModal.setLinkText('Should Not Apply');
    await linkModal.close();
    
    await expect(link).toHaveText(originalText!);
  });

  test('clicking outside modal should close it', async () => {
    const link = preview.getEditableLink('#nav-link-home');
    await link.click();
    await linkModal.waitForOpen();
    
    await linkModal.clickOutside();
    
    expect(await linkModal.isOpen()).toBe(false);
  });

  test('pressing Enter in URL field should save', async () => {
    const link = preview.getEditableLink('#inline-link');
    await link.click();
    await linkModal.waitForOpen();
    
    await linkModal.setUrl('https://enter-test.com');
    await linkModal.pressEnterToSave();
    
    await expect(link).toHaveAttribute('href', 'https://enter-test.com');
  });

  test('editable links should show outline on hover', async () => {
    const link = preview.getEditableLink('#nav-link-home');
    await link.hover();
    
    const outlineColor = await link.evaluate(el => 
      window.getComputedStyle(el).outlineColor
    );
    
    expect(outlineColor).toContain(EDITOR_COLORS.EDITABLE_LINK);
  });

  test('hash links should be editable', async () => {
    await editor.injectTestContent(LINKS_ONLY_TEMPLATE);
    
    const hashLink = preview.getEditableLink('#link-3');
    await hashLink.click();
    await linkModal.waitForOpen();
    
    expect(await linkModal.getUrl()).toBe('#');
    
    await linkModal.setUrl('#new-section');
    await linkModal.save();
    
    await expect(hashLink).toHaveAttribute('href', '#new-section');
  });

  test('mailto links should be editable', async () => {
    await editor.injectTestContent(LINKS_ONLY_TEMPLATE);
    
    const mailtoLink = preview.getEditableLink('#link-4');
    await mailtoLink.click();
    await linkModal.waitForOpen();
    
    expect(await linkModal.getUrl()).toBe('mailto:test@example.com');
    
    await linkModal.setUrl('mailto:new@example.com');
    await linkModal.save();
    
    await expect(mailtoLink).toHaveAttribute('href', 'mailto:new@example.com');
  });

  test('multiple link edits in sequence should work', async () => {
    const link1 = preview.getEditableLink('#nav-link-home');
    const link2 = preview.getEditableLink('#nav-link-about');
    
    // Edit first link
    await link1.click();
    await linkModal.waitForOpen();
    await linkModal.setLinkText('First Edit');
    await linkModal.save();
    
    // Edit second link
    await link2.click();
    await linkModal.waitForOpen();
    await linkModal.setLinkText('Second Edit');
    await linkModal.save();
    
    await expect(link1).toHaveText('First Edit');
    await expect(link2).toHaveText('Second Edit');
  });
});

