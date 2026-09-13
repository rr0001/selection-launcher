# Extension store listing

Reusable English (`en-US`) copy for the Chrome Web Store and Microsoft Edge Add-ons. Recheck character limits and required fields in each publisher dashboard before submission.

## Product name

Selection Launcher

## Short description

Search or copy selected text with a fast, configurable, keyboard-first action bubble.

## Full description

Selection Launcher turns highlighted text into an immediate action. Select text on almost any web page and use the compact action bubble to search with your preferred engine or copy the selection to your clipboard—without opening the browser's context menu.

The extension is designed for people who prefer keyboard navigation, want a faster research workflow, or find repeated mouse and context-menu use inconvenient. Press Ctrl+Shift+. on Windows, Linux, or ChromeOS—or Command+Shift+. on macOS—to open the actions for the current selection and focus the first button. The shortcut can be reassigned from the browser's extension shortcut settings.

Each configured search engine appears as its own action. Search engines can use custom URL templates and transform selected text before opening a result. Available transformations include trimming surrounding whitespace, preserving or removing spaces, replacing whitespace with a chosen character, and applying ordered regular-expression replacements.

Selection Launcher includes:

- A compact action bubble for selected text.
- Search and Copy actions that work with the keyboard or pointer.
- Configurable search engines and URL templates.
- Per-engine whitespace and regular-expression transformations.
- Arrow-key navigation between actions, plus Home, End, Enter, Space, and Escape support.
- An option to show the bubble automatically after text is selected.
- Browser-synchronized settings when extension sync is available.

Selection Launcher does not operate on browser-protected pages such as extension stores or internal `chrome://` and `edge://` pages.

## Simple usage instructions

1. Select text on a normal web page.
2. Choose a search engine or Copy from the action bubble.
3. For a keyboard-only workflow, press Ctrl+Shift+. (Command+Shift+. on macOS), move between actions with the arrow keys, and press Enter or Space.
4. Select the extension's toolbar icon to configure search engines, transformations, automatic display, and tab behavior.
5. Change the extension shortcut from the browser's extension shortcut settings whenever desired.

## Feature highlights

- Keyboard-first selected-text search
- One-step copy action
- Multiple custom search engines
- Configurable whitespace transformations
- Ordered regular-expression replacements
- Accessible toolbar-style keyboard navigation
- Synchronized extension settings

## Suggested category

Productivity

## Suggested search terms

- selected text search
- keyboard search
- quick copy
- context menu alternative
- custom search engines
- text selection tools
- productivity

## Permission explanations

### Read and change data on websites

Selection Launcher needs access to normal web pages to detect text that the user selects and to display the action bubble next to that selection. Selected text is processed only to perform the action the user chooses.

### Storage

Stores the user's enabled actions, search-engine URL templates, transformation rules, and display preferences. The browser may synchronize these settings through the user's signed-in browser profile when extension sync is enabled.

### Clipboard write

Writes the currently selected text to the clipboard only when the user activates the Copy action.

### Web navigation

Finds the frames in the active tab so the browser-managed keyboard shortcut can reach selected text inside an embedded frame.

## Data-handling summary

The extension does not retain selected page text. When the user activates a configured search action, the extension transforms the selection according to that engine's settings, places the result in the configured search URL, and opens that URL. The selected text is therefore sent to the search provider chosen by the user as part of the URL request. Copy sends the selection only to the local clipboard.

Extension preferences are stored with the browser extension storage API and may be synchronized by the browser. Selection Launcher does not operate an analytics service, advertising service, account system, or developer-controlled data server.

Keep this summary synchronized with the public privacy policy and the actual implementation.

## Reviewer test instructions

1. Load any ordinary web page containing selectable text. Browser-owned pages cannot run content scripts.
2. Select a word or sentence and confirm that the action bubble appears.
3. Activate Google and confirm a search tab opens for the selection.
4. Select text again, activate Copy, and confirm the clipboard contains the selection.
5. Select text and press Ctrl+Shift+. (Command+Shift+. on macOS). Confirm that the bubble opens and its first action receives keyboard focus.
6. Use the arrow keys to move between actions, Enter or Space to activate one, and Escape to dismiss the bubble.
7. Select the extension toolbar icon to open Settings. Add a search engine, change a whitespace transformation, save it, and confirm the new action and transformed URL work.

No sign-in, paid account, test credentials, or developer-operated service is required.

## Store assets

- Packaged icons: `src/assets/icons/`
- 300×300 store logo: `docs/store-assets/store-icon-300.png`
- 1280×800 screenshots: `docs/store-assets/screenshots/`
- 440×280 promotional tile: `docs/store-assets/promo-small-440x280.png`
- Master icon artwork: `docs/store-assets/icon-master.png`

Official asset guidance:

- [Chrome Web Store images](https://developer.chrome.com/docs/webstore/images)
- [Microsoft Edge Add-ons publishing](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
