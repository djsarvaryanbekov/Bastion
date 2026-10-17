"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "fire-vfx.js"), "utf8");
const checks = [];
const MAX_BURN_ARCS = 21 * 4;

function renderer() {
  const math = Object.create(Math);
  math.random = () => { throw new Error("Rendering consumed combat RNG"); };
  const sandbox = { window: {}, Math: math };
  vm.runInNewContext(source, sandbox, { filename: "fire-vfx.js" });
  return sandbox.window.DriftFireVfx;
}

function recordingContext() {
  const stack = [];
  let arcs = [], fillCount = 0;
  return {
    marks: [], globalAlpha: 1, fillStyle: "black", shadowBlur: 0,
    globalCompositeOperation: "source-over",
    save() {
      stack.push([this.globalAlpha, this.fillStyle, this.shadowBlur, this.globalCompositeOperation]);
    },
    restore() {
      assert.ok(stack.length, "Canvas restores must be balanced");
      [this.globalAlpha, this.fillStyle, this.shadowBlur, this.globalCompositeOperation] = stack.pop();
    },
    beginPath() { arcs = []; },
    moveTo(x, y) {
      assert.ok([x, y].every(Number.isFinite), "Every path move is finite");
    },
    arc(x, y, radius) {
      assert.ok([x, y, radius].every(Number.isFinite), "Every particle geometry value is finite");
      assert.ok(radius > 0, "Visible particles have positive radius");
      arcs.push({ x, y, radius });
    },
    fill() {
      assert.ok(arcs.length > 0, "Every fill has particle geometry");
      assert.ok(Number.isFinite(this.globalAlpha) && this.globalAlpha > 0 && this.globalAlpha <= 1,
        "Visible particle opacity is bounded");
      assert.equal(typeof this.fillStyle, "string", "Every particle has a valid palette color");
      for (const arc of arcs) {
        this.marks.push({ ...arc, path: fillCount, alpha: this.globalAlpha, color: this.fillStyle });
      }
      fillCount += 1;
    },
    assertRestored() {
      assert.equal(stack.length, 0, "Canvas state does not leak");
      assert.equal(this.globalAlpha, 1);
      assert.equal(this.fillStyle, "black");
      assert.equal(this.globalCompositeOperation, "source-over");
    }
  };
}

function enemy(overrides = {}) {
  return { id: 17, x: 45, y: -35, dead: false, burnTimer: 2.5, burnDamage: 3, ...overrides };
}

function draw(api, unit, time, options = {}) {
  const context = recordingContext();
  const camera = options.camera || { x: 0, y: 0 };
  const pos = { x: unit.x - camera.x, y: unit.y - camera.y };
  api.burn(context, unit, pos, options.radius || 48, options.facing || 0, time,
    options.zoom || 1, options.detailed !== false, !!options.reducedFlash);
  context.assertRestored();
  return context.marks;
}

function sameMarks(actual, expected, label) {
  assert.equal(actual.length, expected.length, label + ": geometry count");
  for (let i = 0; i < actual.length; i += 1) {
    assert.equal(actual[i].color, expected[i].color, label + ": color");
    assert.equal(actual[i].path, expected[i].path, label + ": fill path grouping");
    for (const key of ["x", "y", "radius", "alpha"]) {
      assert.ok(Math.abs(actual[i][key] - expected[i][key]) < 1e-8,
        `${label}: particle ${i} ${key} ${actual[i][key]} != ${expected[i][key]}`);
    }
  }
}

// Frozen gameplay inputs make an accidental renderer write fail immediately.
{
  const api = renderer();
  const unit = Object.freeze(enemy());
  const before = JSON.stringify(unit);
  const first = draw(api, unit, 1);
  assert.ok(first.length > 0, "Fresh burning enemies are immediately readable");
  sameMarks(draw(api, unit, 1), first, "Paused rendering is stable");
  draw(api, unit, 1.2);
  assert.equal(JSON.stringify(unit), before, "Rendering leaves gameplay fields unchanged");
  checks.push("Frozen gameplay inputs and no combat RNG", "Paused frame stability");
}

// A paused position/rotation change moves the hull, never its previously emitted cinders.
{
  const api = renderer();
  const unit = enemy();
  const first = draw(api, unit, 1);
  unit.x += 50; unit.y -= 30;
  sameMarks(draw(api, unit, 1), first, "Emissions remain fixed when hull moves");
  sameMarks(draw(api, unit, 1, { facing: Math.PI / 2 }), first,
    "Emissions remain fixed when hull rotates");
  const camera = { x: 137, y: -81 };
  const shifted = draw(api, unit, 1, { camera, facing: Math.PI });
  sameMarks(shifted.map(mark => ({ ...mark, x: mark.x + camera.x, y: mark.y + camera.y })),
    first, "Camera changes only screen translation");
  checks.push("World-fixed motion and rotation", "Camera translation");
}

// Emission history follows simulation time, with interpolation between render frames.
function linearMotion(hz) {
  const api = renderer();
  const unit = enemy({ x: 0, y: 0 });
  let result;
  for (let frame = 0; frame <= hz; frame += 1) {
    const time = frame / hz;
    unit.x = time * 80; unit.y = time * -45;
    result = draw(api, unit, time);
    assert.ok(result.length <= MAX_BURN_ARCS, "One unit cannot accumulate unbounded burn geometry");
  }
  return result;
}
sameMarks(linearMotion(30), linearMotion(120), "30 Hz and 120 Hz linear motion");
checks.push("Frame-rate-independent emission positions", "Bounded particle history");

// An object reused by the enemy pool, or a rewound simulation, starts fresh.
{
  const api = renderer();
  const unit = enemy();
  draw(api, unit, 1);
  unit.x += 30; draw(api, unit, 1.15);
  unit.id = 99;
  sameMarks(draw(api, unit, 1.2), draw(renderer(), { ...unit }, 1.2), "Pool identity reset");
  draw(api, unit, 1.3);
  sameMarks(draw(api, unit, .2), draw(renderer(), { ...unit }, .2), "Simulation rewind reset");
  unit.x += 500;
  sameMarks(draw(api, unit, .25), draw(renderer(), { ...unit }, .25), "Teleport reset");
  sameMarks(draw(api, unit, 3), draw(renderer(), { ...unit }, 3), "Offscreen gap reset");
  checks.push("Pool identity, time rewind, teleport and gap resets");
}

for (const field of ["dead", "burnTimer"]) {
  const api = renderer();
  const unit = enemy();
  draw(api, unit, 1);
  unit[field] = field === "dead" ? true : 0;
  assert.equal(draw(api, unit, 1.1).length, 0, "Death/expiry immediately stops the status cue");
  unit[field] = field === "dead" ? false : 2.5;
  sameMarks(draw(api, unit, 1.2), draw(renderer(), { ...unit }, 1.2), "Expired history is discarded");
}
checks.push("Death and burn expiry discard old trails");

// Distant enemies and accessible/static fallbacks still have finite, visible cues.
for (const options of [{ zoom: .35 }, { zoom: .35, detailed: false },
  { zoom: .35, reducedFlash: true }]) {
  const api = renderer();
  const unit = enemy();
  const marks = draw(api, unit, 1, options);
  assert.ok(marks.length > 0 && marks.length <= MAX_BURN_ARCS, "Distant cues remain visible and bounded");
  assert.ok(marks.some(mark => mark.radius * options.zoom >= 1),
    "At least one distant particle has a one-pixel screen radius");
  sameMarks(draw(api, unit, 1, options), marks, "Distant/static pause stability");
}
checks.push("0.35 zoom, quality fallback and reduced flashes");

console.log(JSON.stringify({ passed: true, checks }));
