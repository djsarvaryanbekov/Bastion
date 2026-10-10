"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourceRoot = process.env.HORDE_BASELINE_ROOT || ".";
const baseline = Boolean(process.env.HORDE_BASELINE_ROOT);

function runtime(seed) {
  const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
  const source = fs.readFileSync(path.join(sourceRoot, "game.js"), "utf8");
  const marker = "    window.__driftBastion = {";
  assert.equal(source.split(marker).length, 2);
  const instrumented = source.replace(marker, `
    window.__hordeTest = { Game, makeTile, save, MODULES, upgrades: runUpgrades,
      activate: function (value) { game = value; },
      input: function (thrust, turn) { keys.KeyW = thrust; keys.KeyA = turn < 0; keys.KeyD = turn > 0; } };
` + marker);
  const random = Object.create(Math);
  random.random = function () {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const bootstrap = {
    console, URLSearchParams, Math: random, setTimeout() { return 0; }, clearTimeout() {},
    process: { env: { BALANCE_SECONDS: "1" } },
    require(name) {
      if (name !== "fs") return require(name);
      return { ...fs, readFileSync(file, encoding) {
        if (file === "game.js") return instrumented;
        if (file === "run-upgrades.js") return fs.readFileSync(path.join(sourceRoot, file), encoding);
        return fs.readFileSync(file, encoding);
      } };
    }
  };
  vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
  return bootstrap.runtime.__hordeTest;
}

function screenshotShip(api, elapsed = 225, expanded = false) {
  api.save.campaign.selectedCore = "striker";
  const game = new api.Game();
  api.activate(game);
  game.ship.tiles.forEach((tile, key) => { if (key !== "0,0") game.ship.tiles.delete(key); });
  for (const type of ["cannon", "scatter", "shield"]) {
    for (const choice of ["base1", "base2"]) assert.ok(api.upgrades.purchase(game.upgrades, type, choice, 1e9, 1));
    game.weaponDefinitions[type] = api.upgrades.resolve(api.MODULES[type], game.upgrades[type]);
  }
  if (expanded) for (const [type, choices] of [["cannon", ["pierce", "pierce", "through"]], ["scatter", ["cone", "cone", "double"]]]) {
    const licenses = api.upgrades.trees[type].branches.map(branch => `${type}:${branch.id}`);
    for (const choice of choices) assert.ok(api.upgrades.purchase(game.upgrades, type, choice, 1e9, 1, undefined, licenses));
    game.weaponDefinitions[type] = api.upgrades.resolve(api.MODULES[type], game.upgrades[type]);
  }
  const layout = [
    ["shield", "scatter", "scatter", "shield", "cannon"],
    ["cannon", "cannon", "core", "cannon", "cannon"],
    ["cannon", "shield", "scatter", "scatter", "shield"]
  ];
  layout.forEach((row, y) => row.forEach((type, x) => {
    if (type === "core") return;
    const tile = api.makeTile(type, x - 2, y - 1, false);
    game.applyFamilyTileStats(tile, true);
    game.ship.tiles.set(`${tile.x},${tile.y}`, tile);
  }));
  if (expanded) for (const y of [-2, 2]) for (let x = -2; x <= 2; x++) {
    const tile = api.makeTile(y < 0 ? "cannon" : "scatter", x, y, false);
    game.applyFamilyTileStats(tile, true);
    game.ship.tiles.set(`${x},${y}`, tile);
  }
  game.enemies.forEach(enemy => { enemy.dead = true; });
  game.compactEnemies();
  game.elapsed = elapsed;
  game.bossesDefeated = elapsed < 480 ? 1 : 2;
  game.nextBossAt = Infinity;
  game.ambientSpawnClock = game.assaultClock = 0;
  return game;
}

function recovery(api) {
  const game = screenshotShip(api);
  const shield = game.ship.tiles.get("-2,-1");
  shield.shield = 0;
  shield.shieldDelay = game.weaponDefinitions.shield.rechargeDelay;
  const delay = shield.shieldDelay;
  game.updateShields(delay);
  assert.equal(shield.shield, 0, "No recharge occurs during the complete quiet-time delay.");
  game.updateShields(1);
  const perSecond = shield.shield;
  const fullRecovery = delay + shield.maxShield / perSecond;
  game.updateShields(100);
  assert.equal(shield.shield, 75, "The upgraded capacity stays at 75 per node.");
  if (!baseline) {
    assert.equal(delay, 6);
    assert.equal(perSecond, 4);
    assert.equal(fullRecovery, 24.75);
  }
  return { quietSeconds: delay, rechargePerSecond: perSecond, emptyToFullSeconds: fullRecovery };
}

function horde(seed, moving, startTime, expanded = false) {
  const api = runtime(seed);
  const game = screenshotShip(api, startTime, expanded);
  const initialModules = game.ship.tiles.size;
  let shieldAbsorbed = 0, hullDamage = 0, shieldBreaks = 0, movingFrames = 0, frames = 0, maxEnemies = 0;
  let moveUntil = 0;
  const applyDamage = game.applyDamageToTile;
  game.applyDamageToTile = function (key, amount) {
    const target = this.ship.tiles.get(key);
    if (!target || this.finished || !(amount > 0) || !Number.isFinite(amount)) return applyDamage.call(this, key, amount);
    const hp = target.hp;
    const charged = Array.from(this.ship.tiles.values()).filter(tile => tile.type === "shield" && tile.shield > 0);
    applyDamage.call(this, key, amount);
    shieldAbsorbed += this.lastShieldAbsorbed;
    hullDamage += hp - target.hp;
    shieldBreaks += charged.filter(tile => tile.shield <= 0).length;
  };
  while (!game.finished && game.elapsed < startTime + 120) {
    if (moving && game.elapsed >= moveUntil) {
      let closest = null, distance = 260;
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        const gap = Math.hypot(enemy.x - game.ship.x, enemy.y - game.ship.y);
        if (gap < distance) { closest = enemy; distance = gap; }
      }
      if (closest) {
        moveUntil = game.elapsed + 2;
      }
    }
    const thrust = moving && game.elapsed < moveUntil;
    api.input(thrust, 0);
    if (thrust) movingFrames++;
    game.update(1 / 30);
    frames++;
    maxEnemies = Math.max(maxEnemies, game.enemies.length);
    assert.ok(game.enemies.length <= 420 && game.projectiles.length <= 900);
    for (const tile of game.ship.tiles.values()) assert.ok(Number.isFinite(tile.hp) && tile.shield >= 0 && tile.shield <= tile.maxShield + 1e-8);
  }
  return { seed, startTime, initialModules, movement: moving ? "two-second forward thrust when an enemy enters 260 units" : "idle",
    seconds: Number((game.elapsed - startTime).toFixed(2)), died: game.finished,
    modulesLost: initialModules - game.ship.tiles.size, coreHp: Number(game.ship.tiles.get("0,0").hp.toFixed(2)),
    shieldAbsorbed: Number(shieldAbsorbed.toFixed(2)), hullDamage: Number(hullDamage.toFixed(2)), shieldBreaks,
    thrustPercent: Number((100 * movingFrames / frames).toFixed(1)), maxEnemies };
}

const api = runtime(7);
const bosses = [1, 3, 4, 5, 10].map(encounter => {
  api.save.campaign.selectedCore = "standard";
  const starter = new api.Game();
  starter.bossesDefeated = encounter - 1;
  starter.spawnBoss();
  const upgraded = screenshotShip(api);
  upgraded.elapsed = 100000;
  upgraded.bossesDefeated = encounter - 1;
  upgraded.spawnBoss();
  for (const stat of ["hp", "maxHp", "damage", "shotDamage"]) assert.equal(upgraded.boss[stat], starter.boss[stat],
    `Boss ${encounter} ${stat} must not depend on player upgrades, core, shield count or combat time.`);
  return { encounter, variant: starter.boss.variant, hp: starter.boss.maxHp };
});
const scenarios = [23, 71, 119].flatMap(seed => [
  horde(seed, false, 225), horde(seed, true, 225),
  horde(seed, false, 540), horde(seed, true, 540), horde(seed, true, 540, true)
]);
if (!baseline) {
  assert.ok(scenarios.filter(result => result.startTime === 225 && result.movement !== "idle")
    .every(result => !result.died && result.coreHp >= 315),
    "The early screenshot fleet using simple forward movement must retain a healthy core.");
  assert.ok(scenarios.filter(result => result.startTime === 540 && result.initialModules === 15 && result.movement !== "idle")
    .every(result => result.shieldBreaks > 0 || result.modulesLost > 0),
    "The unchanged screenshot fleet must face shield pressure approaching boss three, even with movement.");
}
console.log(JSON.stringify({ passed: true, baseline, recovery: recovery(api), bosses, scenarios,
  fixture: "15-tile screenshot layout: six Cannons, four Scatter Arrays, four Shield Nodes; base1/base2 upgrades, Striker Core, zero permanent ranks. Test at 3:45 and 9:00. The late 25-tile fixture adds ten weapons and grants licensed Through Fire Cannons and Double Blast Scatter upgrades. Full starting hull/shields, no purchases or bosses during each two-minute simulation; real keyboard movement, damage and destruction. These are controlled pressure comparisons, not a replay, an affordability proof or a human difficulty verdict." }, null, 2));
