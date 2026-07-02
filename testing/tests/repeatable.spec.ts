import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame } from '../page-objects';
import { TEST_TEMPLATE, SINGLE_REPEATABLE_TEMPLATE, NESTED_TEMPLATE } from '../helpers';
import { expectContentEditable, expectItemCount, EDITOR_COLORS } from '../helpers/assertions';

/**
 * Repeatable Section Tests (data-repeatable)
 * 
 * Tests the section duplication/deletion functionality:
 * - Child elements show toolbar on hover
 * - Duplicate creates a copy with working editables
 * - Delete removes the section
 * - Cannot delete the last remaining item
 * - Nested editables work in cloned sections
 */
test.describe('Repeatable Sections (data-repeatable)', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('repeatable children should show toolbar on hover', async () => {
    const container = preview.getRepeatable('#cards-container');
    const firstCard = container.locator('> .card').first();
    
    // Initially toolbar should be hidden
    const toolbar = firstCard.locator('.cms-section-toolbar');
    await expect(toolbar).not.toBeVisible();
    
    // Hover should reveal toolbar
    await firstCard.hover();
    await expect(toolbar).toBeVisible();
  });

  test('toolbar should have duplicate and delete buttons', async () => {
    const container = preview.getRepeatable('#cards-container');
    const firstCard = container.locator('> .card').first();
    
    await firstCard.hover();
    
    const duplicateBtn = preview.getDuplicateButton(firstCard);
    const deleteBtn = preview.getDeleteButton(firstCard);
    
    await expect(duplicateBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
    await expect(duplicateBtn).toContainText('Dupliceren');
    await expect(deleteBtn).toContainText('Verwijderen');
  });

  test('clicking duplicate should clone the section', async () => {
    const container = preview.getRepeatable('#cards-container');
    
    // Initial count (template has 3 cards)
    await expectItemCount(container, 3);
    
    // Hover and click duplicate
    const firstCard = container.locator('> .card').first();
    await firstCard.hover();
    await preview.getDuplicateButton(firstCard).click();
    
    // Should now have 4 cards
    await expectItemCount(container, 4);
    
    // Should show toast
    await editor.waitForToast('Sectie gedupliceerd');
  });

  test('clicking delete should remove the section', async () => {
    const container = preview.getRepeatable('#cards-container');
    
    // Initial count
    await expectItemCount(container, 3);
    
    // Delete the second card
    const secondCard = container.locator('> .card').nth(1);
    await secondCard.hover();
    await preview.getDeleteButton(secondCard).click();
    
    // Should now have 2 cards
    await expectItemCount(container, 2);
    
    // Should show toast
    await editor.waitForToast('Sectie verwijderd');
  });

  test('should not allow deleting the last item', async () => {
    // Use the team container from TEST_TEMPLATE which has only 1 item
    const container = preview.getRepeatable('#team-container');
    
    // Should have 1 item initially
    const items = container.locator('> .card');
    await expect(items).toHaveCount(1);
    
    // Try to delete the only item
    const onlyItem = items.first();
    await onlyItem.hover();
    
    // Find and click delete button
    const deleteBtn = onlyItem.locator('.cms-section-btn.delete');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click({ force: true });
    
    // Should show error toast
    await editor.waitForToast('Kan het laatste item niet verwijderen');
    
    // Should still have 1 item
    await expect(items).toHaveCount(1);
  });

  test('duplicated sections should have working editable elements', async () => {
    const container = preview.getRepeatable('#cards-container');
    const firstCard = container.locator('> .card').first();
    
    // Duplicate
    await firstCard.hover();
    await preview.getDuplicateButton(firstCard).click();
    
    // The new card (inserted after first) should have contenteditable
    const newCard = container.locator('> .card').nth(1);
    const newTitle = newCard.locator('[data-editable]').first();
    
    await expectContentEditable(newTitle);
  });

  test('duplicated sections should be independently editable', async () => {
    const container = preview.getRepeatable('#cards-container');
    const firstCard = container.locator('> .card').first();
    
    // Get original title text
    const originalTitle = await firstCard.locator('h3[data-editable]').textContent();
    
    // Duplicate
    await firstCard.hover();
    await preview.getDuplicateButton(firstCard).click();
    
    // Edit the clone's title
    const clonedCard = container.locator('> .card').nth(1);
    const clonedTitle = clonedCard.locator('h3[data-editable]');
    await clonedTitle.click();
    await clonedTitle.fill('Modified Clone Title');
    
    // Original should be unchanged
    await expect(firstCard.locator('h3[data-editable]')).toHaveText(originalTitle!);
    await expect(clonedTitle).toHaveText('Modified Clone Title');
  });

  test('duplicated sections should preserve safe editable line breaks', async ({ page }) => {
    const container = preview.getRepeatable('#cards-container');
    const firstCard = container.locator('> .card').first();

    await firstCard.hover();
    await preview.getDuplicateButton(firstCard).click();

    const clonedDescription = container.locator('> .card').nth(1).locator('p[data-editable]');
    await clonedDescription.fill('Line one');
    await clonedDescription.evaluate(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line two');

    const html = await clonedDescription.evaluate(el => el.innerHTML);
    expect(html).toBe('Line one<br>Line two');
    expect(html).not.toContain('<div');
  });

  test('duplicated sections should have working duplicate/delete buttons', async () => {
    const container = preview.getRepeatable('#cards-container');
    
    // Start with 3
    await expectItemCount(container, 3);
    
    // Duplicate first
    const firstCard = container.locator('> .card').first();
    await firstCard.hover();
    await preview.getDuplicateButton(firstCard).click();
    
    // Now 4
    await expectItemCount(container, 4);
    
    // Duplicate the clone
    const clonedCard = container.locator('> .card').nth(1);
    await clonedCard.hover();
    await preview.getDuplicateButton(clonedCard).click();
    
    // Now 5
    await expectItemCount(container, 5);
  });

  test('repeatable children should show outline on hover', async () => {
    const container = preview.getRepeatable('#cards-container');
    const card = container.locator('> .card').first();
    
    await card.hover();
    
    const outlineColor = await card.evaluate(el => 
      window.getComputedStyle(el).outlineColor
    );
    
    expect(outlineColor).toContain(EDITOR_COLORS.REPEATABLE);
  });

  test('nested editables in repeatable should work', async () => {
    await editor.injectTestContent(NESTED_TEMPLATE);
    
    const container = preview.getRepeatable('#outer-container');
    const section = container.locator('> section').first();
    
    // Check nested editable
    const title = section.locator('[data-editable]#section-1-title');
    await expectContentEditable(title);
    
    // Check nested toggleable exists
    const toggleable = section.locator('[data-toggleable]#section-1-toggleable');
    await expect(toggleable).toBeVisible();
    
    // Check nested link
    const link = section.locator('[data-editable-link]#section-1-link');
    await expect(link).toBeVisible();
  });

  test('delete all but one should still prevent last deletion', async () => {
    const container = preview.getRepeatable('#cards-container');
    
    // Start with 3
    await expectItemCount(container, 3);
    
    // Delete twice
    for (let i = 0; i < 2; i++) {
      const card = container.locator('> .card').first();
      await card.hover();
      await preview.getDeleteButton(card).click();
      await editor.page.waitForTimeout(100);
    }
    
    // Should have 1 left
    await expectItemCount(container, 1);
    
    // Try to delete the last one
    const lastCard = container.locator('> .card').first();
    await lastCard.hover();
    await preview.getDeleteButton(lastCard).click();
    
    // Should still have 1
    await expectItemCount(container, 1);
    await editor.waitForToast('Kan het laatste item niet verwijderen');
  });
});

