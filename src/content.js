(function selectionLauncherContentScript() {
  "use strict";

  if (globalThis.__selectionLauncherLoaded) return;
  globalThis.__selectionLauncherLoaded = true;

  const { normalizeSettings } = SelectionLauncherShared;
  const HOST_ID = "selection-launcher-extension-root";
  const MAX_PREVIEW_LENGTH = 180;
  let settings = normalizeSettings();
  let host = null;
  let shadow = null;
  let panel = null;
  let selectedText = "";
  let autoShowTimer = null;
  let suppressUntil = 0;
  let useTopLayerPopover = typeof HTMLElement.prototype.showPopover === "function";

  const styles = `
    :host { all: initial; color-scheme: light dark; }
    .panel {
      position: fixed; inset: auto; z-index: 2147483647; display: flex; align-items: center;
      gap: 6px; max-width: min(560px, calc(100vw - 16px)); padding: 7px;
      margin: 0;
      border: 1px solid rgba(127,127,127,.35); border-radius: 12px;
      background: color-mix(in srgb, Canvas 94%, transparent);
      color: CanvasText; box-shadow: 0 8px 28px rgba(0,0,0,.22);
      font: 13px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif;
      backdrop-filter: blur(12px); opacity: 0; transform: translateY(3px) scale(.98);
      transition: opacity 90ms ease, transform 90ms ease;
    }
    .panel::backdrop { background: transparent; pointer-events: none; }
    .panel.visible { opacity: 1; transform: none; }
    .preview { max-width: 160px; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; padding: 0 4px; opacity: .72; }
    button { appearance: none; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
      border-radius: 8px; padding: 7px 10px; background: color-mix(in srgb, Canvas 88%, CanvasText 12%);
      color: CanvasText; font: 600 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer; white-space: nowrap; }
    button:hover { background: color-mix(in srgb, Canvas 78%, CanvasText 22%); }
    button:focus-visible { outline: 3px solid #4c8dff; outline-offset: 2px; }
    button.copy { background: #2367d1; border-color: #2367d1; color: white; }
    button.settings { padding-inline: 8px; font-size: 16px; }
    .notice { padding: 0 4px; font-weight: 600; }
    .status { position: absolute; clip: rect(0 0 0 0); width: 1px; height: 1px;
      overflow: hidden; white-space: nowrap; }
    @media (prefers-reduced-motion: reduce) { .panel { transition: none; } }
  `;

  function createUi() {
    if (host?.isConnected) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = styles;
    panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "toolbar");
    panel.setAttribute("aria-label", "Actions for selected text");
    if (useTopLayerPopover) panel.setAttribute("popover", "manual");
    panel.hidden = true;
    shadow.append(style, panel);
    (document.documentElement || document.body).append(host);
  }

  function interactiveContainer(node) {
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest('dialog[open], [aria-modal="true"], [role="dialog"]') || null;
  }

  function mountUi(container) {
    const target = container?.isConnected
      ? container
      : (document.documentElement || document.body);
    if (host.parentNode !== target) target.append(host);
  }

  function selectionDetails() {
    const active = document.activeElement;
    if (
      active &&
      (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
      typeof active.selectionStart === "number" &&
      active.selectionStart !== active.selectionEnd
    ) {
      const text = active.value.slice(active.selectionStart, active.selectionEnd);
      const rect = active.getBoundingClientRect();
      return { text, rect, container: interactiveContainer(active) };
    }

    const selection = window.getSelection();
    const text = selection?.toString() || "";
    if (!text || !selection.rangeCount) return { text: "", rect: null, container: null };
    const range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      rect = range.getClientRects()[0] || rect;
    }
    return { text, rect, container: interactiveContainer(range.commonAncestorContainer) };
  }

  function hide({ suppress = false } = {}) {
    if (!panel || panel.hidden) return;
    panel.classList.remove("visible");
    if (useTopLayerPopover && panel.matches(":popover-open")) {
      panel.hidePopover();
    }
    panel.hidden = true;
    selectedText = "";
    if (suppress) suppressUntil = Date.now() + 350;
  }

  function openPanel() {
    panel.hidden = false;
    if (!useTopLayerPopover) return;

    try {
      if (!panel.matches(":popover-open")) panel.showPopover();
    } catch (_error) {
      // Fall back to the fixed, maximum-z-index panel in older or unusual pages.
      useTopLayerPopover = false;
      panel.removeAttribute("popover");
    }
  }

  function placePanel(rect) {
    panel.style.left = "8px";
    panel.style.top = "8px";
    const own = panel.getBoundingClientRect();
    const gap = 10;
    const anchorLeft = rect?.left ?? window.innerWidth / 2;
    const anchorBottom = rect?.bottom ?? window.innerHeight / 2;
    const anchorTop = rect?.top ?? anchorBottom;
    const left = Math.min(
      window.innerWidth - own.width - 8,
      Math.max(8, anchorLeft + ((rect?.width || 0) - own.width) / 2)
    );
    let top = anchorBottom + gap;
    if (top + own.height > window.innerHeight - 8) top = anchorTop - own.height - gap;
    panel.style.left = `${Math.max(8, left)}px`;
    panel.style.top = `${Math.max(8, top)}px`;
  }

  function setStatus(message) {
    const status = panel.querySelector(".status");
    if (status) status.textContent = message;
  }

  function showDisconnected() {
    if (!panel) return;
    panel.replaceChildren();

    const notice = document.createElement("span");
    notice.className = "notice";
    notice.textContent = "Selection Launcher was updated. Refresh this page to continue.";

    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.textContent = "Refresh page";
    refresh.addEventListener("click", () => window.location.reload());

    const status = document.createElement("span");
    status.className = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "assertive");
    status.textContent = notice.textContent;

    panel.append(notice, refresh, status);
    refresh.focus();
  }

  async function sendExtensionMessage(message) {
    try {
      return {
        delivered: true,
        response: await chrome.runtime.sendMessage(message)
      };
    } catch (_error) {
      // Reloading or updating an unpacked extension invalidates scripts that are
      // already running in open pages. Keep that expected condition out of the
      // browser's extension error log and tell the user how to reconnect.
      showDisconnected();
      return { delivered: false };
    }
  }

  async function copySelection(button) {
    try {
      await navigator.clipboard.writeText(selectedText);
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = selectedText;
      textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    button.textContent = "Copied";
    setStatus("Selection copied to the clipboard");
    window.setTimeout(() => hide({ suppress: true }), 450);
  }

  function actionButtons() {
    return [...panel.querySelectorAll("button")];
  }

  function render() {
    panel.replaceChildren();

    const preview = document.createElement("span");
    preview.className = "preview";
    preview.title = selectedText;
    preview.textContent = selectedText.length > MAX_PREVIEW_LENGTH
      ? `${selectedText.slice(0, MAX_PREVIEW_LENGTH)}…`
      : selectedText;
    panel.append(preview);

    for (const engine of settings.engines.filter((item) => item.enabled)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = engine.name;
      button.setAttribute("aria-label", `Search ${engine.name} for selected text`);
      button.addEventListener("click", async () => {
        const result = await sendExtensionMessage({
          type: "RUN_SEARCH",
          engineId: engine.id,
          text: selectedText
        });
        if (!result.delivered) return;
        const response = result.response;
        if (!response?.ok) setStatus(response?.error || "Search could not be opened");
        else hide({ suppress: true });
      });
      panel.append(button);
    }

    if (settings.copyButton) {
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy";
      copy.textContent = "Copy";
      copy.addEventListener("click", () => copySelection(copy));
      panel.append(copy);
    }

    const configure = document.createElement("button");
    configure.type = "button";
    configure.className = "settings";
    configure.textContent = "⚙";
    configure.title = "Configure Selection Launcher";
    configure.setAttribute("aria-label", "Configure Selection Launcher");
    configure.addEventListener("click", async () => {
      await sendExtensionMessage({ type: "OPEN_OPTIONS" });
    });
    panel.append(configure);

    const status = document.createElement("span");
    status.className = "status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    panel.append(status);
  }

  function show({ focus = false } = {}) {
    if (!document.hasFocus()) return false;
    const details = selectionDetails();
    if (!details.text.trim()) {
      hide();
      return false;
    }

    createUi();
    mountUi(details.container);
    selectedText = details.text;
    render();
    openPanel();
    placePanel(details.rect);
    requestAnimationFrame(() => panel.classList.add("visible"));
    if (focus) requestAnimationFrame(() => actionButtons()[0]?.focus());
    return true;
  }

  function scheduleAutoShow() {
    clearTimeout(autoShowTimer);
    if (!settings.autoShow || Date.now() < suppressUntil) return;
    autoShowTimer = window.setTimeout(() => show(), 180);
  }

  document.addEventListener("selectionchange", scheduleAutoShow);
  document.addEventListener("pointerdown", (event) => {
    if (host && event.composedPath().includes(host)) return;
    hide();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (!panel || panel.hidden) return;
    const buttons = actionButtons();
    const index = buttons.indexOf(shadow.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      hide({ suppress: true });
    } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      buttons[(index + 1 + buttons.length) % buttons.length]?.focus();
    } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      buttons.at(-1)?.focus();
    }
  }, true);
  window.addEventListener("scroll", () => hide(), true);
  window.addEventListener("resize", () => hide());

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SHOW_SELECTION_LAUNCHER") {
      show({ focus: message.focus });
    }
  });

  chrome.storage.sync.get("settings").then(({ settings: stored }) => {
    settings = normalizeSettings(stored);
  }).catch(() => {
    // The extension may have been reloaded while this page was initializing.
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.settings) {
      settings = normalizeSettings(changes.settings.newValue);
      if (panel && !panel.hidden) show();
    }
  });
})();
