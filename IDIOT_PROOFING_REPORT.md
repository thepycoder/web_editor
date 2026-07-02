# ProjectWhy Web Editor Idiot-Proofing Report

Date: 2026-07-02

Scope: client-style QA pass on the current web editor using the running local desktop-server flow at `http://127.0.0.1:4070/editor.html?debug` and the current staging website. I deliberately did not click the live publish, website-download, or stop-server actions.

## Quick Summary

The editor is already simple, but it currently trusts the client to understand the consequences of every click. The biggest idiot-proofing gaps are one-click live actions, no unsaved-change protection, duplicated content that can drift out of sync, and editable text/links/images that can easily become visually correct but functionally wrong.

The highest-risk client mistakes are:

- Clicking `Laptop -> website` and publishing unfinished changes without any final confirmation.
- Clicking `Website -> laptop` or opening the app without `?debug` and overwriting the local project from the live host.
- Editing visible phone/address/navigation text while the real phone link, map link, mobile menu, or duplicate copy stays unchanged.
- Closing or refreshing the tab after editing, assuming changes were saved.
- Creating broken links, hidden sections, too many duplicate cards, or layout-breaking text and then publishing.

## High-Risk Findings

### 1. Publish Is One Click With No Final Confirmation

Current behavior:

- With deployment settings present, `Laptop -> website` is enabled immediately.
- Clicking it starts a real Cloudflare/Netlify publication path.
- There is no final "you are about to update the public website" confirmation.
- There is no summary of changed text, hidden sections, replaced images, or broken-looking links before publication.

Client mistake:

- A client clicks the wrong arrow, double-clicks out of habit, or tries the button "to see what it does" and publishes draft content.
- A client edits one small thing, accidentally deletes/hides another section, and publishes without noticing.

Idiot-proofing ideas:

- Add a publish confirmation modal with a plain-language warning: "This changes the live website."
- Show a short preflight summary: changed fields, hidden sections, replaced images, suspicious links, and duplicated/deleted sections.
- Require a second deliberate action, such as typing `PUBLICEREN` or holding the publish button for one second.
- Keep the publish button disabled while a publish is already in progress.

### 2. Website Download Can Overwrite Local Work

Current behavior:

- `Website -> laptop` is enabled when host credentials are configured.
- On normal startup, the editor automatically downloads from the host when configured, unless the URL includes `?debug`.
- The download path writes `index.html` and assets to the local project.
- Stale local assets can be deleted during sync.

Client mistake:

- The arrows are easy to confuse. A client who means "put my laptop changes online" can click `Website -> laptop` and overwrite the local copy with the hosted version.
- If someone made local edits outside the editor, starting the app can pull the hosted version over them.
- A client may not understand that download is destructive in the local folder.

Idiot-proofing ideas:

- Add a confirmation before every manual `Website -> laptop` action.
- Before overwriting, make a timestamped local backup of `index.html` and `assets`.
- On startup, say exactly what is happening and allow "Skip download this time."
- Rename the buttons to more explicit labels, for example `Haal online website binnen` and `Publiceer naar website`.
- Warn when local files are newer than the last downloaded/published copy.

### 3. Unsaved Browser Edits Are Easy To Lose

Current behavior:

- Editing text changes the preview in memory.
- There is no normal "save draft" button.
- `Ctrl+S` is blocked, but nothing tells the client what to do instead.
- There is no `beforeunload` warning when the user closes or refreshes the tab.
- In the browser probe, `beforeUnloadHandler` was `false`.

Client mistake:

- A client edits a page for 20 minutes, closes the browser, and assumes the desktop app saved it.
- A client refreshes to "fix" a visual issue and loses all preview-only edits.
- A client presses `Ctrl+S`, sees no browser save dialog, and assumes the editor saved.

Idiot-proofing ideas:

- Track a dirty state after any edit and show "Niet opgeslagen / Nog niet gepubliceerd."
- Add a persistent draft save, even if it only writes locally.
- Add a close/refresh warning while there are unpublished edits.
- When `Ctrl+S` is pressed, show a toast or save draft instead of silently doing nothing.

### 4. Visible Text Can Drift From Real Links

Current staging-site examples:

- Some visible phone numbers are editable text inside an anchor, but the actual `tel:` link is separate.
- The emergency text `Bel 1733` is editable, but the `href` can remain `tel:1733`.
- The address text is editable, but the Google Maps link and map image can still point to the old address.
- Desktop navigation and mobile navigation are separate repeatable lists.
- Opening hours and appointment links appear in multiple places.

Client mistake:

- A client changes the visible phone number but the button still calls the old number.
- A client changes the address text but the map still opens the old location.
- A client renames a desktop menu item but the mobile menu still says the old thing.
- A client changes "Openingsuren secretariaat" in one place and misses the other copies.

Idiot-proofing ideas:

- For phone, email, appointment, and map fields, use guided fields that update visible text and the underlying link together.
- Add a "same content appears elsewhere" warning.
- Add a publish preflight that flags mismatched visible phone numbers vs `tel:` links.
- Add a mobile/desktop nav sync check.

### 5. Link Editing Accepts Broken Values

Current behavior:

- Link text can be saved empty.
- URL values are not trimmed or validated.
- A safe browser probe saved an editable link as an empty `<a>` with `href="www.example.com with spaces"`.
- The formatting toolbar link prompt also accepts arbitrary values.

Client mistake:

- A client pastes `www.example.com` instead of `https://www.example.com`.
- A client accidentally includes spaces before/after a URL.
- A client deletes the link text and creates an invisible link.
- A client changes appointment/phone links into plain text that looks right but does not work.

Idiot-proofing ideas:

- Trim link inputs.
- Block empty link text unless the user confirms.
- Validate allowed URL types: `https://`, `http://`, `mailto:`, `tel:`, `#section`.
- Auto-fix common mistakes like `www.example.com` to `https://www.example.com`.
- Add quick link presets for phone, email, appointment, internal section, and external website.

### 6. Image Replacement Can Be Incomplete Or Misleading

Current behavior:

- The hero image is inside a `<picture>` with separate mobile/tablet `<source>` images.
- The image replacement code updates the clicked `<img>`, but not sibling `<source>` elements.
- Result: replacing the hero image can change desktop while mobile/tablet still show the old image.
- Alt text is not updated when replacing an image.
- Replacing one logo image does not automatically replace every logo instance.

Client mistake:

- A client replaces the hero photo, checks desktop, publishes, and later sees the old image on mobile.
- A client replaces a map, portrait, or logo but leaves old alt text behind.
- A client expects "change logo" to update both header and footer, but only one instance changes.

Idiot-proofing ideas:

- When replacing an image inside `<picture>`, update or remove the related `<source>` entries too.
- Show a mobile/tablet/desktop image consistency warning before publish.
- Ask for or auto-generate alt text after image replacement.
- For known repeated images such as logos, offer "replace all matching images."

### 7. Image Uploads Are Too Trusting

Current behavior:

- The file picker accepts `image/*`.
- The desktop-server path converts selected images into WebP variants.
- There is no clear precheck for huge files, unsupported formats, tiny images, transparent images, animated GIFs, or wrong aspect ratios.
- Very small source images can be upscaled to 320/576/800 widths.

Client mistake:

- A client uploads a 30 MB phone photo and the editor feels frozen.
- A client uploads a tiny logo/photo and it becomes blurry.
- A client uploads HEIC/SVG/GIF or another browser-problem format and only sees a generic failure.
- A client uploads a portrait where a wide hero image is expected.

Idiot-proofing ideas:

- Validate file type, dimensions, and size before conversion.
- Show a friendly error for unsupported formats.
- Warn before upscaling small images.
- Add per-image recommended aspect ratio and preview crop.
- Show progress while generating variants.

### 8. Duplicate/Delete Controls Are Easy To Abuse

Current behavior:

- Repeatable areas include navigation, mobile navigation, news cards, house-rule lists, and team cards.
- Duplicate and delete actions happen immediately.
- There is no undo, max count, or confirmation.
- In a safe browser probe, 12 duplicate clicks changed team cards from 6 to 18 and editable fields from 60 to 96.

Client mistake:

- A client keeps clicking duplicate because they do not notice the new card appeared below.
- A client duplicates the desktop menu but not the mobile menu.
- A client deletes the wrong doctor/news/list item and has no obvious way back.
- A client creates so many items that the page becomes slow or visually messy.

Idiot-proofing ideas:

- Add undo for duplicate/delete.
- Add reasonable max counts for menus, cards, and list items.
- After duplicate, scroll/focus the new item and highlight it.
- Ask for confirmation before deleting cards with edited content.
- Add a preflight warning for unusually many repeated items.

### 9. Hidden Sections Can Be Published Accidentally

Current behavior:

- The news section is toggleable.
- Hidden sections remain visible in the editor with a small toolbar state.
- A safe browser probe confirmed the hidden news section would save as `style="display: none;"`.

Client mistake:

- A client clicks "hide" while exploring and later publishes with the news section missing.
- A client forgets a section is hidden because it is still visible while editing.

Idiot-proofing ideas:

- Show a persistent "Verborgen op website" badge on hidden sections.
- Add a global list of hidden sections in the toolbar/status bar.
- Warn before publish when anything is hidden.
- Make hide/show require a clearer confirmation.

### 10. Long Or Strange Text Can Break Layout

Current behavior:

- Editable fields accept very long text, many line breaks, and long unbroken strings.
- In a safe browser probe, a long unbroken hero title had `scrollWidth` 1290 against `clientWidth` 263.
- The hero title CSS intentionally avoids normal word breaking.

Client mistake:

- A client pastes a long announcement title, URL, phone number, or all-caps heading.
- A client adds multiple line breaks inside a button or heading.
- The desktop view looks acceptable but phone view overflows or becomes unreadable.

Idiot-proofing ideas:

- Add per-field soft limits and warnings.
- Flag long unbroken words.
- Show mobile overflow warnings before publish.
- Add a "check phone view" reminder when important fields change.

### 11. Stop Local Server Is One Click

Current behavior:

- In desktop-server mode, `Lokale server stoppen` is visible in the status bar.
- Clicking it posts to `/api/shutdown`.
- There is no confirmation.

Client mistake:

- A client clicks it thinking it closes a dialog or just stops loading.
- The editor tab stays open but becomes unusable because the local server stopped.

Idiot-proofing ideas:

- Add a confirmation: "This closes the local editor server."
- Move it behind a settings/help menu.
- Rename it to `Editor afsluiten` if that is the intended mental model.

## Medium-Risk Findings

### 12. Settings Can Be Saved In A Broken State

Current behavior:

- Provider settings are saved without validation.
- Cloudflare project name is trimmed, but token/account fields are not.
- Netlify token/site ID are not trimmed.
- Provider status means "fields are present", not "credentials work."
- Closing the settings modal by accident discards typed changes silently.

Client mistake:

- A client pastes credentials with a leading/trailing space.
- A client switches provider to Netlify, saves blank credentials, and publish/download disappear.
- A client types settings, clicks outside the modal, and loses them.
- A client sees "configured" and assumes the token was tested.

Idiot-proofing ideas:

- Trim all credential fields.
- Validate required fields before saving.
- Add "Test connection" for Cloudflare/Netlify.
- Warn before closing settings with unsaved form changes.
- Explain provider switching in plain language.

### 13. Error Feedback Disappears Too Quickly

Current behavior:

- Most failures are short-lived toasts.
- Complex failures like deploy/download errors can be long and technical.
- There is no persistent "last error" panel or copyable support details.

Client mistake:

- A client misses the toast and thinks nothing happened.
- A client reports "it did not work" without the useful error text.
- A client keeps clicking the same button because the state did not visibly change.

Idiot-proofing ideas:

- Keep serious errors visible until dismissed.
- Add a simple support/debug panel with last action, last error, and time.
- Translate common host/API errors into plain language.

### 14. Browser Or Network Problems Are Not Very Actionable

Current behavior:

- The status bar says Chrome or Edge is recommended.
- Download/publish failures mostly surface as generic fetch/API errors.
- Offline or blocked-network states are not detected up front.

Client mistake:

- A client opens the editor in an unsupported/default browser.
- A client tries to publish while offline or behind a network block.
- A client retries repeatedly without knowing the issue is connectivity.

Idiot-proofing ideas:

- Add an upfront compatibility check.
- Detect offline mode and disable publish/download with a clear message.
- Add a simple "Internet connection needed for publish/download" status.

### 15. The Current Website Has Several Duplicated Editable Concepts

Current staging-site concepts that can drift:

- Desktop navigation vs mobile navigation.
- Appointment links in header, mobile menu, hero, and contact.
- Phone number in header, mobile menu, hero, contact, and emergency areas.
- Opening hours in hero and contact.
- Logo in header and footer.
- Address text vs map link/image.

Client mistake:

- A client updates only the visible copy they remember.
- Mobile users, map users, or phone-click users get the old information.

Idiot-proofing ideas:

- Add content consistency checks before publish.
- Create grouped editing affordances for repeated concepts.
- Highlight other matching fields after one is edited.

## Lower-Risk Weirdness To Consider

- Empty editable fields are allowed. This is useful, but clients can create blank headings, blank buttons, or empty cards.
- The editor prevents anchor navigation inside the preview, which is good, but clients may not realize they are editing a link rather than testing it.
- `Escape` does not appear to close modals.
- The settings modal can be opened while edits are in progress; there is no global "you have unpublished edits" status.
- File/image operations have no visible queue. A client can continue clicking while image conversion or uploads are happening.
- The success modal says the website is online but does not include a direct "open website" link.

## Suggested First Fixes

If the goal is maximum idiot-proofing with minimal product complexity, I would start with these:

1. Add dirty-state tracking with close/refresh protection and visible "unpublished changes" status.
2. Add confirmation/preflight for `Laptop -> website` and `Website -> laptop`.
3. Add local backup before any host download overwrites files.
4. Validate and normalize link inputs.
5. Add consistency checks for visible phone/address/nav text vs real links and duplicate copies.
6. Fix image replacement for `<picture>` sources or warn that the image has mobile/tablet variants.
7. Add undo or confirmation for repeatable delete/duplicate actions.
8. Add hidden-section warnings before publish.

## Probe Notes

Harmless browser probe results:

- Deploy button was enabled.
- Website-download button was enabled.
- Stop-server button was visible.
- No unload warning handler was present.
- Current preview contained 60 editable text areas, 14 editable links, 10 editable images, 6 repeatable containers, and 1 toggleable section.
- Empty link text plus a malformed URL saved into preview HTML without validation.
- Hiding the news section saved as `style="display: none;"`.
- Repeated duplicate clicks quickly increased team cards and editable fields.
- A long unbroken hero title overflowed its element in phone preview.

