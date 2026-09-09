"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
const exposure = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8");
assert.ok(harness.includes(marker) && source.includes(exposure));
const instrumented = source.replace(exposure,
  "    window.__newWeaponTest = { Game: Game, makeTile: makeTile, modules: MODULES, upgrades: runUpgrades, save: save, defaultSave: defaultSave, drawGravityFields: drawGravityFields, ctx: ctx, activate: function (instance) { game = instance; } };\n" + exposure);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(path, encoding) {
      return path === "game.js" ? instrumented : fs.readFileSync(path, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__newWeaponTest;
const origin = { x: 0, y: 0 };
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} versus ${expected}`);
function fixture() {
  Object.assign(api.save, api.defaultSave());
  const game = new api.Game();
  api.activate(game);
  game.operation = null;
  game.enemies.length = 0;
  game.enemyById.clear();
  game.rebuildEnemyGrid();
  return game;
}
function tick(game, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 1 / 30) {
    game.updateWeaponStatuses(Math.min(1 / 30, seconds - elapsed));
  }
}

{
  const game = fixture();
  const inside = game.spawnEnemy("colossus", 100, 0);
  const side = game.spawnEnemy("brute", 90, 50);
  const outside = game.spawnEnemy("brute", 40, 120);
  const behind = game.spawnEnemy("brute", -80, 0);
  const distant = game.spawnEnemy("brute", 195, 0);
  game.rebuildEnemyGrid();
  game.fireEmberCone(origin, 1, 0, api.modules.ember, 1);
  close(inside.hp, 162, "Ember direct damage");
  close(side.hp, 54, "Cone hits a second enemy");
  for (const missed of [outside, behind, distant]) close(missed.hp, 62, "Cone respects angle and range");
  tick(game, 1);
  game.fireEmberCone(origin, 1, 0, api.modules.ember, 1);
  close(inside.burnDamage, 6, "Refreshing does not stack burn DPS");
  close(inside.burnTimer, 2.5, "Refreshing restores full burn time");
  tick(game, 2.5);
  close(inside.hp, 133, "Two direct hits plus 3.5 seconds of burn damage");
  close(inside.burnTimer, 0, "Burn expires");
  close(inside.burnDamage, 0, "Expired burn clears damage");
  const hp = inside.hp;
  tick(game, 2);
  close(inside.hp, hp, "Expired burn cannot keep damaging");
}

{
  const game = fixture();
  const enemy = game.spawnEnemy("drone", 100, 0);
  game.rebuildEnemyGrid();
  game.fireEmberCone(origin, 1, 0, api.modules.ember, 1);
  tick(game, .3);
  assert.ok(enemy.dead && game.kills === 1 && game.matter > 0, "Burn uses real death and rewards");
  game.compactEnemies();
  const recycled = game.spawnEnemy("colossus", 100, 0);
  assert.equal(recycled, enemy, "Fixture exercises actual object pool reuse");
  assert.equal(recycled.burnTimer, 0);
  assert.equal(recycled.burnDamage, 0);
  assert.equal(recycled.burnTickTime, 0);
  tick(game, 2);
  close(recycled.hp, 170, "New pooled enemy inherits no damage over time");
}

{
  const game = fixture();
  game.spawnBoss();
  // Add an ordinary target to compare pull against a boss in this isolated fixture.
  const ordinary = game.spawnEnemy("colossus", 1080, 0);
  const boss = game.boss;
  boss.x = 1080; boss.y = 0;
  const tile = api.makeTile("gravity", 0, -1, false);
  game.placeGravityField(tile, origin, { x: 1000, y: 0 }, api.modules.gravity, 1);
  game.updateWeaponStatuses(.1);
  close(ordinary.x, 1070, "Ordinary pull moves ten pixels in 0.1 seconds");
  close(boss.x, 1080, "Gravity cannot displace a boss");
  boss.chargeTimer = .8;
  game.updateWeaponStatuses(.1);
  close(boss.x, 1080, "Gravity does not displace a telegraphed boss charge");
  game.placeGravityField({}, origin, { x: 1000, y: 0 }, api.modules.gravity, 1);
  const before = ordinary.x;
  game.updateWeaponStatuses(.1);
  close(before - ordinary.x, 10, "Two fields do not stack pull strength");
  game.placeGravityField(tile, origin, { x: 990, y: 0 }, api.modules.gravity, 1);
  assert.equal(game.gravityFields.length, 2, "Refiring one emitter replaces its existing field");
}

// Impacts must still damage bosses without changing their movement.
for (const kind of ["cannon", "rail", "missile", "cryo"]) {
  const game = fixture();
  game.spawnBoss();
  const boss = game.boss;
  boss.x = 1000; boss.y = 0; boss.vx = 12; boss.vy = -8;
  game.rebuildEnemyGrid();
  const beforeHp = boss.hp;
  game.spawnProjectile(true, kind, boss.x, boss.y, 900, 0, 10, 4, 2, "#fff", boss.id, .7, 2);
  game.updateProjectiles(0);
  assert.ok(boss.hp < beforeHp, `${kind}: damage must still apply`);
  assert.deepEqual([boss.x, boss.y, boss.vx, boss.vy], [1000, 0, 12, -8], `${kind}: no boss displacement or impulse`);
}
for (const bossFirst of [true, false]) {
  const game = fixture();
  let ordinary;
  if (!bossFirst) ordinary = game.spawnEnemy("colossus", 1000, 0);
  game.spawnBoss();
  if (bossFirst) ordinary = game.spawnEnemy("colossus", 1000, 0);
  game.boss.x = 1000; game.boss.y = 0;
  game.rebuildEnemyGrid();
  game.resolveEnemyOverlaps();
  assert.deepEqual([game.boss.x, game.boss.y], [1000, 0], "Crowd separation must leave the boss fixed in either ID order");
  assert.ok(Math.hypot(ordinary.x - 1000, ordinary.y) > 1, "The ordinary enemy yields around the boss");
}
{
  const game = fixture();
  const enemy = game.spawnEnemy("colossus", 1000, 0);
  game.rebuildEnemyGrid();
  game.spawnProjectile(true, "rail", 1000, 0, 900, 0, 10, 4, 2, "#fff");
  game.updateProjectiles(0);
  close(enemy.vx, 125, "Rail knockback still applies to ordinary enemies");
}

const qualityResults = [];
for (const quality of [0, 1, 2]) {
  const game = fixture();
  api.save.settings.qualityTier = quality;
  const target = game.spawnEnemy("colossus", 100, 0);
  game.rebuildEnemyGrid();
  game.fireEmberCone(origin, 1, 0, api.modules.ember, 1);
  game.placeGravityField({}, origin, target, api.modules.gravity, 1);
  for (let effect = 0; effect < 300; effect += 1) game.spawnEffect("ring", 0, 0, .05, "#fff");
  game.updateEffects(10);
  assert.equal(game.effects.length, 0);
  close(target.hp, 162, "VFX updates cannot apply damage");
  close(target.burnTimer, 2.5, "VFX updates cannot expire burning");
  close(game.gravityFields[0].life, 2, "VFX updates cannot expire fields");
  const strokes = [];
  api.ctx.stroke = () => strokes.push(api.ctx.strokeStyle);
  api.drawGravityFields();
  assert.ok(strokes.includes(api.modules.gravity.color), "Gameplay field remains visible when VFX are cleared");
  tick(game, 3);
  close(target.hp, 135, "Field lifetime and burn apply exact bounded damage");
  assert.equal(game.gravityFields.length, 0, "Expired fields are removed");
  qualityResults.push(target.hp);
}
assert.equal(new Set(qualityResults).size, 1, "All quality levels give identical gameplay");

{
  const game = fixture();
  const tile = api.makeTile("gravity", 0, -1, false);
  const resolved = api.upgrades.resolve(api.modules.gravity, { level: 9, branch: "well" });
  game.placeGravityField(tile, origin, { x: 100, y: 0 }, resolved, 1);
  close(game.gravityFields[0].radius, resolved.fieldRadius, "Live field reads resolved Lv10 branch radius");
  close(game.gravityFields[0].damage, resolved.damage, "Live field reads resolved damage");
  close(game.gravityFields[0].maxLife, resolved.fieldDuration, "Live field reads resolved duration");
}

for (const type of ["ember", "gravity"]) {
  const game = fixture();
  game.ship.tiles.clear();
  game.ship.tiles.set("0,0", api.makeTile("core", 0, 0, true));
  const tile = api.makeTile(type, 0, -1, false);
  tile.cooldown = 0;
  game.ship.tiles.set("0,-1", tile);
  const enemy = game.spawnEnemy("colossus", 110, -42);
  game.rebuildEnemyGrid();
  game.update(1 / 30);
  assert.ok(type === "ember" ? enemy.burnTimer > 0 : game.gravityFields.length === 1, `${type}: normal game update fires weapon`);
  const hp = enemy.hp;
  for (let step = 0; step < 15; step += 1) game.update(1 / 30);
  assert.ok(enemy.hp < hp, `${type}: periodic damage runs in real gameplay update`);
  game.state = "building";
  const life = type === "ember" ? enemy.burnTimer : game.gravityFields[0].life;
  game.update(1);
  close(type === "ember" ? enemy.burnTimer : game.gravityFields[0].life, life, "Build pause freezes periodic gameplay");
}

console.log(JSON.stringify({ ok: true, checks: "cone bounds, real burn kills, refresh without stacks, pooled reset, boss pull resistance, charge immunity, capped overlap, exact lifetimes, quality independence, resolved upgrades, full update and pause", qualityResults }, null, 2));
