import { FrameLocator, Locator } from '@playwright/test';

/**
 * Helper class for interacting with elements inside the preview iframe.
 * 
 * The editor renders templates in an iframe (#preview-frame).
 * This class provides typed accessors for editable elements.
 * 
 * USAGE:
 * ```typescript
 * const preview = new PreviewFrame(editor.previewFrame);
 * const title = preview.getEditableText('#main-title');
 * await title.fill('New Title');
 * ```
 */
export class PreviewFrame {
  readonly frame: FrameLocator;

  constructor(frame: FrameLocator) {
    this.frame = frame;
  }

  /**
   * Gets elements with data-editable attribute (text editing)
   * @param selector - Optional additional CSS selector
   */
  getEditableText(selector?: string): Locator {
    return selector 
      ? this.frame.locator(`[data-editable]${selector}`)
      : this.frame.locator('[data-editable]');
  }

  /**
   * Gets elements with data-editable-image attribute (image replacement)
   * @param selector - Optional additional CSS selector
   */
  getEditableImage(selector?: string): Locator {
    return selector
      ? this.frame.locator(`[data-editable-image]${selector}`)
      : this.frame.locator('[data-editable-image]');
  }

  /**
   * Gets elements with data-editable-link attribute (link editing)
   * @param selector - Optional additional CSS selector
   */
  getEditableLink(selector?: string): Locator {
    return selector
      ? this.frame.locator(`[data-editable-link]${selector}`)
      : this.frame.locator('[data-editable-link]');
  }

  /**
   * Gets elements with data-toggleable attribute (visibility toggle)
   * @param selector - Optional additional CSS selector
   */
  getToggleable(selector?: string): Locator {
    return selector
      ? this.frame.locator(`[data-toggleable]${selector}`)
      : this.frame.locator('[data-toggleable]');
  }

  /**
   * Gets elements with data-repeatable attribute (section containers)
   * @param selector - Optional additional CSS selector
   */
  getRepeatable(selector?: string): Locator {
    return selector
      ? this.frame.locator(`[data-repeatable]${selector}`)
      : this.frame.locator('[data-repeatable]');
  }

  /**
   * Gets section toolbars (duplicate/delete buttons for repeatable items)
   */
  getSectionToolbar(): Locator {
    return this.frame.locator('.cms-section-toolbar');
  }

  /**
   * Gets toggle toolbars (show/hide buttons for toggleable elements)
   */
  getToggleToolbar(): Locator {
    return this.frame.locator('.cms-toggle-toolbar');
  }

  /**
   * Gets the duplicate button within a section
   * @param section - The section locator
   */
  getDuplicateButton(section: Locator): Locator {
    return section.locator('.cms-section-btn.duplicate');
  }

  /**
   * Gets the delete button within a section
   * @param section - The section locator
   */
  getDeleteButton(section: Locator): Locator {
    return section.locator('.cms-section-btn.delete');
  }

  /**
   * Gets the toggle visibility button within a toggleable element
   * @param toggleable - The toggleable element locator
   */
  getToggleButton(toggleable: Locator): Locator {
    return toggleable.locator('.cms-toggle-btn');
  }

  /**
   * Counts children of a repeatable container
   * @param selector - Selector for the repeatable container
   */
  async countRepeatableItems(selector: string): Promise<number> {
    const container = this.getRepeatable(selector);
    return container.locator('> *:not(.cms-section-toolbar)').count();
  }

  /**
   * Gets nth child of a repeatable container
   * @param containerSelector - Selector for the container
   * @param index - Zero-based index
   */
  getRepeatableItem(containerSelector: string, index: number): Locator {
    return this.getRepeatable(containerSelector)
      .locator('> *:not(.cms-section-toolbar)')
      .nth(index);
  }
}

