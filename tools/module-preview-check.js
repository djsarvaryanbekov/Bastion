"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const moduleMatch = fs.readFileSync("game.js", "utf8").match(/var MODULES = (\{[\s\S]*?\n    \});/);
assert.ok(moduleMatch, "Use the actual module configuration without executing Game");
const definitions = vm.runInNewContext("(" + moduleMatch[1] + ")");
const originalDefinitions = JSON.stringify(definitions);
for (const def of Object.values(definitions)) Object.freeze(def);
Object.freeze(definitions);

let nextFrame = 1, drawCalls = 0, observed = 0, disconnected = 0;
const frames = new Map(), visibilityListeners = new Set(), mediaListeners = new Set();
const media = { matches: false, addEventListener(type, listener) { mediaListeners.add(listener); }, removeEventListener(type, listener) { mediaListeners.delete(listener); } };
const context = new Proxy({}, { get(target, key) { return key in target ? target[key] : () => { drawCalls += 1; }; }, set(target, key, value) { target[key] = value; return true; } });
const canvas = { clientWidth: 360, clientHeight: 240, getContext() { return context; } };
const document = { hidden: false, addEventListener(type, listener) { visibilityListeners.add(listener); }, removeEventListener(type, listener) { visibilityListeners.delete(listener); } };
const sandbox = { document, console, devicePixelRatio: 3, matchMedia() { return media; },
  requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  ResizeObserver: class { observe() { observed += 1; } disconnect() { disconnected += 1; } }
};
vm.runInNewContext(fs.readFileSync("module-preview.js", "utf8"), sandbox, { filename: "module-preview.js" });
const api = sandbox.DriftModulePreview;
const preview = api.create({ canvas, definitions });
function show(type) { assert.equal(preview.show(type), true); return preview.snapshot(); }
function advance(seconds) { for (let i = 0; i < Math.round(seconds * 60); i += 1) preview.step(1 / 60); return preview.snapshot(); }
function raf(timestamp) { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(timestamp); }

assert.equal(frames.size, 0, "Creating an unopened preview must not start an animation");
const mechanics = {};
for (const type of Object.keys(definitions)) {
  show(type);
  const description = preview.describe();
  assert.equal(description.title, definitions[type].name);
  assert.ok(description.summary && description.stats.length);
  assert.equal(frames.size, 1, "Only one RAF is scheduled after changing the module");
  const result = advance(25);
  preview.draw();
  mechanics[type] = result.counters;
  assert.ok(result.modules.some(module => module.type === type));
  assert.ok(result.modules.some(module => module.type === "core"), "Each illustration has an actual modular ship");
  assert.ok(result.enemies.length <= 8 && result.projectiles.length <= 64 && result.effects.length <= 48);
  for (const module of result.modules) assert.ok(Number.isFinite(module.x) && Number.isFinite(module.y) && module.hp >= 0);
  for (const enemy of result.enemies) assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y) && Number.isFinite(enemy.hp));
  for (const shot of result.projectiles) assert.ok(Number.isFinite(shot.x) && Number.isFinite(shot.y));
}
assert.equal(Object.keys(mechanics).length, 19);
assert.ok(mechanics.cannon.hits > 0 && mechanics.missile.hits > 0 && mechanics.scatter.hits > 0);
assert.ok(mechanics.mine.hits > 0, "Mines must arm, detect proximity and damage the approaching targets");
assert.ok(mechanics.flak.intercepted > 0, "Flak must intercept actual incoming shots");
assert.ok(mechanics.cryo.slowed > 0 && mechanics.ember.burnDamage > 0 && mechanics.gravity.pulled > 0);
assert.ok(mechanics.shield.absorbed >= definitions.shield.shield && mechanics.shield.recharged > 0, "Shield charge must empty and then actually recharge");
assert.ok(mechanics.repair.repaired > 0);
assert.ok(mechanics.reactor.boostedShots > mechanics.reactor.normalShots, "An adjacent Cannon must complete more reloads than the reference Cannon");
assert.ok(mechanics.collector.income > 0 && mechanics.bulkhead.reduced > 0);

show("laser");
let result = advance(.4);
assert.equal(result.counters.shots, 1);
assert.equal(result.counters.hits, 3, "A single laser beam must hit all lined-up targets");
show("rail"); result = advance(1);
assert.equal(result.counters.shots, 1);
assert.equal(result.counters.hits, 3, "One rail projectile pierces through the whole line");
show("scatter"); result = advance(.4);
assert.equal(result.projectiles.length, definitions.scatter.pellets);
assert.ok(new Set(result.projectiles.map(shot => Math.round(shot.vy))).size > 1, "Scatter creates a real fan");
show("arc"); result = advance(.4);
assert.equal(result.counters.hits, definitions.arc.chains);
assert.equal(result.effects.find(effect => effect.kind === "arc").points.length, definitions.arc.chains + 1);
show("pulse"); result = advance(.4);
assert.equal(result.counters.hits, 4, "Pulse hits targets on every side of the ship");
show("armor"); result = advance(3);
assert.equal(result.modules[0].hp, result.modules[0].maxHp, "Armor blocks shots before they reach the core");
assert.ok(result.main.hp < result.main.maxHp);
show("drive"); const initialDrive = preview.snapshot(); result = advance(2);
const boostedTravel = result.main.x - initialDrive.main.x;
const normalTravel = result.modules[2].x - initialDrive.modules[2].x;
assert.ok(Math.abs(boostedTravel / normalTravel - (1 + definitions.drive.driveBonus)) < 1e-8);
show("repair"); result = advance(2.5);
assert.equal(result.counters.repaired, 0, "Repairs must wait for the actual configured safe delay");

assert.equal(canvas.width, 720); assert.equal(canvas.height, 480, "DPR is capped at two");
canvas.clientWidth = 640; canvas.clientHeight = 320; preview.draw();
assert.equal(canvas.width, 1280); assert.equal(canvas.height, 640);
const beforeInvalid = preview.snapshot();
assert.equal(preview.show("invented-module"), false);
assert.equal(preview.snapshot().type, beforeInvalid.type);
assert.equal(api.describe("invented-module", definitions), null);
assert.equal(JSON.stringify(definitions), originalDefinitions, "Preview must never mutate the live module configs");
const detached = preview.snapshot(); detached.modules[0].hp = -100;
assert.ok(preview.snapshot().modules[0].hp > 0, "Snapshots must not expose writable simulation entities");

preview.hide(); const hiddenTime = preview.snapshot().time;
assert.equal(frames.size, 0); preview.step(1); assert.equal(preview.snapshot().time, hiddenTime);
media.matches = true; show("missile");
assert.equal(preview.snapshot().playing, false); assert.equal(preview.snapshot().time, 0);
assert.equal(frames.size, 0, "Reduced motion draws the first frame without starting playback");
preview.step(.1); assert.equal(preview.snapshot().time, 0);
preview.setPlaying(true); assert.equal(frames.size, 1);
raf(1000); raf(1016); assert.ok(preview.snapshot().time > 0);
document.hidden = true; visibilityListeners.forEach(listener => listener());
assert.equal(frames.size, 0);
const backgroundTime = preview.snapshot().time; preview.step(10); assert.equal(preview.snapshot().time, backgroundTime);
document.hidden = false; visibilityListeners.forEach(listener => listener());
raf(900000); assert.equal(preview.snapshot().time, backgroundTime, "Restoring visibility must not catch up elapsed wall time");
raf(900016); assert.ok(preview.snapshot().time < backgroundTime + .02);
mediaListeners.forEach(listener => listener({ matches: true }));
assert.equal(frames.size, 0); assert.equal(preview.snapshot().playing, false);
preview.destroy(); assert.equal(frames.size, 0); assert.equal(visibilityListeners.size, 0); assert.equal(mediaListeners.size, 0);
assert.equal(observed, 1); assert.equal(disconnected, 1); assert.equal(preview.show("cannon"), false);
assert.ok(drawCalls > 0);
console.log(JSON.stringify({ passed: true, modules: Object.keys(mechanics).length, checks: ["19 real module configurations", "Distinct projectile, area, status and support mechanics", "Bounded entities", "Frozen config and detached snapshots", "Adaptive canvas and DPR cap", "Single RAF and lifecycle cleanup", "Reduced motion requires explicit Play", "Hidden tab never catches up"] }, null, 2));
