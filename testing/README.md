# ProjectWhy CMS Test Suite

Playwright-based testing harness for the ProjectWhy CMS single-file HTML editor.

## Quick Start

```bash
cd testing
npm install
npx playwright install chromium
npm test
```

## Architecture Overview

```
testing/
├── playwright.config.ts       # Test runner configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
│
├── page-objects/              # Page Object Model classes
│   ├── EditorPage.ts          # Main editor page interactions
│   ├── PreviewFrame.ts        # iframe content interactions
│   ├── LinkModal.ts           # Link edit modal
│   ├── SettingsModal.ts       # Deploy settings modal
│   └── index.ts               # Barrel export
│
├── helpers/
│   ├── test-fixtures.ts       # HTML templates for testing
│   ├── assertions.ts          # Custom assertions
│   └── index.ts               # Barrel export
│
└── tests/
    ├── text-editing.spec.ts   # data-editable tests
    ├── link-editing.spec.ts   # data-editable-link tests
    ├── image-editing.spec.ts  # data-editable-image tests
    ├── toggleable.spec.ts     # data-toggleable tests
    ├── repeatable.spec.ts     # data-repeatable tests
    ├── netlify-config.spec.ts # Settings & deployment config
    ├── toast-notifications.spec.ts
    ├── keyboard-shortcuts.spec.ts
    └── editor-state.spec.ts   # Overall state management
```

## Editor Features Tested

| Feature | Data Attribute | Test File | Description |
|---------|---------------|-----------|-------------|
| Text editing | `data-editable` | `text-editing.spec.ts` | Inline contenteditable text |
| Image replacement | `data-editable-image` | `image-editing.spec.ts` | Click-to-replace images |
| Link editing | `data-editable-link` | `link-editing.spec.ts` | Modal-based link editor |
| Element visibility | `data-toggleable` | `toggleable.spec.ts` | Show/hide elements |
| Section duplication | `data-repeatable` | `repeatable.spec.ts` | Clone/delete sections |
| Netlify config | localStorage | `netlify-config.spec.ts` | API token & site settings |
| Toast notifications | UI feedback | `toast-notifications.spec.ts` | Success/error messages |
| Keyboard shortcuts | Ctrl+S, Enter | `keyboard-shortcuts.spec.ts` | Keyboard interactions |
| Editor state | Overall | `editor-state.spec.ts` | Load, deploy controls, content extraction |

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/toggleable.spec.ts

# Run tests matching a pattern
npx playwright test -g "duplicate"

# Run in headed mode (see the browser)
npm run test:headed

# Debug mode with Playwright inspector
npm run test:debug

# Interactive UI mode
npm run test:ui

# Generate and view HTML report
npm test
npm run report
```

## Test Output

Tests generate multiple output formats:

1. **Console output** - Real-time progress (`list` reporter)
2. **HTML report** - Visual test results (`playwright-report/`)
3. **JSON output** - Machine-parseable results (`test-results.json`)

The JSON output is optimized for LLM consumption:

```json
{
  "suites": [...],
  "stats": {
    "total": 45,
    "passed": 44,
    "failed": 1,
    "skipped": 0
  }
}
```

## Key Testing Patterns

### 1. Iframe Testing

The editor renders templates in an iframe (`#preview-frame`). Use `frameLocator`:

```typescript
const preview = new PreviewFrame(editor.previewFrame);
const element = preview.getEditableText('#my-element');
```

### 2. Content Injection

Since the File System Access API requires user interaction, tests inject content directly:

```typescript
await editor.goto();
await editor.injectTestContent(TEST_TEMPLATE);
```

### 3. Page Object Model

All selectors are encapsulated in page objects for maintainability:

```typescript
// Good - uses page object
await preview.getEditableText('#title').fill('New');

// Avoid - raw CSS selectors scattered in tests
await page.locator('#main-title').click();
```

### 4. Waiting for UI Feedback

Use toast notifications to verify actions completed:

```typescript
await preview.getDuplicateButton(card).click();
await editor.waitForToast('Section duplicated');
```

## Adding New Tests

### Template for New Test File

```typescript
import { test, expect } from '@playwright/test';
import { EditorPage, PreviewFrame } from '../page-objects';
import { TEST_TEMPLATE } from '../helpers';

test.describe('Feature Name', () => {
  let editor: EditorPage;
  let preview: PreviewFrame;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    preview = new PreviewFrame(editor.previewFrame);
    await editor.goto();
    await editor.injectTestContent(TEST_TEMPLATE);
  });

  test('should do X when Y happens', async () => {
    // Arrange
    const element = preview.getEditableText('#target');
    
    // Act
    await element.click();
    await element.fill('new value');
    
    // Assert
    await expect(element).toHaveText('new value');
  });
});
```

### Creating New Fixtures

Add templates to `helpers/test-fixtures.ts`:

```typescript
export const MY_FIXTURE = `<!DOCTYPE html>
<html>
<head><title>My Test</title></head>
<body>
  <div data-editable id="test-element">Content</div>
</body>
</html>`;
```

### Adding Custom Assertions

Add to `helpers/assertions.ts`:

```typescript
export async function expectMyCondition(locator: Locator) {
  const value = await locator.evaluate(el => /* check something */);
  expect(value).toBe(/* expected */);
}
```

## LLM Integration Notes

When using these tests with an LLM:

1. **Test names are descriptive** - They explain the behavior being tested
2. **JSON output** - `test-results.json` can be parsed programmatically
3. **Fixtures have stable IDs** - Elements use predictable `id` attributes
4. **Comments explain intent** - Each test file has JSDoc explaining purpose
5. **Page objects abstract complexity** - Focus on what, not how

### Example LLM Prompt

```
Run the test suite and tell me which tests failed:
cd testing && npm test -- --reporter=json

Then fix any failures by examining the test code and editor implementation.
```

## Troubleshooting

### Tests fail to start server

The tests auto-start the Go host on port 3000. If it's already in use:

```bash
# Kill existing process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run the host manually from the repo root, then in another terminal:
cd testing && npx playwright test
# Example: PROJECTWHY_DIR=testing/fixtures/empty-cms-project go run ./cmd/projectwhy -listen 127.0.0.1:3000 -no-browser
```

### Iframe content not loading

The `injectTestContent` method writes directly to the iframe. If tests fail with "element not found":

1. Add `await page.waitForTimeout(100)` after injection
2. Check that the template HTML is valid
3. Verify selector matches element ID in fixture

### Flaky hover tests

Toolbar visibility depends on hover state. If hover tests are flaky:

```typescript
// More reliable hover
await element.hover({ force: true });
await page.waitForTimeout(50);
```

## Contributing

1. Follow existing test patterns
2. Use Page Object Model
3. Add JSDoc comments
4. Keep tests atomic (one assertion focus per test)
5. Use descriptive test names

