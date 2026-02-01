import { expect, Locator } from '@playwright/test';

/**
 * Custom assertions for ProjectWhy CMS tests
 * 
 * These extend Playwright's built-in assertions with
 * domain-specific checks for the editor.
 */

/**
 * Asserts that an element has contenteditable enabled
 * @param locator - Element locator
 */
export async function expectContentEditable(locator: Locator) {
  await expect(locator).toHaveAttribute('contenteditable', 'true');
}

/**
 * Asserts that an element is marked as hidden by the CMS
 * @param locator - Toggleable element locator
 */
export async function expectCmsHidden(locator: Locator) {
  await expect(locator).toHaveAttribute('data-cms-hidden', 'true');
}

/**
 * Asserts that an element is marked as visible by the CMS
 * @param locator - Toggleable element locator
 */
export async function expectCmsVisible(locator: Locator) {
  // Element should either not have the attribute, or have it set to something other than 'true'
  const attr = await locator.getAttribute('data-cms-hidden');
  expect(attr).not.toBe('true');
}

/**
 * Asserts that element has the editor's hover outline color
 * Checks for the injected CSS outline styles
 * 
 * @param locator - Element locator
 * @param expectedColor - Expected RGB color (e.g., '88, 166, 255' for accent blue)
 */
export async function expectOutlineColor(locator: Locator, expectedColor: string) {
  await locator.hover();
  const outlineColor = await locator.evaluate(el => 
    window.getComputedStyle(el).outlineColor
  );
  expect(outlineColor).toContain(expectedColor);
}

/**
 * Asserts that a repeatable container has a specific number of items
 * @param container - Repeatable container locator
 * @param count - Expected number of items
 */
export async function expectItemCount(container: Locator, count: number) {
  // Exclude toolbar elements from count
  const items = container.locator('> *:not(.cms-section-toolbar):not(.cms-toggle-toolbar)');
  await expect(items).toHaveCount(count);
}

/**
 * Gets the text content of a toast notification
 * Waits for toast to appear and returns its text
 * 
 * @param toastContainer - Toast container locator
 * @param timeout - Maximum wait time
 */
export async function getLatestToastText(toastContainer: Locator, timeout = 5000): Promise<string> {
  const toast = toastContainer.locator('.toast').last();
  await toast.waitFor({ timeout });
  return toast.textContent() ?? '';
}

/**
 * Asserts element has reduced opacity (for hidden toggleables)
 * The editor sets opacity to 0.35 for hidden elements
 * 
 * @param locator - Element locator
 */
export async function expectReducedOpacity(locator: Locator) {
  const opacity = await locator.evaluate(el => 
    window.getComputedStyle(el).opacity
  );
  expect(parseFloat(opacity)).toBeLessThan(0.5);
}

/**
 * Asserts element has normal opacity
 * @param locator - Element locator
 */
export async function expectNormalOpacity(locator: Locator) {
  const opacity = await locator.evaluate(el => 
    window.getComputedStyle(el).opacity
  );
  expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.9);
}

/**
 * Waits for iframe content to be fully loaded and interactive
 * @param frame - Frame locator
 */
export async function waitForFrameReady(frame: Locator) {
  await frame.waitFor({ state: 'attached' });
  // Give the iframe content time to render and setup event handlers
  await frame.page().waitForTimeout(100);
}

/**
 * Color constants used by the editor for outline highlighting
 */
export const EDITOR_COLORS = {
  // Outline colors for different element types
  EDITABLE_TEXT: '88, 166, 255',    // --accent: #58a6ff
  EDITABLE_IMAGE: '163, 113, 247',  // --image-outline: #a371f7
  EDITABLE_LINK: '240, 136, 62',    // --link-outline: #f0883e
  TOGGLEABLE: '57, 213, 213',       // --toggleable-outline: #39d5d5
  REPEATABLE: '63, 185, 80',        // --repeatable-outline: #3fb950
};

