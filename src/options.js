(function selectionLauncherOptions() {
  "use strict";

  const {
    buildSearchUrl,
    makeId,
    normalizeEngine,
    normalizeSettings
  } = SelectionLauncherShared;
  const list = document.querySelector("#engine-list");
  const engineTemplate = document.querySelector("#engine-template");
  const regexTemplate = document.querySelector("#regex-template");
  const saveState = document.querySelector("#save-state");
  const sample = "  Example selection with spaces  ";
  let settings = normalizeSettings();
  let saveTimer = null;
  let notificationTimer = null;

  function newEngine() {
    return normalizeEngine({
      id: makeId(),
      name: "New search",
      url: "https://www.google.com/search?q={query}",
      enabled: true,
      openInNewTab: true,
      trim: true,
      whitespaceMode: "preserve",
      whitespaceReplacement: "-",
      regexRules: []
    });
  }

  function validateRegex(rule) {
    if (!rule.pattern) return "";
    try {
      new RegExp(rule.pattern, rule.flags);
      return "";
    } catch (error) {
      return error.message;
    }
  }

  function validateEngine(engine) {
    if (!engine.name.trim()) return "Enter a name.";
    if (!engine.url.includes("{query}")) return "The search URL must include {query}.";
    try {
      buildSearchUrl(sample, engine);
    } catch (error) {
      return error.message;
    }
    for (const rule of engine.regexRules) {
      const error = validateRegex(rule);
      if (error) return `Invalid regular expression: ${error}`;
    }
    return "";
  }

  function readRegex(row) {
    return {
      enabled: row.querySelector('[data-regex="enabled"]').checked,
      pattern: row.querySelector('[data-regex="pattern"]').value,
      replacement: row.querySelector('[data-regex="replacement"]').value,
      flags: row.querySelector('[data-regex="flags"]').value
    };
  }

  function readEngine(card) {
    const value = (name) => card.querySelector(`[data-field="${name}"]`);
    return normalizeEngine({
      id: card.dataset.id,
      name: value("name").value,
      url: value("url").value,
      enabled: value("enabled").checked,
      openInNewTab: value("openInNewTab").checked,
      trim: value("trim").checked,
      whitespaceMode: value("whitespaceMode").value,
      whitespaceReplacement: value("whitespaceReplacement").value,
      regexRules: [...card.querySelectorAll(".regex-row")].map(readRegex)
    });
  }

  function readSettings() {
    return normalizeSettings({
      autoShow: document.querySelector("#auto-show").checked,
      copyButton: document.querySelector("#copy-button").checked,
      engines: [...list.querySelectorAll(".engine")].map(readEngine)
    });
  }

  async function save() {
    settings = readSettings();
    const errors = settings.engines.map(validateEngine).filter(Boolean);
    if (errors.length) {
      showSaveState("Fix errors", "error", true);
      return;
    }
    try {
      await chrome.storage.sync.set({ settings });
      showSaveState("Saved");
    } catch (_error) {
      showSaveState("Could not save", "error", true);
    }
  }

  function showSaveState(message, state = "", persistent = false) {
    clearTimeout(notificationTimer);
    saveState.hidden = false;
    saveState.textContent = message;
    saveState.className = ["save-state", "visible", state]
      .filter(Boolean)
      .join(" ");
    if (!persistent) {
      notificationTimer = setTimeout(() => {
        saveState.classList.remove("visible");
        notificationTimer = setTimeout(() => {
          saveState.hidden = true;
          saveState.textContent = "";
        }, 160);
      }, 1600);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    showSaveState("Saving…", "saving", true);
    saveTimer = setTimeout(save, 300);
  }

  async function updateShortcutStatus() {
    const commands = await chrome.commands.getAll();
    const command = commands.find(
      (candidate) => candidate.name === "open-selection-launcher"
    );
    const status = document.querySelector("#shortcut-status");
    if (command?.shortcut) {
      status.textContent = `Current shortcut: ${command.shortcut}. Chrome manages changes at chrome://extensions/shortcuts.`;
    } else {
      status.textContent = "No shortcut is assigned. Choose Change keyboard shortcut to assign one.";
    }
  }

  function renderRegexRule(container, rule) {
    const row = regexTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector('[data-regex="enabled"]').checked = rule.enabled;
    row.querySelector('[data-regex="pattern"]').value = rule.pattern;
    row.querySelector('[data-regex="replacement"]').value = rule.replacement;
    row.querySelector('[data-regex="flags"]').value = rule.flags;
    container.append(row);
  }

  function updateCard(card) {
    const engine = readEngine(card);
    const replacement = card.querySelector(".replacement");
    const replacementInput = replacement.querySelector("input");
    const showReplacement = engine.whitespaceMode === "replace";
    replacementInput.disabled = !showReplacement;
    replacement.classList.toggle("is-disabled", !showReplacement);
    replacement.setAttribute("aria-disabled", String(!showReplacement));

    const rows = [...card.querySelectorAll(".regex-row")];
    rows.forEach((row, index) => {
      row.querySelector('[data-role="regex-error"]').textContent =
        validateRegex(engine.regexRules[index]);
    });

    const preview = card.querySelector('[data-role="preview"]');
    const error = validateEngine(engine);
    preview.classList.toggle("error", Boolean(error));
    preview.textContent = error || `Preview: ${buildSearchUrl(sample, engine)}`;
  }

  function render() {
    list.replaceChildren();
    document.querySelector("#auto-show").checked = settings.autoShow;
    document.querySelector("#copy-button").checked = settings.copyButton;

    if (!settings.engines.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No search engines yet. Add one to create a bubble action.";
      list.append(empty);
      return;
    }

    settings.engines.forEach((engine) => {
      const card = engineTemplate.content.firstElementChild.cloneNode(true);
      card.dataset.id = engine.id;
      for (const [field, value] of Object.entries(engine)) {
        const input = card.querySelector(`[data-field="${field}"]`);
        if (!input) continue;
        if (input.type === "checkbox") input.checked = value;
        else input.value = value;
      }
      const regexList = card.querySelector('[data-role="regex-list"]');
      engine.regexRules.forEach((rule) => renderRegexRule(regexList, rule));
      list.append(card);
      updateCard(card);
    });
  }

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".engine");
    const action = button.dataset.action;

    if (action === "add-regex") {
      renderRegexRule(card.querySelector('[data-role="regex-list"]'), {
        enabled: true, pattern: "", replacement: "", flags: "g"
      });
      updateCard(card);
      scheduleSave();
      return;
    }
    if (action === "remove-regex") {
      button.closest(".regex-row").remove();
      updateCard(card);
      scheduleSave();
      return;
    }

    const cards = [...list.querySelectorAll(".engine")];
    const index = cards.indexOf(card);
    if (action === "remove") card.remove();
    if (action === "up" && index > 0) list.insertBefore(card, cards[index - 1]);
    if (action === "down" && index < cards.length - 1) {
      list.insertBefore(cards[index + 1], card);
    }
    settings = readSettings();
    render();
    scheduleSave();
  });

  list.addEventListener("input", (event) => {
    const card = event.target.closest(".engine");
    if (card) updateCard(card);
    scheduleSave();
  });
  list.addEventListener("change", (event) => {
    const card = event.target.closest(".engine");
    if (card) updateCard(card);
    scheduleSave();
  });
  document.querySelector("#auto-show").addEventListener("change", scheduleSave);
  document.querySelector("#copy-button").addEventListener("change", scheduleSave);
  document.querySelector("#add-engine").addEventListener("click", () => {
    settings = readSettings();
    settings.engines.push(newEngine());
    render();
    list.lastElementChild?.querySelector('[data-field="name"]')?.focus();
    scheduleSave();
  });
  document.querySelector("#shortcut-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SHORTCUTS" });
  });
  window.addEventListener("focus", updateShortcutStatus);
  document.querySelector("#extension-version").textContent =
    `Version ${chrome.runtime.getManifest().version}`;

  chrome.storage.sync.get("settings").then(({ settings: stored }) => {
    settings = normalizeSettings(stored);
    render();
  });
  updateShortcutStatus();
})();
