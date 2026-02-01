import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Link Edit Modal
 * 
 * This modal appears when clicking on a data-editable-link element.
 * It allows editing the link text and URL.
 */
export class LinkModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly textInput: Locator;
  readonly urlInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#link-modal');
    this.textInput = page.locator('#link-text');
    this.urlInput = page.locator('#link-url');
    this.saveButton = page.locator('#link-save');
    this.cancelButton = page.locator('#link-cancel');
    this.closeButton = page.locator('#link-close');
  }

  /**
   * Checks if the modal is currently visible
   */
  async isOpen(): Promise<boolean> {
    const classList = await this.modal.getAttribute('class');
    return classList?.includes('active') ?? false;
  }

  /**
   * Waits for the modal to open
   */
  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() => {
      const modal = document.getElementById('link-modal');
      return modal?.classList.contains('active');
    });
  }

  /**
   * Waits for the modal to close
   */
  async waitForClose() {
    await this.page.waitForFunction(() => {
      const modal = document.getElementById('link-modal');
      return !modal?.classList.contains('active');
    });
  }

  /**
   * Gets the current link text value
   */
  async getLinkText(): Promise<string> {
    return this.textInput.inputValue();
  }

  /**
   * Gets the current URL value
   */
  async getUrl(): Promise<string> {
    return this.urlInput.inputValue();
  }

  /**
   * Sets the link text
   * @param text - New link text
   */
  async setLinkText(text: string) {
    await this.textInput.fill(text);
  }

  /**
   * Sets the URL
   * @param url - New URL
   */
  async setUrl(url: string) {
    await this.urlInput.fill(url);
  }

  /**
   * Clicks the save button
   */
  async save() {
    await this.saveButton.click();
    await this.waitForClose();
  }

  /**
   * Clicks the cancel button
   */
  async cancel() {
    await this.cancelButton.click();
    await this.waitForClose();
  }

  /**
   * Clicks the close (X) button
   */
  async close() {
    await this.closeButton.click();
    await this.waitForClose();
  }

  /**
   * Clicks outside the modal to close it
   */
  async clickOutside() {
    await this.modal.click({ position: { x: 5, y: 5 } });
    await this.waitForClose();
  }

  /**
   * Presses Enter in the URL field to save
   */
  async pressEnterToSave() {
    await this.urlInput.press('Enter');
    await this.waitForClose();
  }
}

