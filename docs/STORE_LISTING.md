# Extension store listing

Reusable English (`en-US`) copy for the Chrome Web Store and Microsoft Edge Add-ons. Recheck character limits and required fields in each publisher dashboard before submission.

## Product name

Selection Launcher

## Short description

Search or copy selected text with a fast, configurable, keyboard-first action bubble.

## Full description

Selection Launcher turns highlighted text into an immediate action. Select text on almost any web page and use the compact action bubble to search with your preferred engine or copy the selection to your clipboard—without opening the browser's context menu.

The extension is designed for people who prefer keyboard navigation, want a faster research workflow, or find repeated mouse and context-menu use inconvenient. Press Ctrl+Shift+. on Windows, Linux, or ChromeOS—or Command+Shift+. on macOS—to open the actions for the current selection and focus the first button. Press Alt+1 to search immediately with the first enabled engine without opening the bubble. Shortcuts can be reassigned from the browser's extension shortcut settings.

Each configured search engine appears as its own action. Search engines can use custom URL templates and transform selected text before opening a result. Available transformations include trimming surrounding whitespace, preserving or removing spaces, replacing whitespace with a chosen character, and applying ordered regular-expression replacements.

Selection Launcher includes:

- A compact action bubble for selected text.
- Search and Copy actions that work with the keyboard or pointer.
- Configurable search engines and URL templates.
- Per-engine whitespace and regular-expression transformations.
- Arrow-key navigation between actions, plus Home, End, Enter, Space, and Escape support.
- A direct keyboard shortcut for the first enabled search engine.
- An option to show the bubble automatically after text is selected.
- Automatic display waits until pointer or Shift-key selection is finished.
- Automatic suppression in editable fields until a shortcut is used.
- Browser-synchronized settings when extension sync is available.

Selection Launcher does not operate on browser-protected pages such as extension stores or internal `chrome://` and `edge://` pages.

## Simple usage instructions

1. Select text on a normal web page.
2. Choose a search engine or Copy from the action bubble.
3. For a keyboard-only workflow, press Ctrl+Shift+. (Command+Shift+. on macOS), move between actions with the arrow keys, and press Enter or Space. Alternatively, press Alt+1 to search with the first enabled engine immediately.
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

### Host permission (`<all_urls>`)

Selection Launcher uses `<all_urls>` to run its content script on ordinary web pages so it can detect text the user deliberately selects and display the action bubble next to that selection. Access across sites is necessary because selecting, copying, and searching text is the extension's single purpose and must work wherever the user chooses, including inside embedded frames. The extension does not collect browsing history, read page content beyond the active selection, use remote code, or transmit data to developer-controlled servers. Selected text remains local unless the user explicitly activates a configured search action, which opens the selected search provider with the transformed text in the URL.

### Storage

Stores the user's enabled actions, search-engine URL templates, transformation rules, and display preferences. The browser may synchronize these settings through the user's signed-in browser profile when extension sync is enabled.

### Clipboard write

Writes the currently selected text to the clipboard only when the user activates the Copy action.

### Web navigation

Finds the frames in the active tab so browser-managed keyboard shortcuts can reach selected text inside an embedded frame.

## Data-handling summary

The extension does not retain selected page text. When the user activates a configured search action, the extension transforms the selection according to that engine's settings, places the result in the configured search URL, and opens that URL. The selected text is therefore sent to the search provider chosen by the user as part of the URL request. Copy sends the selection only to the local clipboard.

Extension preferences are stored with the browser extension storage API and may be synchronized by the browser. Selection Launcher does not operate an analytics service, advertising service, account system, or developer-controlled data server.

Keep this summary synchronized with the public privacy policy and the actual implementation.

## Reviewer test instructions

1. On an ordinary webpage, select text and confirm the bubble appears.
2. Choose Google and confirm a search opens; test Copy similarly.
3. Select text in an input and confirm no automatic bubble appears. Press Ctrl+Shift+. (Command+Shift+. on macOS) and confirm it opens.
4. Select text and press Alt+1; confirm Google opens without the bubble.
5. Test arrow keys, Enter, Escape, Settings, and a custom engine.
No account is required. Browser-owned pages do not allow content scripts.

## Store assets

- Packaged icons: `src/assets/icons/`
- 128×128 Chrome Web Store icon: `docs/store-assets/store-icon-128.png`
- 300×300 store logo: `docs/store-assets/store-icon-300.png`
- 1280×800 screenshots: `docs/store-assets/screenshots/`
- 440×280 promotional tile: `docs/store-assets/promo-small-440x280.png`
- Master icon artwork: `docs/store-assets/icon-master.png`

Official asset guidance:

- [Chrome Web Store images](https://developer.chrome.com/docs/webstore/images)
- [Microsoft Edge Add-ons publishing](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
