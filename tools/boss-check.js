"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// Reuse the runtime harness DOM so this exercises the actual game closure.
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
assert.ok(harness.includes(marker), "Runtime harness initialization marker must exist.");
const source = fs.readFileSync("game.js", "utf8");
const exposureMarker = "    window.__driftBastion = {";
assert.ok(source.includes(exposureMarker), "Game test exposure marker must exist.");
const instrumented = ["progression.js", "run-upgrades.js"].filter((path) => fs.existsSync(path))
  .map((path) => fs.readFileSync(path, "utf8")).join("\n") + "\n" + source.replace(exposureMarker,
    "    window.__bossTest = { Game: Game, makeTile: makeTile, save: save };\n" + exposureMarker);
const initialization = harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;";
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
vm.runInNewContext(initialization, bootstrap, { filename: "boss-check-runtime.js" });
const { Game, makeTile, save } = bootstrap.runtime.__bossTest;
Object.keys(save.meta).forEach((key) => { save.meta[key] = 0; });
const game = new Game();
assert.equal(game.nextBossAt, 180, "Production first boss must be at three minutes.");
const originalEnemies = game.enemies.slice();
const hostile = { friendly: false, life: 4 };
const friendly = { friendly: true, life: 4 };
game.projectiles.push(hostile, friendly);
game.elapsed = 175;
const spawnsBeforeWarning = game.totalEnemiesSpawned;
game.ambientSpawnClock = 0;
game.assaultClock = 0;
game.updateSpawner(1 / 30);
assert.equal(game.bossWarningShown, true);
assert.ok(game.totalEnemiesSpawned > spawnsBeforeWarning, "The boss warning must retain a slower incoming stream.");
game.ambientSpawnClock = 10;
game.assaultClock = 10;
game.updateSpawner(1);
assert.equal(game.ambientSpawnClock, 9.5, "Warning must halve the incoming rate without stopping it.");
assert.equal(game.assaultClock, 9.5);
const crowdBeforeBoss = game.enemies.length;
game.elapsed = 180;
game.updateSpawner(1 / 30);
assert.equal(game.enemies.length, crowdBeforeBoss + 1, "The boss must join the existing swarm.");
assert.ok(originalEnemies.every((enemy) => !enemy.dead && game.enemyById.get(enemy.id) === enemy));
assert.equal(game.kills, 0, "Boss arrival must not award free kills.");
assert.equal(game.matter, 0, "Boss arrival must not award free Matter.");
assert.ok(game.projectiles.includes(friendly), "Boss arrival must preserve friendly projectiles.");
assert.equal(game.boss.maxHp, 850);
game.spawnBoss();
assert.equal(game.enemies.filter((enemy) => enemy.type === "boss" && !enemy.dead).length, 1, "A second boss must not overlap a live boss.");
game.ambientSpawnClock = 1;
game.assaultClock = 2;

game.projectiles.length = 0;
const bossShots = [];
const shoot = game.fireEnemyProjectile;
game.fireEnemyProjectile = function (...args) { bossShots.push(args); };
for (let frame = 0; frame < 30 * 20; frame += 1) {
  game.elapsed += 1 / 30;
  game.updateSpawner(1 / 30);
  game.updateBoss(game.boss, 1 / 30);
}
assert.ok(game.totalEnemiesSpawned > crowdBeforeBoss, "Boss fights must retain incoming ambient packs and directional groups.");
game.ambientSpawnClock = 10;
game.assaultClock = 10;
game.updateSpawner(1);
assert.equal(game.ambientSpawnClock, 9.4, "Boss fights must reduce the incoming rate to sixty percent without stopping it.");
assert.equal(game.assaultClock, 9.4);
assert.ok(bossShots.some((shot) => shot[5] === 320) && bossShots.some((shot) => shot[5] === 185),
  "First boss must alternate aimed pressure with slower radial volleys.");
assert.ok(bossShots.length < 90, "First boss projectile pressure must remain bounded.");
assert.ok(Math.hypot(game.boss.x, game.boss.y) < 250, "The boss must approach short-range weapons.");
game.fireEnemyProjectile = shoot;
const core = game.ship.tiles.get("0,0");
core.hp = core.maxHp * .2;
game.elapsed = 150;
game.killEnemy(game.boss);
assert.equal(game.finished, false, "A boss defeat must continue the run.");
assert.equal(game.state, "playing");
assert.equal(game.bossesDefeated, 1);
assert.equal(game.bossSpawned, false);
assert.equal(game.nextBossAt, 360);
assert.equal(game.recoveryUntil, 158);
assert.equal(game.matter, 45);
assert.equal(core.hp, core.maxHp * .32);
game.killEnemy(game.boss);
assert.equal(game.matter, 45, "Repeated death callbacks must not double-award rewards.");
assert.equal(game.bossesDefeated, 1);
game.elapsed = 157.99;
const spawnsBeforeRecovery = game.totalEnemiesSpawned;
game.updateSpawner(20);
assert.ok(game.totalEnemiesSpawned > spawnsBeforeRecovery, "Recovery must retain slower background arrivals.");
game.elapsed = 158;
game.ambientSpawnClock = 0;
const spawnsAfterRecovery = game.totalEnemiesSpawned;
game.updateSpawner(2);
assert.ok(game.totalEnemiesSpawned > spawnsAfterRecovery, "Normal incoming rates must resume after recovery.");
game.elapsed = 359;
game.updateSpawner(1 / 30);
assert.equal(game.bossSpawned, false, "Recurring boss must wait for its scheduled arrival.");
game.elapsed = 360;
game.updateSpawner(1 / 30);
assert.equal(game.boss.encounter, 2);
assert.equal(game.boss.maxHp, 4500);
assert.equal(game.enemies.filter((enemy) => enemy.type === "boss" && !enemy.dead).length, 1);
let lastBossHp = 850;
game.continued = true; // Exercise recurring encounters beyond the main three-boss route.
for (let encounter = 2; encounter <= 16; encounter += 1) {
  assert.equal(game.boss.encounter, encounter);
  assert.ok(game.boss.maxHp > lastBossHp && game.boss.maxHp < 100000000,
    "Boss health must keep progressing past encounter ten without numeric explosion.");
  lastBossHp = game.boss.maxHp;
  assert.equal(game.boss.variant, ["ring", "pursuer", "storm"][(encounter - 1) % 3]);
  assert.ok(game.boss.speed <= 120);
  assert.ok(game.boss.shotCount <= 18);
  assert.ok(game.boss.reward <= 120);
  game.killEnemy(game.boss);
  if (encounter === 16) break;
  game.elapsed = game.nextBossAt;
  game.updateSpawner(1 / 30);
  assert.equal(game.enemies.filter((enemy) => enemy.type === "boss" && !enemy.dead).length, 1);
}
assert.equal(game.bossesDefeated, 16);
assert.equal(game.finished, false);

const capacityProbe = new Game();
while (capacityProbe.enemies.length < 420) capacityProbe.spawnEnemy("drone", 900 + capacityProbe.enemies.length * 2, 0);
const crowdedIds = new Set(capacityProbe.enemies.map((enemy) => enemy.id));
const farthestEnemy = capacityProbe.enemies.reduce((farthest, enemy) =>
  Math.hypot(enemy.x, enemy.y) > Math.hypot(farthest.x, farthest.y) ? enemy : farthest);
capacityProbe.spawnBoss();
assert.equal(capacityProbe.enemies.length, 421, "A joining boss has one reserved slot above the ordinary enemy cap.");
assert.equal(capacityProbe.enemies.filter((enemy) => crowdedIds.has(enemy.id)).length, 420,
  "A full arena retains all ordinary enemies.");
assert.ok(capacityProbe.enemyById.has(farthestEnemy.id), "Boss arrival must preserve even the farthest living body.");
assert.equal(capacityProbe.kills, 0);
assert.equal(capacityProbe.matter, 0);

const chaseProbe = new Game();
chaseProbe.pendingBossAngle = Math.PI;
chaseProbe.spawnBoss();
chaseProbe.fireEnemyProjectile = function () {};
for (let frame = 0; frame < 30 * 20; frame += 1) {
  chaseProbe.ship.x += 230 / 30;
  chaseProbe.updateBoss(chaseProbe.boss, 1 / 30);
}
assert.ok(Math.hypot(chaseProbe.boss.x - chaseProbe.ship.x, chaseProbe.boss.y - chaseProbe.ship.y) < 400,
  "A baseline ship holding thrust must not leave the boss permanently outside cannon range.");

function cannonBenchmark(cannonCount) {
  const probe = new Game();
  // Isolate the boss's base weapon/damage balance; continuous crowd preservation is asserted above.
  probe.enemies.forEach((enemy) => { enemy.dead = true; });
  probe.compactEnemies();
  probe.ship.tiles.clear();
  probe.ship.tiles.set("0,0", makeTile("core", 0, 0, true));
  [[0, -1], [-1, 0], [1, 0]].slice(0, cannonCount).forEach(([x, y]) => {
    probe.ship.tiles.set(x + "," + y, makeTile("cannon", x, y, false));
  });
  probe.pendingBossAngle = -Math.PI / 2;
  probe.elapsed = 120;
  probe.spawnBoss();
  let frames = 0;
  while (!probe.boss.dead && !probe.finished && frames < 90 * 30) {
    probe.elapsed += 1 / 30;
    probe.updateEnemies(1 / 30);
    probe.updateProjectiles(1 / 30);
    probe.updateWeapons(1 / 30);
    probe.updateEffects(1 / 30);
    frames += 1;
  }
  return { cannons: cannonCount, elapsed: Number((frames / 30).toFixed(2)), bossKilled: probe.boss.dead,
    died: probe.finished, modulesRemaining: probe.ship.tiles.size, coreHp: Number(probe.ship.tiles.get("0,0").hp.toFixed(2)) };
}
const benchmarks = [cannonBenchmark(1), cannonBenchmark(3)];
assert.ok(benchmarks[0].died, "An idle, unprotected cannon must not trivialize the boss.");
assert.ok(benchmarks[1].bossKilled && benchmarks[1].elapsed < 30,
  "Three baseline cannons should defeat the first boss promptly, with real damage and module loss enabled.");
console.log(JSON.stringify({
  passed: true,
  encountersVerified: game.bossesDefeated,
  firstBossHp: 850,
  sixteenthBossHp: lastBossHp,
  firstArrival: 180,
  subsequentArrival: "210 seconds after defeat",
  extendedIntervalAfterKill: 210,
  recoverySeconds: 8,
  benchmarks,
  benchmarkLimit: "Isolated-boss fixture with a stationary forward-facing ship, no meta upgrades, real damage and death enabled. Incoming pressure and retained crowds are asserted separately above; this is not human playtest balance."
}, null, 2));
