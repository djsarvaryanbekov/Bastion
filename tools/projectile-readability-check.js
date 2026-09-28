"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
assert.ok(harness.includes(marker));
const source = fs.readFileSync("game.js", "utf8");
const exposure = "    window.__driftBastion = {";
assert.ok(source.includes(exposure));
const instrumented = source.replace(exposure,
  "    window.__readabilityTest = { create: function () { game = new Game(); return game; }, render: render, drawProjectiles: drawProjectiles, drawBossAttackTelegraph: drawBossAttackTelegraph, context: ctx, modules: MODULES, colors: SHOT_COLORS };\n" + exposure);
const bootstrap = {
  console, setTimeout, clearTimeout, URLSearchParams,
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(path, encoding) {
      return path === "game.js" ? instrumented : fs.readFileSync(path, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__readabilityTest;
const game = api.create();
assert.equal(Object.keys(api.modules).length, 18, "The expanded module catalog must include both new weapons.");
assert.notEqual(api.modules.ember.color, api.modules.gravity.color, "Flames and gravity fields retain distinct weapon colors.");
game.operation = null;
game.enemies.length = 0;
game.enemyById.clear();
game.rebuildEnemyGrid();
game.effects.length = 0;
game.particles.length = 0;

game.firePiercingBeam({ x: -50, y: 0 }, 1, 0, 180, 0, "#a987ff", 8, .2);
game.firePulse({ x: 0, y: 0 }, api.modules.pulse, 1);
game.explodeBlast({ friendly: true, x: 30, y: 0, damage: 0 }, 70, "#ffd96a", 4);
const energyEffects = game.effects.filter((effect) => effect.type === "beam" || effect.type === "ring");
assert.ok(energyEffects.length >= 3);
assert.deepEqual(Array.from(new Set(energyEffects.map((effect) => effect.color))).sort(), ["#54f4ff", "#a987ff", "#ffd96a"],
  "Laser, pulse and missile explosions must keep their own weapon colors.");
game.fireEmberCone({ x: 0, y: 0 }, 1, 0, api.modules.ember, 1);
game.placeGravityField({}, { x: 0, y: 0 }, { x: 100, y: 50 }, api.modules.gravity, 1);
assert.equal(game.effects.find((effect) => effect.type === "flameCone").color, api.modules.ember.color);
assert.equal(game.gravityFields[0].color, api.modules.gravity.color);

const friendly = game.spawnProjectile(true, "cannon", 0, -40, 100, 0, 12, 3, 2, api.modules.cannon.color);
const scatter = game.spawnProjectile(true, "scatter", -30, -40, 100, 0, 6, 2, 2, api.modules.scatter.color);
game.spawnProjectile(true, "missile", -60, -40, 100, 0, 32, 4, 2, api.modules.missile.color);
const hostile = game.spawnProjectile(false, "gunnerShot", 30, -40, -100, 0, 9, 3.5, 2, "#65e8ff");
const sniper = game.spawnProjectile(false, "sniperShot", 60, -40, -100, 0, 24, 5, 2, "#57a7ff");
const bossShot = game.spawnProjectile(false, "bossShot", 90, -40, -100, 0, 18, 4, 2, "#a987ff");
assert.equal(friendly.color, api.modules.cannon.color);
assert.equal(scatter.color, api.modules.scatter.color);
assert.equal(hostile.color, "#65e8ff");
assert.equal(sniper.color, "#57a7ff");
assert.equal(bossShot.color, "#a987ff");
const physicsBefore = game.projectiles.map((shot) => [shot.radius, shot.damage, shot.x, shot.y, shot.vx, shot.vy, shot.life]);

const paints = [];
const radii = [];
api.context.fill = function () { paints.push({ method: "fill", color: api.context.fillStyle }); };
api.context.fillRect = function () { paints.push({ method: "fill", color: api.context.fillStyle }); };
api.context.stroke = function () { paints.push({ method: "stroke", color: api.context.strokeStyle }); };
api.context.arc = function (_x, _y, radius) { radii.push(radius); };
api.drawProjectiles(false);
assert.ok(paints.some((paint) => paint.color === api.modules.cannon.color));
assert.ok(paints.some((paint) => paint.color === api.modules.scatter.color));
assert.ok(paints.some((paint) => paint.color === api.modules.missile.color));
assert.deepEqual(radii.slice().sort(), [2, 3], "Friendly batched bullets must retain their original distinct radii.");
paints.length = 0;
radii.length = 0;
api.drawProjectiles(true);
assert.ok(paints.some((paint) => paint.color === api.colors.hostileRim));
[hostile, sniper, bossShot].forEach((shot) => assert.ok(paints.some((paint) => paint.color === shot.color)));
assert.deepEqual(radii, [3.5, 5, 7, 4],
  "Hostile bullets must keep original sizes and the sniper's original white-ring silhouette.");

paints.length = 0;
api.render(0);
const lastFriendly = paints.map((paint) => paint.color).lastIndexOf(api.modules.pulse.color);
const lastHostile = paints.map((paint) => paint.color).lastIndexOf(api.colors.hostileRim);
assert.ok(lastFriendly >= 0 && lastHostile > lastFriendly,
  "Hostile fire must render after friendly projectiles and energy effects.");
assert.equal(paints[paints.length - 1].color, api.colors.hostileRim);
assert.deepEqual(game.projectiles.map((shot) => [shot.radius, shot.damage, shot.x, shot.y, shot.vx, shot.vy, shot.life]), physicsBefore,
  "Rendering must never alter projectile hitboxes, damage, motion or lifetime.");

paints.length = 0;
api.drawBossAttackTelegraph({ color: "#a987ff", radius: 72, attackPattern: "aimed", lockedAimX: 1, lockedAimY: 0, fanShotCount: 3, fanSpread: .2 }, { x: 0, y: 0 }, .5);
assert.ok(paints.length > 0 && paints.every((paint) => paint.color === api.colors.hostile),
  "Boss attack warnings must use the hostile palette independently of boss body color.");
assert.equal(api.modules.missile.color, "#ffd96a");
assert.equal(api.modules.laser.color, "#a987ff");
assert.equal(api.modules.cryo.color, "#8ac7ff");
console.log(JSON.stringify({ passed: true,
  verified: ["Distinct weapon and enemy colors", "Original projectile radii", "Original sniper silhouette", "Thin hostile outlines", "Hostile final draw pass", "Unchanged combat data", "Preserved module palette", "Warm attack warnings"],
  limitation: "Canvas command inspection; screenshots still provide the visual readability check." }, null, 2));
