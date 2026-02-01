/**
 * Test Fixtures for ProjectWhy CMS Tests
 * 
 * These HTML templates are designed to exercise all editor features:
 * - data-editable: Inline text editing with contenteditable
 * - data-editable-image: Image replacement via file picker
 * - data-editable-link: Link editing via modal
 * - data-toggleable: Show/hide elements with visual feedback
 * - data-repeatable: Duplicate/delete section functionality
 * 
 * Each fixture element has a unique ID for stable test selection.
 */

/**
 * Full test template with all feature types
 * Use this for comprehensive testing scenarios
 */
export const TEST_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Template</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            padding: 20px;
            line-height: 1.6;
        }
        .card { 
            border: 1px solid #e0e0e0; 
            padding: 16px; 
            margin: 12px 0;
            border-radius: 8px;
            background: #fafafa;
        }
        .card h3 { margin-top: 0; }
        .banner {
            padding: 12px 16px;
            background: #e3f2fd;
            border-radius: 4px;
            margin: 12px 0;
        }
        .nav-links { display: flex; gap: 16px; margin: 16px 0; }
        .nav-links a { color: #1976d2; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <!-- TEST: data-editable (basic text editing) -->
    <h1 data-editable id="main-title">Editable Main Title</h1>
    <p data-editable id="main-description">This is an editable paragraph. You can click to edit this text directly.</p>
    
    <!-- TEST: Multiple editable elements in sequence -->
    <h2 data-editable id="section-title">Section Title</h2>
    <p data-editable id="section-text">Section body text that can be edited.</p>

    <!-- TEST: data-editable-image -->
    <img data-editable-image id="hero-image" 
         src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+A+EBwVlGJioJMhwACwBBgAp8x7/YVuBOgAAAABJRU5ErkJggg==" 
         alt="Placeholder Image" 
         width="200"
         height="200">
    
    <img data-editable-image id="secondary-image"
         src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mN8+f8/AwMDAz0xnIAaAAB3pAfJXj9xnAAAAABJRU5ErkJggg=="
         alt="Secondary Image"
         width="100"
         height="100">

    <!-- TEST: data-editable-link -->
    <nav class="nav-links">
        <a data-editable-link id="nav-link-home" href="/">Home</a>
        <a data-editable-link id="nav-link-about" href="/about">About</a>
        <a data-editable-link id="nav-link-contact" href="https://example.com/contact">Contact</a>
    </nav>
    
    <p>
        Check out our 
        <a data-editable-link id="inline-link" href="https://example.com">amazing features</a>
        today!
    </p>

    <!-- TEST: data-toggleable (visible by default) -->
    <div data-toggleable id="banner-visible" class="banner">
        <strong>Announcement:</strong> 
        <span data-editable id="banner-text">This banner is visible by default and can be toggled.</span>
    </div>

    <!-- TEST: data-toggleable (hidden by default) -->
    <div data-toggleable id="banner-hidden" class="banner" style="display: none;">
        <strong>Special Offer:</strong>
        <span data-editable>This banner is hidden by default. Toggle to show it.</span>
    </div>

    <!-- TEST: data-repeatable (section container) -->
    <h2>Features</h2>
    <div data-repeatable id="cards-container">
        <div class="card" id="card-1">
            <h3 data-editable id="card-1-title">Feature One</h3>
            <p data-editable id="card-1-desc">Description of the first feature. This card can be duplicated or deleted.</p>
            <a data-editable-link id="card-1-link" href="#feature-1">Learn more</a>
        </div>
        <div class="card" id="card-2">
            <h3 data-editable id="card-2-title">Feature Two</h3>
            <p data-editable id="card-2-desc">Description of the second feature. Demonstrates nested editables in repeatable sections.</p>
            <a data-editable-link id="card-2-link" href="#feature-2">Learn more</a>
        </div>
        <div class="card" id="card-3">
            <h3 data-editable id="card-3-title">Feature Three</h3>
            <p data-editable id="card-3-desc">Description of the third feature.</p>
            <a data-editable-link id="card-3-link" href="#feature-3">Learn more</a>
        </div>
    </div>

    <!-- TEST: Another repeatable for testing minimum items -->
    <h2>Team</h2>
    <div data-repeatable id="team-container">
        <div class="card" id="team-member-1">
            <h3 data-editable>Team Member</h3>
            <p data-editable>Role description</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Minimal template for basic/isolated tests
 * Use this when testing single features without noise
 */
export const MINIMAL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Minimal Test</title>
</head>
<body>
    <h1 data-editable id="title">Minimal Title</h1>
    <p data-editable id="content">Minimal content.</p>
</body>
</html>`;

/**
 * Template with nested editables for complex scenarios
 * Tests that nested structures work correctly
 */
export const NESTED_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Nested Test</title>
    <style>
        .section { border: 1px solid #ccc; padding: 16px; margin: 8px 0; }
        .inner { background: #f5f5f5; padding: 12px; margin-top: 8px; }
    </style>
</head>
<body>
    <div data-repeatable id="outer-container">
        <section class="section" id="section-1">
            <h2 data-editable id="section-1-title">Section Title</h2>
            <div data-toggleable id="section-1-toggleable" class="inner">
                <p data-editable id="section-1-content">Toggleable content inside repeatable</p>
                <a data-editable-link id="section-1-link" href="#">Link in toggleable</a>
            </div>
            <img data-editable-image id="section-1-image"
                 src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                 alt="Nested image"
                 width="50">
        </section>
    </div>
</body>
</html>`;

/**
 * Template with only toggleable elements
 * For focused toggle functionality testing
 */
export const TOGGLEABLE_ONLY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Toggleable Test</title>
    <style>
        .box { padding: 20px; margin: 10px 0; background: #e8e8e8; }
    </style>
</head>
<body>
    <div data-toggleable id="box-visible-1" class="box">
        <p>Visible Box 1</p>
    </div>
    <div data-toggleable id="box-visible-2" class="box">
        <p>Visible Box 2</p>
    </div>
    <div data-toggleable id="box-hidden-1" class="box" style="display: none;">
        <p>Hidden Box 1</p>
    </div>
    <div data-toggleable id="box-hidden-2" class="box" style="display: none;">
        <p>Hidden Box 2</p>
    </div>
</body>
</html>`;

/**
 * Template with only links for focused link testing
 */
export const LINKS_ONLY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Links Test</title>
</head>
<body>
    <nav>
        <a data-editable-link id="link-1" href="https://example.com">Example Link</a>
        <a data-editable-link id="link-2" href="/relative-path">Relative Link</a>
        <a data-editable-link id="link-3" href="#">Hash Link</a>
        <a data-editable-link id="link-4" href="mailto:test@example.com">Email Link</a>
    </nav>
</body>
</html>`;

/**
 * Template with single repeatable item (tests deletion prevention)
 */
export const SINGLE_REPEATABLE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Single Repeatable Test</title>
    <style>.item { padding: 16px; border: 1px solid #ccc; }</style>
</head>
<body>
    <div data-repeatable id="single-container">
        <div class="item" id="only-item">
            <h3 data-editable>Only Item</h3>
            <p data-editable>This is the only item and should not be deletable.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Empty template (no editable elements)
 * Tests that editor handles non-editable content gracefully
 */
export const EMPTY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Empty Test</title>
</head>
<body>
    <h1>Static Title</h1>
    <p>This content has no editable regions.</p>
</body>
</html>`;

