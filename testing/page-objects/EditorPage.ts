import { Page, FrameLocator, Locator } from '@playwright/test';

/**
 * Page Object Model for the ProjectWhy CMS Editor
 * 
 * ARCHITECTURE:
 * - Main page contains toolbar, modals, and an iframe
 * - The iframe (#preview-frame) contains the editable HTML template
 * - Most editing happens inside the iframe
 * 
 * USAGE:
 * ```typescript
 * const editor = new EditorPage(page);
 * await editor.goto();
 * await editor.injectTestContent(TEST_TEMPLATE);
 * ```
 */
export class EditorPage {
  readonly page: Page;
  
  // Toolbar elements
  readonly btnOpen: Locator;
  readonly btnDownloadNetlify: Locator;
  readonly btnOpenEmpty: Locator;
  readonly btnSave: Locator;
  readonly btnSettings: Locator;
  readonly btnDeployNetlify: Locator;
  readonly fileName: Locator;
  readonly unsavedIndicator: Locator;
  
  // States
  readonly emptyState: Locator;
  readonly previewWrapper: Locator;
  
  // Preview iframe
  readonly previewFrame: FrameLocator;
  
  // Toast container
  readonly toastContainer: Locator;
  
  // Status bar
  readonly netlifyStatus: Locator;
  readonly netlifyStatusText: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Toolbar
    this.btnOpen = page.locator('#btn-open');
    this.btnDownloadNetlify = page.locator('#btn-download-netlify');
    this.btnOpenEmpty = page.locator('#btn-open-empty');
    this.btnSave = page.locator('#btn-save');
    this.btnSettings = page.locator('#btn-settings');
    this.btnDeployNetlify = page.locator('#btn-deploy-netlify');
    this.fileName = page.locator('#file-name');
    this.unsavedIndicator = page.locator('#unsaved-indicator');
    
    // States
    this.emptyState = page.locator('#empty-state');
    this.previewWrapper = page.locator('#preview-wrapper');
    
    // Preview iframe
    this.previewFrame = page.frameLocator('#preview-frame');
    
    // Toast
    this.toastContainer = page.locator('#toast-container');
    
    // Status bar
    this.netlifyStatus = page.locator('#netlify-status');
    this.netlifyStatusText = page.locator('#netlify-status-text');
  }

  /**
   * Navigate to the editor page
   */
  async goto() {
    await this.page.goto('/editor.html');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Injects test content directly into the preview iframe.
   * Bypasses File System Access API for testing.
   * 
   * @param htmlContent - The HTML content to inject
   */
  async injectTestContent(htmlContent: string) {
    await this.page.evaluate((content) => {
      // Access the internal state object
      const win = window as any;
      
      // Initialize mock state
      win.state = win.state || {};
      win.state.fileHandle = { name: 'test-index.html' };
      win.state.dirHandle = { name: 'test-project' };
      win.state.assetsHandle = {};
      win.state.originalContent = content;
      win.state.hasUnsavedChanges = false;
      win.state.assetRefs = new Map();
      win.state.pendingDeletes = new Set();
      win.state.netlifyConfig = win.state.netlifyConfig || {};

      // Mock config file storage in memory for testing
      win._mockConfigStorage = win._mockConfigStorage || {};
      win.loadProjectConfig = async () => win._mockConfigStorage;
      win.saveProjectConfig = async (dirHandle: any, config: any) => {
        win._mockConfigStorage = config;
      };
      
      // Update UI elements
      const fileNameEl = document.getElementById('file-name')!;
      fileNameEl.textContent = 'Test Project';
      fileNameEl.style.display = 'block';

      document.getElementById('empty-state')!.style.display = 'none';
      document.getElementById('preview-wrapper')!.style.display = 'block';
      document.getElementById('btn-save')!.removeAttribute('disabled');
      document.getElementById('unsaved-indicator')!.style.display = 'none';
      (document.getElementById('project-folder') as HTMLInputElement).value = 'Test Project';
      
      // Get the iframe and write content
      const frame = document.getElementById('preview-frame') as HTMLIFrameElement;
      const doc = frame.contentDocument!;
      doc.open();
      doc.write(content);
      doc.close();
      
      // Call internal setup functions (they're in global scope)
      if (typeof win.injectEditorStyles === 'function') {
        win.injectEditorStyles(doc);
      }
      if (typeof win.setupEditableElements === 'function') {
        win.setupEditableElements(doc);
      }
      if (typeof win.setupToggleableElements === 'function') {
        win.setupToggleableElements(doc);
      }
      if (typeof win.setupRepeatableSections === 'function') {
        win.setupRepeatableSections(doc);
      }
      if (typeof win.buildElementRefs === 'function') {
        win.buildElementRefs(doc);
      }
    }, htmlContent);
    
    // Wait for iframe to be ready
    await this.page.waitForTimeout(100);
  }

  /**
   * Gets all visible toast messages
   */
  async getToasts(): Promise<string[]> {
    return this.toastContainer.locator('.toast').allTextContents();
  }

  /**
   * Waits for a toast with specific text to appear
   * @param text - Text to search for in toast
   * @param timeout - Maximum time to wait (default 5000ms)
   */
  async waitForToast(text: string, timeout = 5000) {
    await this.toastContainer.locator('.toast', { hasText: text }).waitFor({ timeout });
  }

  /**
   * Checks if unsaved changes indicator is visible
   */
  async hasUnsavedChanges(): Promise<boolean> {
    return this.unsavedIndicator.isVisible();
  }

  /**
   * Checks if the save button is enabled
   */
  async isSaveEnabled(): Promise<boolean> {
    return !(await this.btnSave.isDisabled());
  }

  /**
   * Checks if deploy button is enabled
   */
  async isDeployEnabled(): Promise<boolean> {
    return !(await this.btnDeployNetlify.isDisabled());
  }

  /**
   * Checks if download button is enabled
   */
  async isDownloadEnabled(): Promise<boolean> {
    return !(await this.btnDownloadNetlify.isDisabled());
  }

  /**
   * Gets the current file/project name displayed
   */
  async getFileName(): Promise<string> {
    return this.fileName.textContent() ?? '';
  }

  /**
   * Triggers keyboard shortcut Ctrl+S
   */
  async pressCtrlS() {
    await this.page.keyboard.press('Control+s');
  }

  /**
   * Gets the edited HTML content from the iframe
   */
  async getEditedContent(): Promise<string> {
    return this.page.evaluate(() => {
      const win = window as any;
      if (typeof win.getEditedContent === 'function') {
        return win.getEditedContent();
      }
      return '';
    });
  }
}

