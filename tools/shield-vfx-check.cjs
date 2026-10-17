"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const shieldVfx = require("../shield-vfx.js");

// Exercise the actual damage path, independently of the renderer's coverage math.
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker,
  "    window.__shieldVfxTest = { Game, makeTile };\n" + marker);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      return file === "game.js" ? source : fs.readFileSync(file, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
const { Game, makeTile } = bootstrap.runtime.__shieldVfxTest;

function recordCanvas() {
  return {
    paths: [], fills: [], save() {}, restore() {}, setLineDash() {}, closePath() {},
    beginPath() { this.paths = []; }, fill() { this.fills.push(this.paths); }, stroke() {},
    moveTo(x, y) { this.paths.push([[x, y]]); },
    lineTo(x, y) { this.paths.at(-1).push([x, y]); }
  };
}

function contains(paths, x, y) {
  let inside = false;
  for (const points of paths) {
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
  }
  return inside;
}

function drawnCoverage(renderer, tiles, definition) {
  renderer.update(tiles, definition);
  const fields = recordCanvas(), surface = recordCanvas();
  renderer.drawFields(fields, 42);
  renderer.drawSurface(surface, 42, 1, false);
  assert.ok(surface.fills.length <= 1, "Overlaps share one surface fill");
  const filled = new Set(), marked = new Set();
  tiles.forEach((tile, key) => {
    if (contains(surface.fills[0] || [], tile.x * 42, tile.y * 42)) filled.add(key);
    if (renderer.coverageAt(tile.x, tile.y) === 2) marked.add(key);
  });
  return { filled, marked, paths: surface.fills[0] || [] };
}

const renderer = shieldVfx.create();
const game = new Game();
game.ship.tiles.clear();
for (let y = -5; y <= 5; y++) {
  for (let x = -5; x <= 5; x++) game.ship.tiles.set(`${x},${y}`, makeTile("armor", x, y, false));
}
const node = makeTile("shield", 0, 0, false);
game.ship.tiles.set("0,0", node);
const definition = game.weaponDefinitions.shield;

for (const [radius, cellCount] of [[2.3, 21], [2.8, 21], [3.2, 37]]) {
  definition.shieldRadius = radius;
  node.shield = 60;
  const visual = drawnCoverage(renderer, game.ship.tiles, definition);
  const absorbed = new Set();
  game.ship.tiles.forEach((tile, key) => {
    node.shield = 60;
    const hp = tile.hp;
    game.applyDamageToTile(key, 1);
    if (tile.hp === hp) absorbed.add(key);
    tile.hp = hp;
  });
  assert.equal(visual.filled.size, cellCount);
  assert.deepEqual(visual.filled, absorbed, `Field cells must match actual absorption at radius ${radius}`);
  assert.deepEqual(visual.marked, absorbed, `Build coverage must match actual absorption at radius ${radius}`);
}

node.shield = 0;
assert.equal(drawnCoverage(renderer, game.ship.tiles, definition).marked.size, 0, "An empty field cannot mark modules as protected");
const second = makeTile("shield", 2, 0, false);
game.ship.tiles.set("2,0", second);
second.shield = 60;
const overlap = drawnCoverage(renderer, game.ship.tiles, definition);
assert.ok(overlap.marked.has("0,0"), "A charged field protects a depleted generator inside it");
assert.ok(!overlap.marked.has("-3,0"), "The empty-only region stays unprotected");
node.shield = 60;
assert.ok(drawnCoverage(renderer, game.ship.tiles, definition).marked.has("-3,0"));
game.ship.tiles.delete("0,0");
assert.ok(!drawnCoverage(renderer, game.ship.tiles, definition).marked.has("-3,0"), "Removing a node must invalidate cached coverage");
game.ship.tiles.delete("2,0");
assert.equal(drawnCoverage(renderer, game.ship.tiles, definition).filled.size, 0);

game.ship.tiles.set("0,0", node);
node.shield = 0;
definition.reserveCapacity = 40;
node.reserveCooldown = 0;
assert.ok(drawnCoverage(renderer, game.ship.tiles, definition).marked.has("0,0"), "A ready emergency reserve can absorb the next hit");
const hp = node.hp;
game.applyDamageToTile("0,0", 1);
assert.equal(node.hp, hp);
assert.ok(drawnCoverage(renderer, game.ship.tiles, definition).marked.has("0,0"), "A live reserve remains visible");
game.updateShields(2);
assert.equal(drawnCoverage(renderer, game.ship.tiles, definition).marked.size, 0, "Expired reserves must remove active markers during cooldown");

const before = JSON.stringify([...game.ship.tiles]);
drawnCoverage(renderer, game.ship.tiles, definition);
assert.equal(JSON.stringify([...game.ship.tiles]), before, "Presentation must never change combat state");
const replacement = new Map([["4,0", Object.assign(makeTile("shield", 4, 0, false), { shield: 60 })]]);
assert.ok(drawnCoverage(renderer, replacement, definition).marked.has("4,0"), "Replacing the ship map must rebuild coverage");

const hollow = new Map();
for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
  if (x || y) hollow.set(`${x},${y}`, makeTile(x === -1 && y === -1 ? "shield" : "armor", x, y, false));
}
const hole = drawnCoverage(renderer, hollow, { shieldRadius: 5, rechargeDelay: 6 });
assert.equal(hole.filled.size, 8);
assert.equal(contains(hole.paths, 0, 0), false, "Empty hull space must not acquire a combat shield surface");
const diagonal = new Map([["0,0", makeTile("shield", 0, 0, false)], ["1,1", makeTile("shield", 1, 1, false)]]);
const separate = drawnCoverage(renderer, diagonal, { shieldRadius: 0, rechargeDelay: 6 });
assert.equal(separate.filled.size, 2);
assert.equal(separate.paths.length, 2, "Diagonal contact cannot join separate barriers across empty cells");

console.log(JSON.stringify({ passed: true, verified: ["Drawn hull surface and Build coverage match real damage absorption", "Base and expanded radii", "Merged charged and depleted overlaps", "Removal and map replacement", "Emergency reserve activation and expiry", "Holes and disconnected contours", "No combat state mutation"] }, null, 2));
