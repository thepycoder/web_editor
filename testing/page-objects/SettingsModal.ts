import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Deploy Settings Modal
 * 
 * This modal allows configuring Netlify deployment settings.
 * Settings are persisted to localStorage.
 */
export class SettingsModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly tokenInput: Locator;
  readonly siteIdInput: Locator;
  readonly customDomainInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('#settings-modal');
    this.tokenInput = page.locator('#netlify-token');
    this.siteIdInput = page.locator('#netlify-siteId');
    this.customDomainInput = page.locator('#netlify-customDomain');
    this.saveButton = page.locator('#settings-save');
    this.cancelButton = page.locator('#settings-cancel');
    this.closeButton = page.locator('#settings-close');
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
    await this.page.waitForFunction(() => {
      const modal = document.getElementById('settings-modal');
      return modal?.classList.contains('active');
    });
  }

  /**
   * Waits for the modal to close
   */
  async waitForClose() {
    await this.page.waitForFunction(() => {
      const modal = document.getElementById('settings-modal');
      return !modal?.classList.contains('active');
    });
  }

  /**
   * Opens the settings modal via the toolbar button
   */
  async open() {
    await this.page.locator('#btn-settings').click();
    await this.waitForOpen();
  }

  /**
   * Gets the current token value (will be masked)
   */
  async getToken(): Promise<string> {
    return this.tokenInput.inputValue();
  }

  /**
   * Gets the current site ID value
   */
  async getSiteId(): Promise<string> {
    return this.siteIdInput.inputValue();
  }

  /**
   * Gets the current custom domain value
   */
  async getCustomDomain(): Promise<string> {
    return this.customDomainInput.inputValue();
  }

  /**
   * Sets the Netlify token
   * @param token - Netlify personal access token
   */
  async setToken(token: string) {
    await this.tokenInput.fill(token);
  }

  /**
   * Sets the site ID
   * @param siteId - Netlify site ID
   */
  async setSiteId(siteId: string) {
    await this.siteIdInput.fill(siteId);
  }

  /**
   * Sets the custom domain
   * @param domain - Custom subdomain
   */
  async setCustomDomain(domain: string) {
    await this.customDomainInput.fill(domain);
  }

  /**
   * Fills all Netlify settings at once
   */
  async fillNetlifySettings(token: string, siteId?: string, customDomain?: string) {
    await this.setToken(token);
    if (siteId) await this.setSiteId(siteId);
    if (customDomain) await this.setCustomDomain(customDomain);
  }

  /**
   * Clicks save button and waits for modal to close
   */
  async save() {
    await this.saveButton.click();
    await this.waitForClose();
  }

  /**
   * Clicks cancel button and waits for modal to close
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
}

