importScripts("shared.js");

const { DEFAULT_SETTINGS, buildSearchUrl, normalizeSettings } =
  SelectionLauncherShared;

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const stored = await chrome.storage.sync.get("settings");
  if (!stored.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }

  if (reason === "install") {
    const commands = await chrome.commands.getAll();
    const expected = new Set(["open-selection-launcher", "search-first-engine"]);
    const shortcutMissing = commands.some(
      (command) => expected.has(command.name) && !command.shortcut
    );
    await chrome.storage.local.set({ shortcutMissing });
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

async function sendToFrames(tabId, message) {
  let frames;
  try {
    frames = await chrome.webNavigation.getAllFrames({ tabId });
  } catch (_error) {
    return [];
  }
  return Promise.allSettled(
    (frames || []).map((frame) =>
      chrome.tabs.sendMessage(
        tabId,
        message,
        { frameId: frame.frameId }
      )
    )
  );
}

async function openSearch(text, engine, tabId) {
  const url = buildSearchUrl(text, engine);
  if (engine.openInNewTab) {
    await chrome.tabs.create({ url });
  } else if (tabId) {
    await chrome.tabs.update(tabId, { url });
  } else {
    await chrome.tabs.create({ url });
  }
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;

  if (command === "open-selection-launcher") {
    await sendToFrames(tab.id, { type: "SHOW_SELECTION_LAUNCHER", focus: true });
    return;
  }

  if (command !== "search-first-engine") return;
  const responses = await sendToFrames(tab.id, { type: "GET_SELECTED_TEXT" });
  const selectedText = responses.find(
    (result) => result.status === "fulfilled" && result.value?.text?.trim()
  )?.value.text;
  if (!selectedText) return;

  const { settings: stored } = await chrome.storage.sync.get("settings");
  const engine = normalizeSettings(stored).engines.find((candidate) => candidate.enabled);
  if (!engine) return;
  try {
    await openSearch(selectedText, engine, tab.id);
  } catch (_error) {
    // Invalid synchronized settings should not create an uncaught command error.
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (message?.type === "OPEN_SHORTCUTS") {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    return;
  }

  if (message?.type !== "RUN_SEARCH") return;

  (async () => {
    try {
      const { settings: stored } = await chrome.storage.sync.get("settings");
      const settings = normalizeSettings(stored);
      const engine = settings.engines.find(
        (candidate) => candidate.id === message.engineId && candidate.enabled
      );
      if (!engine) throw new Error("That search engine is not available.");

      await openSearch(String(message.text ?? ""), engine, _sender.tab?.id);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});
