"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../src/shared.js");
const { buildSearchUrl, normalizeSettings, transformText } =
  globalThis.SelectionLauncherShared;

test("trims and preserves internal whitespace", () => {
  assert.equal(
    transformText("  red  fox  ", {
      trim: true,
      whitespaceMode: "preserve"
    }),
    "red  fox"
  );
});

test("removes runs of whitespace", () => {
  assert.equal(
    transformText(" red \n fox ", {
      trim: true,
      whitespaceMode: "remove"
    }),
    "redfox"
  );
});

test("replaces whitespace before applying regex rules", () => {
  assert.equal(
    transformText(" Red   Fox 42 ", {
      trim: true,
      whitespaceMode: "replace",
      whitespaceReplacement: "-",
      regexRules: [
        { enabled: true, pattern: "[0-9]+", replacement: "ID", flags: "g" },
        { enabled: true, pattern: "red", replacement: "blue", flags: "i" }
      ]
    }),
    "blue-Fox-ID"
  );
});

test("encodes transformed text in every query placeholder", () => {
  assert.equal(
    buildSearchUrl("red fox", {
      url: "https://example.com/{query}?q={query}",
      whitespaceMode: "replace",
      whitespaceReplacement: "+"
    }),
    "https://example.com/red%2Bfox?q=red%2Bfox"
  );
});

test("rejects unsafe protocols and missing placeholders", () => {
  assert.throws(
    () => buildSearchUrl("text", { url: "javascript:alert({query})" }),
    /http or https/
  );
  assert.throws(
    () => buildSearchUrl("text", { url: "https://example.com/" }),
    /include \{query\}/
  );
});

test("normalizes incomplete stored settings", () => {
  const settings = normalizeSettings({ engines: [{ name: "Docs" }] });
  assert.equal(settings.engines[0].name, "Docs");
  assert.equal(settings.engines[0].whitespaceMode, "preserve");
  assert.deepEqual(settings.engines[0].regexRules, []);
});
