import test from "node:test";
import assert from "node:assert/strict";

import {
  compareVersions,
  formatVersion,
  nextVersion,
  parseConventionalCommit,
  parseVersion,
  renderReleaseNotes,
  sha256,
  updateChangelog
} from "../scripts/publish.mjs";

test("parses and formats stable semantic versions", () => {
  assert.deepEqual(parseVersion("0.1.0"), [0, 1, 0]);
  assert.equal(formatVersion([2, 3, 4]), "2.3.4");
  assert.throws(() => parseVersion("1.0.0-beta.1"), /Invalid semantic version/);
  assert.throws(() => parseVersion("01.0.0"), /Invalid semantic version/);
});

test("increments semantic version release types", () => {
  assert.equal(nextVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(nextVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(nextVersion("1.2.3", "major"), "2.0.0");
});

test("compares semantic versions numerically", () => {
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.9.0", "1.0.0"), -1);
});

test("categorizes Conventional Commits and breaking changes", () => {
  assert.deepEqual(
    parseConventionalCommit({ hash: "123456789", subject: "feat(options): add engine ordering" }),
    { category: "Added", text: "**options:** Add engine ordering (`1234567`)" }
  );
  assert.equal(
    parseConventionalCommit({ subject: "fix!: change stored settings format" }).category,
    "Breaking Changes"
  );
  assert.equal(
    parseConventionalCommit({ subject: "Update project wording" }).category,
    "Other Changes"
  );
});

test("renders categorized release notes in a stable order", () => {
  const notes = renderReleaseNotes("1.2.0", "2026-09-13", [
    { hash: "bbbbbbb", subject: "fix: prevent stale context errors" },
    { hash: "aaaaaaa", subject: "feat: add configurable engines" },
    { hash: "ccccccc", subject: "docs: add screenshots" }
  ]);
  assert.match(notes, /^## 1\.2\.0 - 2026-09-13/);
  assert.ok(notes.indexOf("### Added") < notes.indexOf("### Fixed"));
  assert.ok(notes.indexOf("### Fixed") < notes.indexOf("### Documentation"));
});

test("inserts the newest release at the top of the changelog", () => {
  const original = "# Changelog\n\n<!-- releases -->\n\n## 1.0.0 - 2026-01-01\n";
  const updated = updateChangelog(original, "## 1.1.0 - 2026-02-01\n\n### Added\n\n- A feature");
  assert.ok(updated.indexOf("## 1.1.0") < updated.indexOf("## 1.0.0"));
  assert.throws(() => updateChangelog(updated, "## 1.1.0 - 2026-02-01"), /already/);
});

test("calculates a reproducible SHA-256 digest", () => {
  assert.equal(
    sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});
