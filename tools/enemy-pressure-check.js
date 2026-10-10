"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function runtime(seed) {
  const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
  const marker = "let installPromptCalls";
  assert.ok(harness.includes(marker));
  const source = fs.readFileSync("game.js", "utf8");
  const exposure = "    window.__driftBastion = {";
  const instrumented = source.replace(exposure,
    "    window.__pressureTest = { Game: Game, makeTile: makeTile, save: save, modules: MODULES, price: modulePrice, create: function () { game = new Game(); return game; }, steer: function (move, turn) { keys.KeyW = move; keys.KeyD = turn; } };\n" + exposure);
  const seededMath = Object.create(Math);
  seededMath.random = function () { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bootstrap = {
    console, setTimeout, clearTimeout, URLSearchParams, Math: seededMath,
    process: { env: { BALANCE_SECONDS: "1" } },
    require(name) {
      if (name === "fs") return { ...fs, readFileSync(path, encoding) {
        return path === "game.js" ? instrumented : fs.readFileSync(path, encoding);
      } };
      return require(name);
    }
  };
  vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
  return bootstrap.runtime.__pressureTest;
}

function simulate(options) {
  const api = runtime(options.seed || 11);
  Object.keys(api.save.meta).forEach((key) => { api.save.meta[key] = 0; });
  const game = api.create();
  if (options.boss) {
    // These controlled boss fixtures jump directly to 120s; do not carry an unplayed opening into that jump.
    // The full-run scenarios retain every enemy and use ordinary spawning throughout.
    game.enemies.forEach((enemy) => { enemy.dead = true; });
    game.compactEnemies();
    game.ship.tiles.clear();
    game.ship.tiles.set("0,0", api.makeTile("core", 0, 0, true));
    [[0, -1], [-1, 0], [1, 0]].slice(0, options.cannons || 1).forEach(([x, y], index) => {
      const tile = api.makeTile("cannon", x, y, false);
      if (index === 0) { tile.hp *= 1.5; tile.maxHp *= 1.5; }
      game.ship.tiles.set(x + "," + y, tile);
    });
    game.elapsed = 120;
    game.bossesDefeated = (options.encounter || 1) - 1;
    game.pendingBossAngle = -Math.PI / 2;
    game.spawnBoss();
  }
  api.steer(options.moving || false, options.turning || false);
  const startTime = game.elapsed;
  const startingBosses = game.bossesDefeated;
  const startingHp = game.ship.tiles.get("0,0").hp;
  let modulesLost = 0;
  const firstBuildCost = api.price("cannon");
  let firstBuildMatterAt = null;
  let elapsed = 0;
  let previousModules = game.ship.tiles.size;
  while (!game.finished && elapsed < options.seconds && !(options.boss && game.boss.dead)) {
    game.update(1 / 30);
    if (firstBuildMatterAt === null && game.matter >= firstBuildCost) firstBuildMatterAt = Number((game.elapsed - startTime).toFixed(2));
    elapsed += 1 / 30;
    modulesLost += Math.max(0, previousModules - game.ship.tiles.size);
    previousModules = game.ship.tiles.size;
  }
  const core = game.ship.tiles.get("0,0");
  return {
    label: options.label,
    elapsed: Number((game.elapsed - startTime).toFixed(2)),
    died: game.finished,
    bossKilled: game.bossesDefeated > startingBosses,
    coreHp: Number(core.hp.toFixed(2)),
    startingHp,
    matter: Number(game.matter.toFixed(2)),
    firstBuildMatterAt, firstBuildCost,
    modulesLost,
    modulesRemaining: game.ship.tiles.size,
    kills: game.kills
  };
}

const results = [
  simulate({ label: "First build window, idle starter", seconds: 30 }),
  simulate({ label: "First build window, moving starter", seconds: 30, moving: true, turning: true }),
  simulate({ label: "First minute, idle starter", seconds: 60 }),
  simulate({ label: "Three minutes, idle starter", seconds: 180 }),
  simulate({ label: "Three minutes, moving starter", seconds: 180, moving: true, turning: true }),
  simulate({ label: "Three minutes, straight flight starter", seconds: 180, moving: true }),
  simulate({ label: "Eight minutes, straight flight starter", seconds: 480, moving: true }),
  simulate({ label: "First boss, idle single cannon", boss: true, cannons: 1, seconds: 90 }),
  simulate({ label: "First boss, moving single cannon", boss: true, cannons: 1, seconds: 90, moving: true, turning: true }),
  simulate({ label: "First boss, idle three cannons", boss: true, cannons: 3, seconds: 90 }),
  simulate({ label: "First boss, moving three cannons", boss: true, cannons: 3, seconds: 90, moving: true, turning: true }),
  simulate({ label: "First boss, straight flight three cannons", boss: true, cannons: 3, seconds: 90, moving: true }),
  simulate({ label: "Second boss, idle three cannons", boss: true, encounter: 2, cannons: 3, seconds: 90 }),
  simulate({ label: "Second boss, moving three cannons", boss: true, encounter: 2, cannons: 3, seconds: 90, moving: true, turning: true }),
  simulate({ label: "Third boss, idle three cannons", boss: true, encounter: 3, cannons: 3, seconds: 90 }),
  simulate({ label: "Third boss, moving three cannons", boss: true, encounter: 3, cannons: 3, seconds: 90, moving: true, turning: true })
];

const resultByName = Object.fromEntries(results.map((result) => [result.label, result]));
// Held thrust plus held turn traces a tight circle, not a collection policy.
// Keep reporting that scenario, while checking the opening budget with the stable idle fixture.
assert.ok(resultByName["First build window, idle starter"].firstBuildMatterAt <= 30 &&
  resultByName["First build window, idle starter"].firstBuildMatterAt >= 10,
  "The opening must fund a second cannon within thirty seconds without an immediate windfall.");
assert.ok(resultByName["First build window, idle starter"].matter >= resultByName["First build window, idle starter"].firstBuildCost,
  "Even the idle opening must supply an affordable second cannon by thirty seconds.");
assert.ok(resultByName["Three minutes, idle starter"].died, "Ignoring movement and investment must be dangerous.");
assert.ok(resultByName["Eight minutes, straight flight starter"].died, "Unchanged starter builds must not coast through endless waves indefinitely.");
assert.ok(resultByName["First boss, idle single cannon"].died, "The isolated boss must threaten an unprotected starter weapon.");
assert.ok(!resultByName["First boss, moving three cannons"].bossKilled || resultByName["First boss, moving three cannons"].elapsed >= 30,
  "An unupgraded starter should face a sustained first boss encounter.");
// Constant thrust plus turning is not a dodge policy; report its losses without
// assuming it beats every stationary formation. The locked-charge dodge is tested below.

const api = runtime(19);
function bossEmissionRate(age) {
  const game = api.create();
  game.bossSpawned = true; game.boss = { age: age, dead: false };
  game.ambientSpawnClock = 10; game.assaultClock = 10;
  game.updateSpawner(1);
  return 10 - game.ambientSpawnClock;
}
for (const [age, rate] of [[0, .6], [30, .6], [60, .6], [90, .6], [900, .6]]) {
  assert.ok(Math.abs(bossEmissionRate(age) - rate) < 1e-9,
    "Boss spawning remains at 60% throughout a prolonged fight");
}
const pressureProbe = api.create();
const freshDrone = pressureProbe.spawnEnemy("drone", 1000, 0);
pressureProbe.damageEnemy(freshDrone, api.modules.cannon.damage);
assert.ok(freshDrone.dead, "Opening drones must remain vulnerable to one baseline cannon shot.");
pressureProbe.bossesDefeated = 3;
pressureProbe.elapsed = 600;
const veteranDrone = pressureProbe.spawnEnemy("drone", 1000, 0);
pressureProbe.damageEnemy(veteranDrone, api.modules.cannon.damage);
assert.ok(veteranDrone.dead, "The same drone must stay vulnerable to one baseline shot later in the run.");
pressureProbe.bossesDefeated = 10000;
pressureProbe.elapsed = 1000000;
const lateDrone = pressureProbe.spawnEnemy("drone", 1000, 0);
assert.equal(lateDrone.maxHp, freshDrone.maxHp, "Ordinary health must remain fixed even in very long runs.");
assert.equal(lateDrone.damage, freshDrone.damage, "Ordinary damage must remain fixed even after many bosses.");
assert.ok(Number.isFinite(lateDrone.speed) && lateDrone.speed < 230, "Common swarm bodies must stay escapable by baseline movement.");

function createBoss(encounter) {
  const probe = api.create();
  probe.bossesDefeated = encounter - 1;
  probe.spawnBoss();
  probe.boss.x = -300;
  probe.boss.y = 0;
  probe.boss.vx = 0;
  probe.boss.vy = 0;
  probe.boss.fireClock = 0;
  return probe;
}

const chargeProbe = createBoss(2);
chargeProbe.boss.attackIndex = 0;
chargeProbe.updateBoss(chargeProbe.boss, 1 / 30);
assert.equal(chargeProbe.boss.attackPattern, "charge");
assert.ok(chargeProbe.boss.attackChargeMax >= 1, "A body-width charge needs a full-second dodge warning.");
const chargeDirection = [chargeProbe.boss.chargeAimX, chargeProbe.boss.chargeAimY];
const coreBeforeCharge = chargeProbe.ship.tiles.get("0,0").hp;
chargeProbe.ship.y = 160;
for (let frame = 0; frame < 120 && chargeProbe.boss.chargeTimer === 0; frame += 1) chargeProbe.updateBoss(chargeProbe.boss, 1 / 30);
assert.ok(chargeProbe.boss.chargeTimer > 0, "The advertised charge must actually release.");
const chargeStart = [chargeProbe.boss.x, chargeProbe.boss.y];
for (let frame = 0; frame < 120 && chargeProbe.boss.chargeTimer > 0; frame += 1) chargeProbe.updateBoss(chargeProbe.boss, 1 / 30);
assert.ok(Math.hypot(chargeProbe.boss.x - chargeStart[0], chargeProbe.boss.y - chargeStart[1]) <= 288.001,
  "The actual dash must not overshoot its previewed 288-unit corridor at frame boundaries.");
assert.deepEqual([chargeProbe.boss.chargeAimX, chargeProbe.boss.chargeAimY], chargeDirection,
  "The charge must not track the player after its telegraph locks.");
assert.equal(chargeProbe.ship.tiles.get("0,0").hp, coreBeforeCharge,
  "Leaving the previewed corridor must avoid the charge damage.");
assert.equal(chargeProbe.projectiles.length, 0, "A charge must not hide an untelegraphed projectile volley.");
assert.ok(chargeProbe.boss.chargeTimer === 0, "The dash must end within its bounded duration.");

const stormProbe = createBoss(3);
stormProbe.updateBoss(stormProbe.boss, 1 / 30);
assert.equal(stormProbe.boss.variant, "storm");
assert.equal(stormProbe.boss.attackPattern, "radial");
const previewAngle = stormProbe.boss.volleyAngle;
for (let frame = 0; frame < 31; frame += 1) stormProbe.updateBoss(stormProbe.boss, 1 / 30);
assert.equal(stormProbe.boss.volleyAngle, previewAngle, "Storm lanes must keep their previewed angles through release.");
assert.equal(stormProbe.projectiles.length, stormProbe.boss.shotCount - 3, "Storm must leave a three-slot escape gap.");
stormProbe.projectiles.forEach((projectile) => {
  const angle = Math.atan2(projectile.vy, projectile.vx) - previewAngle;
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  assert.ok(Math.abs(wrapped) > 2 * Math.PI / stormProbe.boss.shotCount,
    "No Storm projectile may fill the previewed escape gap.");
  assert.ok(Number.isFinite(projectile.damage) && Number.isFinite(projectile.vx) && Number.isFinite(projectile.vy));
});
const lateBoss = createBoss(10001).boss;
assert.ok(Number.isFinite(lateBoss.hp) && lateBoss.hp <= 100000000);
assert.ok(lateBoss.shotCount <= 18 && lateBoss.shotDamage <= 72 && lateBoss.speed <= 120);

// Every ordinary type, including heavies, must preserve its stats across run progress.
const staticProbe = api.create();
const enemyTypes = ["drone", "scout", "hunter", "orbiter", "brute", "bolter", "gunner", "bulwark", "splitter", "mini", "raptor", "sniper", "bomber", "colossus"];
function spawnStats(type) {
  const enemy = staticProbe.spawnEnemy(type, 1000, 0);
  const stats = [enemy.hp, enemy.maxHp, enemy.damage, enemy.speed, enemy.shield, enemy.maxShield, enemy.radius, enemy.reward];
  enemy.dead = true;
  staticProbe.compactEnemies();
  return stats;
}
const initialStats = Object.fromEntries(enemyTypes.map(type => [type, spawnStats(type)]));
for (const time of [0, 120, 330, 600, 900, 1800, 3600, 1000000]) {
  staticProbe.elapsed = time;
  for (const kills of [0, 3, 10000]) {
    staticProbe.bossesDefeated = kills;
    for (const type of enemyTypes) {
      const stats = spawnStats(type), initial = initialStats[type];
      assert.deepEqual(stats, initial, `${type}: HP, damage, shields, speed, radius and payout must remain fixed at ${time}s after ${kills} bosses`);
    }
  }
}

const phaseProbe = createBoss(2);
phaseProbe.boss.x = -450;
phaseProbe.updateBoss(phaseProbe.boss, 1 / 30);
assert.equal(phaseProbe.boss.attackPattern, "aimed", "A distant target needs a ranged attack, not an unreachable dash.");
phaseProbe.boss.x = -250;
phaseProbe.boss.hp = phaseProbe.boss.maxHp * .49;
for (const [attackIndex, pattern] of [[0, "charge"], [1, "charge"], [2, "aimed"]]) {
  phaseProbe.boss.attackIndex = attackIndex;
  phaseProbe.boss.attackCharge = 0;
  phaseProbe.boss.fireClock = 0;
  phaseProbe.updateBoss(phaseProbe.boss, 1 / 30);
  assert.equal(phaseProbe.boss.attackPattern, pattern);
  assert.equal(phaseProbe.boss.combatPhase, 2);
}
stormProbe.boss.hp = stormProbe.boss.maxHp * .49;
stormProbe.boss.attackCharge = 0;
stormProbe.boss.fireClock = 0;
stormProbe.updateBoss(stormProbe.boss, 1 / 30);
assert.ok(Math.abs(stormProbe.boss.volleyAngle - previewAngle - Math.PI / 3) < 1e-9);
assert.equal(stormProbe.boss.attackChargeMax, 1.25);
const origin = [stormProbe.boss.x, stormProbe.boss.y];
stormProbe.ship.y += 200;
stormProbe.updateBoss(stormProbe.boss, .5);
assert.deepEqual([stormProbe.boss.x, stormProbe.boss.y], origin, "Telegraph origin must stay fixed after player movement.");

console.log(JSON.stringify({ passed: true, results, damageOverride: false,
  verified: ["Opening lethality", "Scripted steering outcomes reported", "Fixed ordinary enemy stats", "Bounded boss scaling", "Locked and avoidable charge corridor", "Storm telegraph and escape gap"],
  limits: "Deterministic scripted steering, no purchases or meta upgrades. Controlled boss fixtures clear the unplayed opening before jumping to120s, then retain real damage and ongoing arrivals. Full-run scenarios retain all enemies. This does not replace human playtesting." }, null, 2));
