import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame } from '../page-objects';
import { TEST_TEMPLATE, MINIMAL_TEMPLATE } from '../helpers';
import { expectContentEditable, EDITOR_COLORS } from '../helpers/assertions';

/**
 * Text Editing Tests (data-editable)
 * 
 * Tests the inline text editing functionality:
 * - Elements become contenteditable
 * - Visual feedback on hover/focus
 * - Multiple editables work independently
 */
test.describe('Text Editing (data-editable)', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('editable elements should have contenteditable attribute', async () => {
    const title = preview.getEditableText('#main-title');
    await expectContentEditable(title);
  });

  test('all data-editable elements should be contenteditable', async () => {
    const editables = preview.getEditableText();
    const count = await editables.count();
    
    // Template has multiple editable elements
    expect(count).toBeGreaterThan(3);
    
    // Check first few are contenteditable
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expectContentEditable(editables.nth(i));
    }
  });

  test('editable elements should show outline on hover', async () => {
    const title = preview.getEditableText('#main-title');
    
    // Hover over element
    await title.hover();
    
    // Check for accent color outline (injected by editor)
    const outlineColor = await title.evaluate(el => 
      window.getComputedStyle(el).outlineColor
    );
    
    expect(outlineColor).toContain(EDITOR_COLORS.EDITABLE_TEXT);
  });

  test('multiple editable elements should be independent', async () => {
    const title = preview.getEditableText('#main-title');
    const description = preview.getEditableText('#main-description');

    // Get original description text
    const originalDescription = await description.textContent();

    // Edit only the title
    await title.click();
    await title.fill('Completely New Title');

    // Description should be unchanged
    await expect(description).toHaveText(originalDescription!);
    
    // Title should have new content
    await expect(title).toHaveText('Completely New Title');
  });

  test('empty editable should still be editable', async ({ page }) => {
    // Inject template with empty editable
    await editor.injectTestContent(`
      <!DOCTYPE html>
      <html><head><title>Empty Test</title></head>
      <body>
        <p data-editable id="empty-p"></p>
      </body>
      </html>
    `);

    const emptyP = preview.getEditableText('#empty-p');
    await expectContentEditable(emptyP);
    
    // Should be able to type in it
    await emptyP.click();
    await emptyP.fill('Now has content');
    await expect(emptyP).toHaveText('Now has content');
  });

  test('editable h1 and editable p should both work', async () => {
    const title = preview.getEditableText('#main-title');
    const para = preview.getEditableText('#main-description');

    // Both should be editable
    await expectContentEditable(title);
    await expectContentEditable(para);

    // Edit both
    await title.click();
    await title.fill('New H1');
    
    await para.click();
    await para.fill('New paragraph');

    await expect(title).toHaveText('New H1');
    await expect(para).toHaveText('New paragraph');
  });

  test('enter in editable text should preserve blank lines on export', async ({ page }) => {
    const description = preview.getEditableText('#main-description');

    await description.fill('Line one');
    await description.evaluate(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line three');

    const html = await description.evaluate(el => el.innerHTML);
    expect(html).toBe('Line one<br><br>Line three');

    const content = await editor.getEditedContent();
    expect(content).toContain('Line one<br><br>Line three');
  });

  test('enter in editable text should insert line breaks without block wrappers', async ({ page }) => {
    const description = preview.getEditableText('#main-description');

    await description.fill('Line one');
    await description.evaluate(el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line two');

    const html = await description.evaluate(el => el.innerHTML);
    expect(html).toBe('Line one<br>Line two');
    expect(html).not.toContain('<div');
    expect(html).not.toContain('<p');
  });

  test('paste in editable text should insert plain text with safe line breaks', async () => {
    const description = preview.getEditableText('#main-description');

    await description.fill('');
    await description.evaluate(el => {
      const data = new DataTransfer();
      data.setData('text/plain', 'First line\nSecond line');
      data.setData('text/html', '<span style="font-size: 48px">First line</span><div>Second line</div>');
      const event = new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(event);
    });

    const html = await description.evaluate(el => el.innerHTML);
    expect(html).toBe('First line<br>Second line');
    expect(html).not.toContain('font-size');
    expect(html).not.toContain('<div');
  });

  test('exported editable HTML should strip unsafe formatting but keep bold links and breaks', async () => {
    await editor.injectTestContent(`
      <!DOCTYPE html>
      <html><head><title>Dirty Editable Test</title></head>
      <body>
        <div data-editable id="dirty">
          <span style="font-size: 48px; color: red;">Big text</span>
          <div>Second line</div>
          <strong>Bold text</strong>
          <a href="https://example.com" style="font-size: 72px;">Link text</a>
        </div>
      </body>
      </html>
    `);

    const content = await editor.getEditedContent();
    expect(content).toContain('<div data-editable="" id="dirty">');
    expect(content).toContain('Big text<br>Second line<br><strong>Bold text</strong>');
    expect(content).toContain('<a href="https://example.com">Link text</a>');
    expect(content).not.toContain('font-size');
    expect(content).not.toContain('style="');
    expect(content).not.toContain('<span');
  });

  test('minimal template should have working editables', async () => {
    // Test with minimal template
    await editor.injectTestContent(MINIMAL_TEMPLATE);

    const title = preview.getEditableText('#title');
    const content = preview.getEditableText('#content');

    await expectContentEditable(title);
    await expectContentEditable(content);

    await expect(title).toHaveText('Minimal Title');
    await expect(content).toHaveText('Minimal content.');
  });
});

