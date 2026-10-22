"use strict";

// Wave table rules plus the in-game director: timer, clearing, intermission, cards, boss waves, win and endless.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Waves = require("../waves");

// Table rules.
assert.equal(Waves.WAVE_COUNT, 20);
for (let wave = 1; wave <= 20; wave += 1) {
  const def = Waves.get(wave);
  const boss = [5, 10, 15].includes(wave) ? "mini" : wave === 20 ? "final" : null;
  assert.equal(def.boss, boss, "Boss waves sit at 5/10/15/20");
  assert.equal(def.duration === null, Boolean(boss), "Only boss waves are untimed");
  if (wave > 1) assert.ok(def.pressureAt > Waves.get(wave - 1).pressureAt, "Pressure rises every wave");
}
assert.ok(Waves.isFinalWave(20) && !Waves.isFinalWave(25));
assert.equal(Waves.get(25).boss, "mini", "Endless keeps a boss every five waves");
assert.equal(Waves.get(21).duration, 60);
assert.ok(Waves.get(21).pressureAt > Waves.get(20).pressureAt);
assert.equal(Waves.pressureTime(1, 0), 0);
assert.ok(Waves.pressureTime(1, 30) > 0 && Waves.pressureTime(1, 30) < Waves.get(2).pressureAt, "In-wave ramp stays below the next wave");
assert.equal(Waves.pressureTime(5, 999), Waves.get(5).pressureAt, "Boss waves hold pressure");

// Director inside the real game.
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker,
  "    window.__wavesTest = { Game, save, ui, MODULES, defaultSave, startRun, continueSurvival, startNextWave, openBuild, closeBuild, current: function () { return game; }, activate: function (value) { game = value; } };\n" + marker);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) { return file === "game.js" ? source : fs.readFileSync(file, encoding); } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__wavesTest;
const STEP = 1 / 30;
const reset = () => { api.activate(null); Object.assign(api.save, api.defaultSave()); };
const tick = (game, seconds) => {
  for (let i = 0; i < Math.ceil(seconds / STEP) && game.state === "playing" && !game.finished; i += 1) game.update(STEP);
};
const keepAlive = game => game.ship.tiles.forEach(tile => { tile.hp = tile.maxHp; });
// Destroys every living enemy through the real damage path (rewards included), like the player would.
// Repeats because Splitters leave Shards behind.
const destroySwarm = game => {
  for (let pass = 0; pass < 6 && game.livingEnemyCount(); pass += 1) {
    game.enemies.slice().forEach(enemy => { if (!enemy.dead) game.damageEnemy(enemy, enemy.hp + (enemy.shield || 0) + 1, enemy.x, enemy.y); });
  }
};
const tickAlive = (game, seconds) => {
  for (let i = 0; i < Math.ceil(seconds / STEP) && game.state === "playing" && !game.finished; i += 1) { keepAlive(game); game.update(STEP); }
};

// Endless stays the default for every existing caller.
reset();
const endless = new api.Game();
assert.equal(endless.mode, "endless");
assert.equal(endless.nextBossAt, 180);
endless.elapsed = 333;
assert.equal(endless.pressureClock(), 333, "Endless pressure follows elapsed time");

// Waves start at wave 1 with no timed boss.
reset();
api.startRun("waves");
let game = api.current();
assert.equal(game.mode, "waves");
assert.equal(game.wave, 1);
assert.equal(game.nextBossAt, Infinity);
assert.equal(game.wavePhase, "combat");

// Timer stops new spawns only; the living swarm stays until destroyed; then the break starts.
tickAlive(game, 29);
assert.equal(game.wavePhase, "combat");
assert.ok(game.enemies.length > 0, "Wave 1 spawned enemies");
tickAlive(game, 1.1);
assert.equal(game.wavePhase, "sweep");
assert.ok(game.livingEnemyCount() > 0, "The swarm survives the timer");
// A far straggler keeps the sweep open and is pulled in (it cannot reach weapon range within this window).
const straggler = game.spawnEnemy("bulwark", game.ship.x + 3000, game.ship.y);
const spawnedAtSweep = game.totalEnemiesSpawned;
tickAlive(game, 5);
assert.equal(game.totalEnemiesSpawned, spawnedAtSweep, "No new enemies arrive during the sweep");
assert.equal(game.state, "playing", "The break waits for the swarm");
assert.ok(!straggler.dead && Math.hypot(straggler.x - game.ship.x, straggler.y - game.ship.y) < 3000 - 900, "Stragglers are pulled toward the ship");
destroySwarm(game);
game.update(STEP);
assert.equal(game.wavePhase, "clearing");
const matterBefore = game.matter;
tickAlive(game, 1.5);
assert.equal(game.state, "intermission");
assert.equal(game.matter, matterBefore + Waves.clearBonus(1), "Wave clear grants its Matter bonus");
assert.equal(game.cardOffer.length, 3);
const elapsedAtBreak = game.elapsed;
game.update(STEP);
assert.equal(game.elapsed, elapsedAtBreak, "Intermission is a hard pause");

// Start is blocked until a card is picked; picking applies modifiers to definitions.
api.startNextWave();
assert.equal(game.state, "intermission", "Next wave needs a card pick first");
game.cardOffer = [{ id: "calibration", family: "cannon" }, { id: "plating" }, { id: "thrusters" }];
const cannonDamage = game.weaponDefinitions.cannon.damage;
const starterHp = game.ship.tiles.get("0,-1").maxHp;
assert.ok(game.pickCard(0));
assert.ok(!game.pickCard(1), "Only one card per break");
assert.ok(Math.abs(game.weaponDefinitions.cannon.damage - cannonDamage * 1.2) < 1e-9, "Family card changes the definition");
assert.equal(game.ship.tiles.get("0,-1").maxHp, starterHp, "Unrelated stats stay the same");

// Build opens from the break and returns to it.
api.openBuild();
assert.equal(game.state, "building");
api.closeBuild();
assert.equal(game.state, "intermission");

api.startNextWave();
assert.equal(game.state, "playing");
assert.equal(game.wave, 2);
assert.ok(game.pressureClock() >= Waves.get(2).pressureAt);

// Reroll costs Matter and is refused without enough Matter.
game.state = "intermission"; game.cardPicked = false; game.rerolls = 0; game.matter = 3;
assert.equal(game.rerollCards(), false);
game.matter = 100;
assert.equal(game.rerollCards(), true);
assert.equal(game.matter, 100 - (3 + game.wave));
game.state = "playing";

// Boss waves are untimed and end on the boss kill.
game.cardPicked = true;
game.state = "intermission";
game.wave = 4;
api.startNextWave();
assert.equal(game.wave, 5);
tickAlive(game, 9);
assert.ok(game.boss && !game.boss.dead, "Boss arrives after the warning");
tickAlive(game, 60);
assert.equal(game.wavePhase, "combat", "Boss waves do not end on time");
game.damageEnemy(game.boss, game.boss.hp + (game.boss.shield || 0) + 1, game.boss.x, game.boss.y);
assert.equal(game.wavePhase, "sweep", "Boss kill hands over to the sweep");
destroySwarm(game);
tickAlive(game, 1.6);
assert.equal(game.state, "intermission");
assert.equal(game.bossesDefeated, 1);

// Final wave: boss HP scaled, kill wins, continue goes to endless waves.
game.cardPicked = true;
game.wave = 19;
api.startNextWave();
tickAlive(game, 9);
assert.ok(game.boss, "Final boss spawned");
const finalHp = game.boss.maxHp;
game.damageEnemy(game.boss, game.boss.hp + (game.boss.shield || 0) + 1, game.boss.x, game.boss.y);
destroySwarm(game);
tickAlive(game, 1.6);
assert.equal(game.state, "milestone");
assert.equal(game.survivalCompleted, true);
assert.ok(finalHp > 3200, "Final boss has scaled HP");
api.continueSurvival();
assert.equal(game.state, "intermission");
game.cardPicked = true;
api.startNextWave();
assert.equal(game.wave, 21);
assert.ok(game.waveTimeLimit() === 60);

// Enemies scale with the wave; bosses keep their own scaling; Endless is untouched.
const scale11 = Waves.enemyScale(11);
assert.deepEqual(Waves.enemyScale(1), { hp: 1, damage: 1, reward: 1 });
game.wave = 11;
const scout = game.spawnEnemy("scout", game.ship.x + 300, game.ship.y);
assert.ok(Math.abs(scout.maxHp - 12 * scale11.hp) < 1e-9 && Math.abs(scout.damage - 4 * scale11.damage) < 1e-9 && Math.abs(scout.reward - 1 * scale11.reward) < 1e-9, "Wave 11 scout is scaled");
const bulwark = game.spawnEnemy("bulwark", game.ship.x - 300, game.ship.y);
assert.ok(Math.abs(bulwark.maxShield - 45 * scale11.hp) < 1e-9, "Enemy shields scale with HP");
const endlessScout = endless.spawnEnemy("scout", 300, 0);
assert.equal(endlessScout.maxHp, 12, "Endless enemies keep fixed stats");

// Banking during the break settles as a retired run, never as a crash or loss.
game.state = "intermission";
game.finishRun(game.state === "milestone", true);
assert.equal(game.finished, true);

console.log(JSON.stringify({ passed: true, waves: Waves.WAVE_COUNT }));
