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
    const launcher = commands.find(
      (command) => command.name === "open-selection-launcher"
    );
    if (launcher && !launcher.shortcut) {
      await chrome.storage.local.set({ shortcutMissing: true });
    }
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "open-selection-launcher" || !tab?.id) return;

  const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
  await Promise.allSettled(
    (frames || []).map((frame) =>
      chrome.tabs.sendMessage(
        tab.id,
        { type: "SHOW_SELECTION_LAUNCHER", focus: true },
        { frameId: frame.frameId }
      )
    )
  );
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

      const url = buildSearchUrl(String(message.text ?? ""), engine);
      if (engine.openInNewTab) {
        await chrome.tabs.create({ url });
      } else if (_sender.tab?.id) {
        await chrome.tabs.update(_sender.tab.id, { url });
      } else {
        await chrome.tabs.create({ url });
      }
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});
