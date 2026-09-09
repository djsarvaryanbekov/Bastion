"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker,
  "    window.__shieldTest = { Game, makeTile, MODULES, ctx, drawShip, activate: function (instance) { game = instance; } };\n" + marker);
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
const { Game, makeTile, MODULES } = bootstrap.runtime.__shieldTest;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const game = new Game();
game.ship.tiles.clear();
const core = makeTile("core", 0, 0, true);
const left = makeTile("shield", -1, 0, false);
const right = makeTile("shield", 1, 0, false);
const remote = makeTile("shield", 5, 0, false);
for (const tile of [core, left, right, remote]) game.ship.tiles.set(`${tile.x},${tile.y}`, tile);

left.shield = 10; right.shield = 20; remote.shield = 10;
game.applyDamageToTile("0,0", 30);
assert.equal(left.shield + right.shield, 0);
assert.equal(core.hp, core.maxHp, "Overlapping local fields absorb their own remaining charges before hull damage");
assert.equal(remote.shieldDelay, 0, "Damage outside a field cannot interrupt it");
game.updateShields(1);
assert.equal(remote.shield, 14, "A distant node recovers independently while the core fields are under attack");
for (let second = 0; second < 12; second++) {
  game.applyDamageToTile("0,0", 1);
  game.updateShields(1);
  assert.equal(left.shield + right.shield, 0, "Empty overlapping fields must not regenerate between sustained hits");
}
assert.equal(core.hp, core.maxHp - 12, "An empty field cannot secretly absorb ongoing damage");
game.updateShields(5);
assert.equal(left.shield + right.shield, 0, "Six complete quiet seconds are required, including the last second above");
game.updateShields(1);
assert.equal(left.shield, 4); assert.equal(right.shield, 4);
game.updateShields(14);
assert.equal(left.shield, 60); assert.equal(right.shield, 60);
assert.equal(remote.shield, 60, "Charge is capped separately for every generator");
for (const invalid of [0, -1, NaN, Infinity]) game.applyDamageToTile("0,0", invalid);
assert.equal(left.shieldDelay, 0, "Non-hits cannot suppress regeneration");

left.shield = 0; left.shieldDelay = MODULES.shield.rechargeDelay;
right.shield = 0; right.shieldDelay = MODULES.shield.rechargeDelay;
game.ship.tiles.delete("1,0");
game.updateShields(7);
game.ship.tiles.delete("-1,0"); game.ship.tiles.set("1,0", right);
for (let frame = 0; frame < 210; frame++) game.updateShields(1 / 30);
near(left.shield, right.shield);

// Round pursuers ignore their facing; triangles preserve bounded turns.
game.ship.x = 0; game.ship.y = 0;
game.enemies.forEach(enemy => { enemy.dead = true; }); game.compactEnemies();
const circle = game.spawnEnemy("drone", 1000, 0);
circle.vx = 0; circle.vy = 165; circle.rotation = Math.PI / 2;
const triangle = game.spawnEnemy("hunter", 1200, 0);
triangle.vx = 0; triangle.vy = 250;
game.updateEnemies(1 / 30);
near(circle.vy, 0); assert.ok(circle.vx < 0);
const turned = Math.abs(Math.atan2(triangle.vy, triangle.vx) - Math.PI / 2);
assert.ok(turned <= triangle.turnRate / 30 + 1e-8);

// Record canvas operations: a shield's charge track stays inside its own tile,
// above its glyph, with a separate hull bar and a visible empty state.
const renderApi = bootstrap.runtime.__shieldTest;
renderApi.activate(game);
game.ship.tiles.clear();
const shield = makeTile("shield", 0, 0, false);
shield.hp -= 1;
game.ship.tiles.set("0,0", shield);
game.ship.tiles.set("0,1", makeTile("armor", 0, 1, false));
const rectangles = [];
renderApi.ctx.fillRect = function (x, y, width, height) { rectangles.push({ x, y, width, height, color: this.fillStyle }); };
for (const charge of [0, 30, 60]) {
  shield.shield = charge;
  rectangles.length = 0;
  renderApi.drawShip();
  const track = rectangles.find(rect => rect.x === -16 && rect.y === 9 && rect.width === 32 && rect.height === 5);
  assert.ok(track, "Charge track must remain inside its own tile");
  assert.equal(track.color, "#11252e");
  assert.ok(rectangles.some(rect => rect.y === 10 && rect.width === charge / 2 && rect.height === 3), "Charge fill reflects the individual generator");
  assert.ok(rectangles.some(rect => rect.y === 15 && rect.height === 2), "Hull bar remains separate");
  assert.ok(!rectangles.some(rect => rect.y === 24), "No charge bar may spill into the adjacent module");
}

console.log(JSON.stringify({ passed: true, verified: ["Independent local charge", "Empty-field recovery interrupted by hits", "Overlapping fields under sustained fire", "Quiet recovery and capacity", "Frame partition independence", "Round direct pursuit and bounded triangular turns"] }, null, 2));
