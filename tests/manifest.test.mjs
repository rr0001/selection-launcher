import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("keeps manifest and package versions synchronized", () => {
  assert.equal(manifest.version, packageJson.version);
});

test("declares keyboard-first launcher commands", () => {
  assert.equal(
    manifest.commands["open-selection-launcher"].suggested_key.default,
    "Ctrl+Shift+Period"
  );
  assert.equal(
    manifest.commands["search-first-engine"].suggested_key.default,
    "Alt+1"
  );
});
