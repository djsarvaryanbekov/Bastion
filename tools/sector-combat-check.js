"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");

function runtime(seed) {
  const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
  const marker = "let installPromptCalls";
  assert.ok(harness.includes(marker));
  const source = fs.readFileSync("game.js", "utf8");
  const exposure = "    window.__driftBastion = {";
  assert.ok(source.includes(exposure));
  const instrumented = source.replace(exposure,
    "    window.__survivalPressureTest = { create: function () { game = new Game(); return game; }, phases: ENEMY_PHASES };\n" + exposure);
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
  return bootstrap.runtime.__survivalPressureTest;
}

function clearEnemies(game) {
  game.enemies.forEach((enemy) => { enemy.dead = true; });
  game.compactEnemies();
}

function spawnFrontCycle(game, cycleIndex) {
  game.assaultGroupIndex = 0;
  game.assaultIndex = cycleIndex;
  const directions = game.currentEnemyPhase().directions;
  for (let group = 0; group < directions; group += 1) {
    const before = game.enemies.length;
    assert.equal(game.spawnAssaultWave(false), true);
    assert.ok(game.enemies.length - before <= Math.ceil((game.currentEnemyPhase().squadSize + game.endlessPressureStep() * 2) * 1.2),
      "An individual emission must contain one group, never the complete surrounding front.");
  }
}

const heavyTypes = ["brute", "bulwark", "colossus"];
const rangedTypes = ["bolter", "gunner", "sniper"];
function countTypes(counts, types) { return types.reduce((sum, type) => sum + (counts[type] || 0), 0); }

function sample(elapsed, legacyRule) {
  const api = runtime(71);
  const game = api.create();
  game.elapsed = elapsed;
  if (legacyRule) game.operation = { rule: legacyRule, sectorIndex: 4 };
  const phase = game.currentEnemyPhase();
  const counts = {};
  let total = 0;
  let assaultSize = 0;
  let ambientSize = 0;
  for (let batch = 0; batch < 512; batch += 1) {
    clearEnemies(game);
    spawnFrontCycle(game, 2);
    assaultSize = game.enemies.length;
    game.spawnAmbientPack();
    ambientSize = game.enemies.length - assaultSize;
    game.enemies.forEach((enemy) => {
      assert.ok(Number.isFinite(enemy.hp) && Number.isFinite(enemy.damage));
      assert.ok(Math.abs(enemy.x) > 640 || Math.abs(enemy.y) > 360,
        "Every member of a wide front must start beyond the visible play area.");
      counts[enemy.type] = (counts[enemy.type] || 0) + 1;
      total += 1;
    });
  }
  clearEnemies(game);
  spawnFrontCycle(game, 3);
  const surgeSize = game.enemies.length;
  const endlessStep = game.endlessPressureStep();
  const assaultInterval = Math.max(10, phase.assaultInterval - endlessStep * .4);
  const ambientInterval = Math.max(1.6, phase.ambientInterval - endlessStep * .1);
  const lullClockLoss = 0;
  const cycleSeconds = assaultInterval * 3 + lullClockLoss;
  return { elapsed, phase: phase.level, assaultSize, ambientSize,
    nominalBodiesPerMinute: Number((60 * ((assaultSize * 2 + surgeSize) / cycleSeconds + ambientSize / ambientInterval * (cycleSeconds - lullClockLoss) / cycleSeconds)).toFixed(1)),
    heavyShare: Number((countTypes(counts, heavyTypes) / total).toFixed(3)),
    lightShare: Number((countTypes(counts, ["drone", "scout"]) / total).toFixed(3)),
    total, counts };
}

const samples = [0, 40, 90, 150, 225, 300, 390, 480, 540, 720, 1200].map((elapsed) => sample(elapsed));
for (let index = 1; index < samples.length; index += 1) {
  assert.ok(samples[index].nominalBodiesPerMinute > samples[index - 1].nominalBodiesPerMinute,
    "Unopposed spawn supply must keep developing through ten minutes and bounded continuation.");
}
assert.equal(countTypes(samples[0].counts, heavyTypes.concat(rangedTypes)), 0);
assert.equal(countTypes(samples[1].counts, heavyTypes.concat(rangedTypes)), 0);
assert.ok(samples[2].counts.brute > 0, "Large bodies must enter as groups after the opening build window.");
assert.equal(samples[2].counts.bulwark || 0, 0, "The first heavy group must teach the unshielded body before Bulwarks enter.");
assert.ok(samples[3].counts.bulwark > 0);
assert.ok(samples[6].counts.colossus > 0);
assert.equal(samples[6].counts.sniper || 0, 0, "Snipers must not join the ordinary fronts before the late run.");
assert.ok(samples[7].counts.sniper > 0);
assert.ok(samples[8].assaultSize >= 80 && samples[8].ambientSize >= 10,
  "Late pressure needs visibly larger groups and ambient packs than the old forty/four caps.");
assert.ok(samples[8].lightShare >= .45 && samples[8].heavyShare >= .25,
  "Late crowds must retain disposable swarm bodies alongside substantial heavy groups.");
for (const rule of ["standard", "swarm", "crossfire", "armored", "volatile"]) {
  assert.deepEqual(sample(480, rule).counts, samples[7].counts,
    "Legacy operation selections must not change the new continuous run's enemy composition.");
}

const api = runtime(83);
const game = api.create();
// Heavy fronts acquire one ranged escort near the third-boss stretch, retaining their body formation.
for (const [time, escorts] of [[225, 0], [480, 1], [1200, 1]]) {
  clearEnemies(game);
  game.elapsed = time;
  game.assaultPhaseLevel = game.currentEnemyPhase().level;
  game.assaultGroupIndex = 1;
  game.assaultIndex = 2;
  game.spawnAssaultWave(false);
  assert.equal(game.enemies.filter(enemy => rangedTypes.includes(enemy.type)).length, escorts);
  assert.equal(game.enemies.filter(enemy => heavyTypes.includes(enemy.type)).length, game.enemies.length - escorts,
    "A heavy front must remain heavy bodies with a limited ranged escort.");
}
for (const zoom of [.35, .8, 1, 1.8]) {
  game.camera.zoom = zoom;
  game.elapsed = 1200;
  for (let pack = 0; pack < 128; pack += 1) {
    clearEnemies(game);
    game.spawnAmbientPack();
    game.enemies.forEach((enemy) => assert.ok(Math.abs(enemy.x) > 640 / zoom || Math.abs(enemy.y) > 360 / zoom,
      "Wide ambient packs must remain offscreen at viewport corners and every supported camera zoom."));
  }
}
// Groups share a compact origin, while origins vary around the viewport.
const sectors = new Set();
game.camera.zoom = 1;
game.camera.x = 160; game.camera.y = -90;
game.elapsed = 150;
for (let emission = 0; emission < 64; emission++) {
  clearEnemies(game);
  game.spawnAssaultWave(false);
  assert.ok(game.enemies.length >= 4, "Spawn a group rather than scattered single bodies");
  const center = game.enemies.reduce((p, e) => ({x:p.x+e.x/game.enemies.length,y:p.y+e.y/game.enemies.length}), {x:0,y:0});
  const heading = Math.atan2(center.y-game.camera.y, center.x-game.camera.x);
  sectors.add(Math.floor((heading+Math.PI)/(Math.PI/4)));
  for (const enemy of game.enemies) {
    assert.ok(Math.abs(enemy.x-game.camera.x)>640+enemy.radius || Math.abs(enemy.y-game.camera.y)>360+enemy.radius, "New groups stay outside the actual camera viewport");
    assert.ok(Math.hypot(enemy.x-center.x, enemy.y-center.y)<600, "Formation members stay clustered around a shared origin");
  }
}
assert.ok(sectors.size >= 7, "Group origins vary around the viewport instead of following fixed compass sectors");
clearEnemies(game);
const straggler = game.spawnEnemy("drone", 100000, -100000);
const oldHp = straggler.hp;
game.nextBossAt = Infinity; game.ambientSpawnClock = 999; game.assaultClock = 999;
game.updateSpawner(1);
assert.deepEqual([straggler.x,straggler.y,straggler.hp], [100000,-100000,oldHp], "Leaving the screen must never teleport or replace an existing enemy");
game.camera.x = 0; game.camera.y = 0;

game.camera.zoom = 1;
game.elapsed = 480;
game.nextBossAt = Infinity;
clearEnemies(game);
spawnFrontCycle(game, 3);
const surgeSize = game.enemies.length;
assert.ok(surgeSize > samples[7].assaultSize, "Every third assault must be a distinct surge.");
game.ambientSpawnClock = 0;
game.assaultClock = 999;
const surgeSpawns = game.totalEnemiesSpawned;
game.elapsed += 3;
game.updateSpawner(3);
assert.ok(game.totalEnemiesSpawned > surgeSpawns, "Ambient arrivals must continue after a surge.");
game.ambientSpawnClock = 10;
game.assaultClock = 10;
game.updateSpawner(1);
assert.equal(game.ambientSpawnClock, 9, "Surges cannot insert an extra slowdown between groups.");
assert.equal(game.assaultClock, 9, "The next group stays on schedule after a surge.");
game.elapsed += 3;
game.ambientSpawnClock = 10;
game.updateSpawner(1);
assert.equal(game.ambientSpawnClock, 9, "Ordinary rates must resume after the softer lull.");

const cadenceProbe = api.create();
cadenceProbe.elapsed = 480;
cadenceProbe.nextBossAt = Infinity;
cadenceProbe.assaultClock = 0;
cadenceProbe.ambientSpawnClock = 0;
let longestEmissionGap = 0;
let lastEmissionAt = cadenceProbe.elapsed;
for (let frame = 0; frame < 30 * 90; frame += 1) {
  clearEnemies(cadenceProbe);
  const before = cadenceProbe.totalEnemiesSpawned;
  cadenceProbe.elapsed += 1 / 30;
  cadenceProbe.updateSpawner(1 / 30);
  if (cadenceProbe.totalEnemiesSpawned > before) {
    longestEmissionGap = Math.max(longestEmissionGap, cadenceProbe.elapsed - lastEmissionAt);
    lastEmissionAt = cadenceProbe.elapsed;
  }
}
assert.ok(longestEmissionGap < 4.2, "Grouped arrivals must keep overlapping in the late run.");

clearEnemies(game);
game.elapsed = 1000000;
assert.equal(game.endlessPressureStep(), 10, "Endless quantity scaling must have a finite ceiling.");
for (let wave = 0; wave < 100; wave += 1) {
  game.spawnAssaultWave(false);
  game.spawnAmbientPack();
  assert.ok(game.enemies.length <= 420 && game.enemyById.size <= 420);
}
assert.equal(game.enemies.length, 420, "Partial ambient packs must use spare capacity instead of stalling below the budget.");
const stressStartBodies = game.enemies.length;
const capSpawns = game.totalEnemiesSpawned;
assert.equal(game.spawnAssaultWave(false), false);
game.spawnAmbientPack();
assert.equal(game.totalEnemiesSpawned, capSpawns, "Neither pressure layer may spawn beyond the shared cap.");

// This isolates the actual enemy/spatial update cost; the canvas harness does not measure GPU or rendering.
const updateTimes = [];
for (let frame = 0; frame < 90; frame += 1) {
  const start = performance.now();
  game.updateEnemies(1 / 30);
  updateTimes.push(performance.now() - start);
  assert.ok(game.enemies.length <= 420 && game.projectiles.length <= 900);
  assert.ok(game.enemyGridBucketCount <= 420, "Spatial bucket use must remain bounded by active bodies.");
  game.enemies.forEach((enemy) => {
    assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y) && Number.isFinite(enemy.hp));
  });
}
updateTimes.sort((left, right) => left - right);
console.log(JSON.stringify({ passed: true, samples: samples.map(({ counts, total, ...summary }) => summary),
  surgeSize, activeEnemyCap: 420, stressStartBodies, stressEndBodies: game.enemies.length,
  longestLateEmissionGapSeconds: Number(longestEmissionGap.toFixed(2)),
  enemyUpdateCpuMs: { p50: Number(updateTimes[45].toFixed(2)), p95: Number(updateTimes[85].toFixed(2)) },
  limits: "Nominal supply excludes bosses, kills and cap saturation. CPU timings isolate enemy updates in a Node VM; they are not browser frame times or human balance validation. No damage override." }, null, 2));
