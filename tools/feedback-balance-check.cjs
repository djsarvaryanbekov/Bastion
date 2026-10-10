"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = process.env.BALANCE_SOURCE || "game.js";
const baseline = Boolean(process.env.BALANCE_SOURCE);
const source = fs.readFileSync(sourcePath, "utf8");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
const instrumented = source.replace("    window.__driftBastion = {", `
    window.__feedbackTest = { Game: Game, makeTile: makeTile, modules: MODULES, save: save,
      upgrades: runUpgrades, activate: function (instance) { game = instance; } };
    window.__driftBastion = {`);
let seed = 43;
const random = Object.create(Math);
random.random = function () {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const bootstrap = {
  console, setTimeout, clearTimeout, URLSearchParams, Math: random,
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      return file === "game.js" ? instrumented : fs.readFileSync(file, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__feedbackTest;

function cleanGame(elapsed) {
  const game = new api.Game();
  game.enemies.length = 0;
  game.enemyById.clear();
  game.rebuildEnemyGrid();
  game.elapsed = elapsed;
  return game;
}

function upgrade(game, type, route) {
  const licenses = api.upgrades.trees[type].branches.map(branch => type + ":" + branch.id);
  for (const choice of route) {
    assert.ok(api.upgrades.purchase(game.upgrades, type, choice, 1e9, 1, undefined, licenses));
  }
  game.weaponDefinitions[type] = api.upgrades.resolve(api.modules[type], game.upgrades[type]);
}

function matureShip(game, weapon = "cannon") {
  const routes = {
    cannon: ["base1", "base2", "twin", "twin", "focus"],
    laser: ["base1", "base2", "lasting", "lasting", "burnthrough"],
    arc: ["base1", "base2", "chain", "chain", "fork"]
  };
  upgrade(game, weapon, routes[weapon]);
  upgrade(game, "shield", ["base1", "base2", "wide", "wide", "reserve"]);
  upgrade(game, "repair", ["base1", "base2", "emergency", "emergency"]);
  upgrade(game, "reactor", ["base1", "base2", "base3"]);
  upgrade(game, "armor", ["base1", "base2", "base3"]);
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      if (!x && !y) continue;
      const radius = Math.abs(x) + Math.abs(y);
      const type = Math.max(Math.abs(x), Math.abs(y)) === 3 ? "armor"
        : radius === 1 ? "shield"
        : (!x || !y) && radius === 2 ? "repair"
        : Math.abs(x) === 1 && Math.abs(y) === 1 ? "reactor" : weapon;
      const tile = api.makeTile(type, x, y, false);
      game.ship.tiles.set(x + "," + y, tile);
      game.applyFamilyTileStats(tile, true);
    }
  }
}

function simulate(game, seconds) {
  const start = game.elapsed;
  const initialModules = game.ship.tiles.size;
  let maxEnemies = 0;
  while (!game.finished && game.elapsed - start < seconds && !(game.boss && game.boss.dead)) {
    game.update(1 / 30);
    maxEnemies = Math.max(maxEnemies, game.enemies.length);
    assert.ok(game.enemies.length <= 420 && game.projectiles.length <= 900);
  }
  return { seconds: Number((game.elapsed - start).toFixed(2)), died: game.finished,
    bossKilled: Boolean(game.boss && game.boss.dead), modulesLost: initialModules - game.ship.tiles.size,
    coreHp: Number(game.ship.tiles.get("0,0").hp.toFixed(2)), maxEnemies };
}

const ordinaryStats = [0, 180, 600, 1200, 2400, 3600].map(time => {
  const game = cleanGame(time);
  const enemy = game.spawnEnemy("bulwark", 500, 0);
  return { time, hp: Number(enemy.hp.toFixed(2)), shield: Number(enemy.shield.toFixed(2)), damage: Number(enemy.damage.toFixed(2)), speed: enemy.speed };
});
const bosses = [180, 600, 1200].map((time, encounter) => {
  const game = cleanGame(time);
  matureShip(game);
  game.bossesDefeated = encounter;
  game.pendingBossAngle = -Math.PI / 2;
  game.spawnBoss();
  game.updateSpawner = function () {};
  const hp = game.boss.maxHp;
  return { time, hp, ...simulate(game, 120) };
});
const hordes = ["cannon", "laser", "arc"].map(weapon => {
  const idle = cleanGame(2400);
  matureShip(idle, weapon);
  idle.nextBossAt = Infinity;
  return { weapon, ...simulate(idle, 180) };
});

if (!baseline) {
  for (const stats of ordinaryStats) {
    for (const stat of ["hp", "shield", "damage", "speed"]) assert.equal(stats[stat], ordinaryStats[0][stat],
      `Ordinary enemy ${stat} must remain fixed at ${stats.time}s.`);
  }
  const training = new api.Game({ training: true });
  training.elapsed = 3600;
  assert.equal(training.spawnEnemy("bulwark", 500, 0).hp, ordinaryStats[0].hp, "Training and range use the same baseline enemies.");
  assert.deepEqual(bosses.map(boss => boss.hp), [3200, 16000, 42000],
    "The first three bosses keep their stronger encounter HP without a combat-time multiplier.");
  assert.ok(bosses[1].seconds > 10 && bosses[2].seconds > 10,
    "A mature upgraded fleet must face more than a few seconds of later boss combat.");
  for (const horde of hordes) assert.ok(horde.died || horde.modulesLost >= 10,
    "Mature idle " + horde.weapon + " fleets must take substantial losses to the late horde.");
}
console.log(JSON.stringify({ baseline, ordinaryStats, bosses, lateIdleHordes: hordes,
  fixture: "49-tile stationary fleets: 12 max-route Cannons/Lasers/Arcs, four Shields, four Repairs, four Reactors and 24 upgraded Armor tiles; zero permanent ranks. Bosses use Cannons isolated from the horde; horde excludes bosses. Real damage and destruction, bounded entity counts. Scripted fixtures do not establish human difficulty." }, null, 2));
