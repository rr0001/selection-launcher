import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../src/content.js", import.meta.url), "utf8");

function harness() {
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const listen = (name, handler) => listeners.set(name, handler);
  const context = {
    HTMLElement: class {},
    SelectionLauncherShared: { normalizeSettings: () => ({ autoShow: true, engines: [] }) },
    document: { addEventListener: listen, activeElement: null, hasFocus: () => true },
    window: {
      addEventListener: listen,
      setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
      getSelection: () => null
    },
    clearTimeout: (id) => timers.delete(id),
    chrome: {
      runtime: { onMessage: { addListener() {} } },
      storage: { sync: { get: async () => ({}) }, onChanged: { addListener() {} } }
    }
  };
  vm.runInNewContext(source, context);
  return {
    timers,
    fire: (name, event = {}) => listeners.get(name)?.({ composedPath: () => [], ...event })
  };
}

test("waits for pointer release even when selection changes repeatedly", () => {
  const app = harness();
  app.fire("selectionchange");
  assert.equal(app.timers.size, 1);
  app.fire("pointerdown", { button: 0, pointerId: 1 });
  app.fire("selectionchange");
  app.fire("selectionchange");
  assert.equal(app.timers.size, 0);
  app.fire("pointerup", { pointerId: 1 });
  assert.equal(app.timers.size, 1);
});

test("an outside click without a changed selection does not schedule a bubble", () => {
  const app = harness();
  app.fire("pointerdown", { button: 0, pointerId: 1 });
  app.fire("pointerup", { pointerId: 1 });
  assert.equal(app.timers.size, 0);
});

test("waits until Shift-key selection ends", () => {
  const app = harness();
  app.fire("keydown", { key: "Shift", code: "ShiftLeft" });
  app.fire("selectionchange");
  assert.equal(app.timers.size, 0);
  app.fire("keyup", { key: "Shift", code: "ShiftLeft" });
  assert.equal(app.timers.size, 1);
});

test("cancellation and focus loss clear pending selection state", () => {
  const app = harness();
  app.fire("pointerdown", { button: 0, pointerId: 1 });
  app.fire("selectionchange");
  app.fire("pointercancel", { pointerId: 1 });
  assert.equal(app.timers.size, 0);
  app.fire("keydown", { key: "Shift", code: "ShiftLeft" });
  app.fire("blur");
  app.fire("selectionchange");
  assert.equal(app.timers.size, 1);
});
