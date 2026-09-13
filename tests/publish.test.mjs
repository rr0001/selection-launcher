import test from "node:test";
import assert from "node:assert/strict";

import {
  compareVersions,
  formatVersion,
  nextVersion,
  parseVersion
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
