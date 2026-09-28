"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(projectRoot, file), "utf8");
const harness = read(".artifact_build/runtime-check.js");
const initializationMarker = "let installPromptCalls";
const exposureMarker = "    window.__driftBastion = {";
assert.ok(harness.includes(initializationMarker));
assert.ok(read("game.js").includes(exposureMarker));
const exposure = "    window.__aimTest = { Game: Game, makeTile: makeTile, drawGlyph: drawModuleGlyph, ctx: ctx, audio: audio, modules: MODULES, weapons: WEAPON_TYPES, save: save, defaultSave: defaultSave, activate: function(instance) { game = instance; } };\n";
const source = read("game.js").replace(exposureMarker, exposure + exposureMarker);
const bootstrap = {
  console, URLSearchParams,
  setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      if (file === "game.js") return source;
      return fs.readFileSync(path.isAbsolute(file) ? file : path.join(projectRoot, file), encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(initializationMarker)) + "\nglobalThis.runtime = sandbox;", bootstrap,
  { filename: "weapon-aim-runtime.js" });
const api = bootstrap.runtime.__aimTest;
const forward = -Math.PI / 2;
const fixedStep = 1 / 30;
const angleDifference = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const nearAngle = (actual, expected, message) => assert.ok(Math.abs(angleDifference(actual, expected)) < 1e-8,
  `${message}: expected ${expected}, received ${actual}`);

function makeGame(type = "cannon") {
  Object.assign(api.save, api.defaultSave());
  const game = new api.Game();
  api.activate(game);
  game.enemies.length = 0;
  game.enemyById.clear();
  game.enemyGrid.clear();
  game.ship.tiles.clear();
  const tile = api.makeTile(type, 0, -1, false);
  tile.cooldown = 0;
  game.ship.tiles.set("0,-1", tile);
  let shotCount = 0;
  api.audio.tone = () => { shotCount += 1; };
  return { game, tile, shots: () => shotCount };
}

function addTarget(game, x, y) {
  const enemy = game.spawnEnemy("scout", x, y);
  enemy.hp = 1000000000;
  game.rebuildEnemyGrid();
  return enemy;
}

function targetAngle(game, tile, target) {
  const origin = game.gridToWorld(tile.x, tile.y);
  return Math.atan2(target.y - origin.y, target.x - origin.x);
}

function glyphAngle(tile) {
  const rotations = [];
  api.ctx.rotate = angle => rotations.push(angle);
  api.drawGlyph(tile, 0, 0);
  assert.equal(rotations.length, 1, "A directional glyph must apply one local rotation");
  return rotations[0];
}

for (const type of api.weapons) {
  const { game, tile, shots } = makeGame(type);
  for (const hullAngle of [0, .7, Math.PI, 7 * Math.PI]) {
    game.ship.angle = hullAngle;
    game.updateWeapons(fixedStep);
    nearAngle(tile.aim, forward, `${type}: an idle weapon must remain forward relative to the hull`);
    if (type !== "pulse") nearAngle(glyphAngle(tile) + hullAngle, forward + hullAngle,
      `${type}: drawing must preserve the hull's world rotation`);
  }
  assert.equal(shots(), 0, `${type}: idle aiming must not cause a shot`);
  game.ship.angle = 2.3;
  const placed = api.makeTile(type, 1, 0, false);
  nearAngle(placed.aim, forward, `${type}: a newly placed weapon must align before its first update`);
  if (type !== "pulse") nearAngle(glyphAngle(placed) + game.ship.angle, forward + game.ship.angle,
    `${type}: new placement must use the current hull orientation`);
}

{
  const { game, tile, shots } = makeGame();
  const enemy = addTarget(game, 140, 0);
  const findTarget = game.findTarget;
  let targetQueries = 0;
  game.findTarget = function (...args) { targetQueries += 1; return findTarget.apply(this, args); };
  game.updateWeapons(0);
  assert.equal(shots(), 1);
  enemy.x = 60;
  enemy.y = -160;
  game.rebuildEnemyGrid();
  game.updateWeapons(fixedStep);
  assert.equal(shots(), 1, "Tracking between shots must preserve the active cooldown");
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, enemy), "A barrel must follow a moving target during cooldown");
  game.ship.angle = 1.4;
  game.updateWeapons(fixedStep);
  nearAngle(glyphAngle(tile) + game.ship.angle, targetAngle(game, tile, enemy),
    "A turning hull must not displace a barrel from its live target");
  assert.equal(shots(), 1);
  assert.equal(targetQueries, 1, "Following a live enemy during cooldown must not repeat the spatial target search");

  enemy.dead = true;
  tile.aim = Math.PI - .01;
  const initialAim = tile.aim;
  game.updateWeapons(fixedStep);
  assert.ok(angleDifference(tile.aim, initialAim) > 0, "Idle return must take the short path across the angle seam");
  assert.ok(Math.abs(angleDifference(forward, tile.aim)) < Math.abs(angleDifference(forward, initialAim)));
  assert.ok(Math.abs(angleDifference(tile.aim, initialAim)) < .6, "Idle return must be smooth, without an immediate snap");
  for (let step = 0; step < 90; step += 1) {
    game.ship.angle += .09;
    game.updateWeapons(fixedStep);
  }
  nearAngle(tile.aim, forward, "After losing a target the weapon must settle forward while the hull keeps turning");
  assert.equal(shots(), 1, "A dead cached target must never receive another shot");
}

{
  const { game, tile, shots } = makeGame();
  tile.cooldown = 2;
  const enemy = addTarget(game, -120, -30);
  game.updateWeapons(fixedStep);
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, enemy), "A new weapon must acquire aim during its initial cooldown");
  assert.equal(shots(), 0);
  enemy.x = 5000;
  const oldAim = tile.aim;
  game.rebuildEnemyGrid();
  game.updateWeapons(fixedStep);
  assert.ok(Math.abs(angleDifference(forward, tile.aim)) < Math.abs(angleDifference(forward, oldAim)),
    "A target leaving range must release visual aim");
  assert.equal(shots(), 0);
}

{
  const { game, tile, shots } = makeGame();
  const first = addTarget(game, 140, 0);
  game.updateWeapons(0);
  const closer = addTarget(game, -80, -30);
  tile.cooldown = 0;
  game.updateWeapons(0);
  const projectile = game.projectiles[game.projectiles.length - 1];
  nearAngle(Math.atan2(projectile.vy, projectile.vx), targetAngle(game, tile, closer),
    "Firing must reselect the current nearest target rather than reuse the visual target");
  assert.notEqual(first.id, closer.id);
  assert.equal(shots(), 2);
}

{
  const { game, tile, shots } = makeGame();
  const original = addTarget(game, 150, -30);
  game.updateWeapons(0);
  original.dead = true;
  game.compactEnemies();
  const recycled = addTarget(game, 180, -30);
  assert.equal(recycled, original, "The fixture must exercise actual enemy pool reuse");
  const closer = addTarget(game, -60, -30);
  game.updateWeapons(fixedStep);
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, closer),
    "A recycled enemy object must invalidate the old visual target and reacquire correctly");
  assert.equal(shots(), 1, "Reacquiring after pool reuse must not bypass cooldown");
}

{
  const { game, tile, shots } = makeGame("flak");
  tile.cooldown = 2;
  const enemy = addTarget(game, -80, -30);
  const hostile = game.spawnProjectile(false, "enemy", 150, 0, 0, 0, 1, 3, 4, "#fff");
  game.spawnProjectile(true, "cannon", 0, 0, 0, 0, 1, 3, 4, "#fff");
  game.updateWeapons(fixedStep);
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, hostile), "Flak must visually prioritize a hostile projectile during cooldown");
  hostile.x = 70;
  hostile.y = -160;
  game.updateWeapons(fixedStep);
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, hostile), "Flak must track a moving projectile between shots");
  hostile.life = 0;
  game.updateWeapons(fixedStep);
  nearAngle(tile.aim + game.ship.angle, targetAngle(game, tile, enemy), "Flak must fall back to enemies when the projectile expires");
  assert.equal(shots(), 0, "Flak tracking must not fire during cooldown");
}

// Recorded from the previous firing implementation: one ready shot, then 300 fixed updates.
const expectedShots = { cannon: 19, laser: 10, missile: 6, scatter: 13, arc: 9, rail: 4, flak: 9, pulse: 6, cryo: 9, mine: 5, ember: 14, gravity: 4 };
const cadence = {};
for (const type of api.weapons) {
  const { game, tile, shots } = makeGame(type);
  addTarget(game, 100, 0);
  game.updateWeapons(0);
  for (let step = 1; step <= 300; step += 1) { game.updateWeaponStatuses(fixedStep); game.updateWeapons(fixedStep); }
  cadence[type] = shots();
  assert.equal(cadence[type], expectedShots[type], `${type}: visual aiming must preserve the existing ten-second firing cadence`);
  if (type === "pulse") nearAngle(tile.aim, forward, "The radial Pulse glyph must not spin toward a target");
}

console.log(JSON.stringify({ ok: true, checks: "idle hull rotation, live tracking, short return, new placement, Flak priority, firing targets and cadence", cadence }, null, 2));
