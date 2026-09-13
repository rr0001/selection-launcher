(function initSelectionLauncherShared(global) {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    autoShow: true,
    copyButton: true,
    engines: [
      {
        id: "google",
        name: "Google",
        url: "https://www.google.com/search?q={query}",
        enabled: true,
        openInNewTab: true,
        trim: true,
        whitespaceMode: "preserve",
        whitespaceReplacement: "-",
        regexRules: []
      }
    ]
  });

  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return `engine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeRegexRule(rule) {
    return {
      enabled: rule?.enabled !== false,
      pattern: String(rule?.pattern ?? ""),
      replacement: String(rule?.replacement ?? ""),
      flags: String(rule?.flags ?? "g")
    };
  }

  function normalizeEngine(engine) {
    const whitespaceModes = new Set(["preserve", "remove", "replace"]);
    return {
      id: String(engine?.id || makeId()),
      name: String(engine?.name || "Search").slice(0, 40),
      url: String(engine?.url || "https://www.google.com/search?q={query}"),
      enabled: engine?.enabled !== false,
      openInNewTab: engine?.openInNewTab !== false,
      trim: engine?.trim !== false,
      whitespaceMode: whitespaceModes.has(engine?.whitespaceMode)
        ? engine.whitespaceMode
        : "preserve",
      whitespaceReplacement: String(engine?.whitespaceReplacement ?? "-"),
      regexRules: Array.isArray(engine?.regexRules)
        ? engine.regexRules.map(normalizeRegexRule)
        : []
    };
  }

  function normalizeSettings(settings) {
    const engines = Array.isArray(settings?.engines)
      ? settings.engines.map(normalizeEngine)
      : DEFAULT_SETTINGS.engines.map(normalizeEngine);
    return {
      autoShow: settings?.autoShow !== false,
      copyButton: settings?.copyButton !== false,
      engines
    };
  }

  function transformText(text, engine) {
    const normalized = normalizeEngine(engine);
    let result = String(text ?? "");

    if (normalized.trim) result = result.trim();
    if (normalized.whitespaceMode === "remove") {
      result = result.replace(/\s+/g, "");
    } else if (normalized.whitespaceMode === "replace") {
      result = result.replace(/\s+/g, normalized.whitespaceReplacement);
    }

    for (const rule of normalized.regexRules) {
      if (!rule.enabled || !rule.pattern) continue;
      try {
        result = result.replace(new RegExp(rule.pattern, rule.flags), rule.replacement);
      } catch (_error) {
        // Invalid rules are surfaced in Options and skipped at runtime.
      }
    }
    return result;
  }

  function buildSearchUrl(text, engine) {
    const normalized = normalizeEngine(engine);
    if (!normalized.url.includes("{query}")) {
      throw new Error("Search URL must include {query}.");
    }
    const transformed = transformText(text, normalized);
    const url = normalized.url.replaceAll("{query}", encodeURIComponent(transformed));
    const parsed = new URL(url);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
      throw new Error("Search URL must use http or https.");
    }
    return parsed.href;
  }

  global.SelectionLauncherShared = {
    DEFAULT_SETTINGS,
    buildSearchUrl,
    makeId,
    normalizeEngine,
    normalizeSettings,
    transformText
  };
})(globalThis);
