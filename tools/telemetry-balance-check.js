"use strict";
// Balance rows (telemetry metricsVersion 3): per-wave rows, card breaks, damage attribution, death cause.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("telemetry.js", "utf8");
const key = "drift-bastion-playtest-v1";

function harness(previous) {
  let wall = 0, nextId = 0;
  const storage = new Map();
  if (previous) storage.set(key, JSON.stringify(previous));
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [wall])); }
    static now() { return wall; }
  }
  const context = {
    Date: ClockDate, console, setTimeout(callback) { callback(); },
    localStorage: { getItem: name => storage.get(name) || null, setItem: (name, value) => storage.set(name, value) },
    crypto: { randomUUID: () => String(++nextId) },
    navigator: { language: "test", userAgent: "test" },
    Blob: class {}, URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement() { return { click() {}, remove() {} }; } },
    window: { innerWidth: 100, innerHeight: 100, matchMedia: () => ({ matches: false }) }
  };
  vm.runInNewContext(source, context, { filename: "telemetry.js" });
  return { api: context.window.PlaytestTelemetry, data: () => JSON.parse(JSON.stringify(context.window.PlaytestTelemetry.getDataForTests())) };
}

const snapshot = (elapsed, matter, overrides = {}) => ({ elapsed, matter, kills: 0, modules: 2, coreHp: 350, coreMaxHp: 350, coreHpRatio: 1, enemies: 4, renderFps: 60, ...overrides });

// A two-wave Waves run that dies on wave 2.
const test = harness(), api = test.api;
api.beginRun({ mode: "waves", coreId: "standard", starterWeapon: "cannon" }, snapshot(0, 40));
api.event("wave_start", 0, { wave: 1, boss: "", modules: 2 });
api.recordOutgoingDamage("drone", 30, 0, 1, 1, "cannon");
api.recordOutgoingDamage("drone", 10, 0, 2, 1, "card:castaway");
api.recordOutgoingDamage("drone", 5, 0, 2, 1);
api.recordEnemyKill("drone", 5, "cannon");
api.recordDamage("core", 10, 5, "gunner", .9);
api.recordDamage("cannon", 4, 0, "drone");
api.sample(snapshot(15, 45, { enemies: 9, renderFps: 55, minimumRenderFps: 48, coreHpRatio: .95 }), true);
api.event("wave_clear", 20, { wave: 1, reward: 12, coreHp: 340, modules: 2 });
api.event("card_offer", 20, { wave: 1, cards: ["calibration", "overclock", "optics"] });
api.event("card_reroll", 20, { wave: 1, cost: 3 });
api.event("card_offer", 20, { wave: 1, cards: ["plating", "calibration", "thrusters"] });
api.event("card_pick", 20, { wave: 1, card: "calibration", stacks: 1 });
api.recordPurchase("laser", 20, 20, { x: 1, y: 0 });
api.recordUpgrade("cannon", "base1", 8, 20, { level: 1 });
api.event("wave_start", 20, { wave: 2, boss: "", modules: 3 });
api.recordOutgoingDamage("bulwark", 40, 20, 25, 3, "laser");
api.recordDamage("core", 300, 0, "bulwark", .1);
api.recordDamage("core", 40, 0, "sniper", 0);
api.finishRun({ outcome: "death", elapsed: 31, kills: 1, matter: 26, modules: 3, fragments: 2 }, snapshot(31, 26, { coreHp: 0, coreHpRatio: 0, modules: 3 }));

const run = test.data().runs[0], summary = run.summary;
assert.equal(run.metricsVersion, 3);
assert.equal(run.waves.length, 2);
const [first, second] = run.waves;
assert.equal(first.wave, 1); assert.equal(first.outcome, "cleared"); assert.equal(first.seconds, 20);
assert.equal(first.kills, 1); assert.deepEqual(first.killsBySource, { cannon: 1 });
assert.deepEqual(first.damageBySource, { cannon: 30, "card:castaway": 10, other: 5 });
assert.equal(first.damageDealt, 45);
assert.deepEqual(first.damageTakenBySource, { gunner: 15, drone: 4 }, "Shield absorption counts as damage taken from its attacker");
assert.equal(first.coreDamage, 10);
assert.equal(first.minCoreHpRatio, .9, "Core HP ratio from hits is tracked between coarse samples");
assert.equal(first.matterEarned, 17, "Kill Matter plus the clear bonus");
assert.equal(first.clearReward, 12); assert.equal(first.coreHpEnd, 340);
assert.equal(first.matterSpent, 31, "The break after a wave is credited to that wave");
assert.deepEqual(first.matterSpentByReason, { reroll: 3, module: 20, upgrade: 8 });
assert.deepEqual(first.purchases, { laser: 1 }); assert.deepEqual(first.upgrades, ["cannon:base1"]);
assert.equal(first.modulesStart, 2); assert.equal(first.modulesEnd, 2);
assert.equal(first.peakEnemies, 9); assert.equal(first.minRenderFps, 48);
assert.equal(second.wave, 2); assert.equal(second.outcome, "died"); assert.equal(second.seconds, 11);
assert.equal(second.minCoreHpRatio, 0); assert.equal(second.modulesStart, 3);
assert.deepEqual(run.death, { t: 31, wave: 2, waveSeconds: 11, killedBy: "sniper" }, "The last hit on the core names the killer");
assert.deepEqual(run.cards, [{ wave: 1, offers: [["calibration", "overclock", "optics"], ["plating", "calibration", "thrusters"]], picked: "calibration", skipped: false, rerolls: 1, rerollMatter: 3 }]);

assert.equal(summary.mode, "waves"); assert.equal(summary.starterWeapon, "cannon");
assert.equal(summary.highestWave, 2); assert.equal(summary.wavesCleared, 1); assert.equal(summary.victory, false);
assert.deepEqual(summary.death, run.death);
assert.deepEqual(summary.damageBySource, { cannon: 30, "card:castaway": 10, other: 5, laser: 60 });
assert.deepEqual(summary.damageShareBySource, { cannon: .286, "card:castaway": .095, other: .048, laser: .571 });
assert.deepEqual(summary.killsBySource, { cannon: 1 });
assert.deepEqual(summary.coreDamageBySource, { gunner: 10, bulwark: 300, sniper: 40 });
assert.deepEqual(summary.matterEarnedByReason, { kills: 5, waveClear: 12 });
assert.deepEqual(summary.upgradePaths, { cannon: ["base1"] });
assert.deepEqual(summary.cardsPicked, ["calibration"]); assert.equal(summary.cardsSkipped, 0); assert.equal(summary.rerolls, 1);
assert.equal(summary.matterBalanceError, 0, "Clear bonus, skip rewards and reroll costs reconcile with final Matter");
assert.equal(run._lastCoreAttacker, undefined, "Internal state never reaches the saved run");

// Skips, victory and endless runs.
api.beginRun({ mode: "waves" }, snapshot(0, 0));
api.event("wave_start", 0, { wave: 20, boss: "dreadnought", modules: 9 });
api.event("wave_clear", 50, { wave: 20, reward: 0, coreHp: 200, modules: 9 });
api.event("waves_won", 50, { wave: 20 });
api.event("card_offer", 50, { wave: 20, cards: ["a", "b", "c"] });
api.event("card_skip", 50, { wave: 20, matter: 15 });
api.finishRun({ outcome: "retired", elapsed: 50, matter: 15 }, snapshot(50, 15));
const won = test.data().runs[1].summary;
assert.equal(won.victory, true); assert.equal(won.death, null); assert.equal(won.cardsSkipped, 1);
assert.deepEqual(won.matterEarnedByReason, { cardSkip: 15 }); assert.equal(won.matterBalanceError, 0);
api.beginRun({ mode: "survival" }, snapshot(0, 0));
api.recordOutgoingDamage("drone", 8, 0, 1, 1, "pulse");
api.finishRun({ outcome: "death", elapsed: 5, matter: 0 }, snapshot(5, 0));
const endless = test.data().runs[2];
assert.deepEqual(endless.waves, []); assert.deepEqual(endless.summary.damageBySource, { pulse: 8 });
assert.deepEqual(endless.death, { t: 5, wave: null, waveSeconds: null, killedBy: "unknown" });

// Older runs stay exactly as recorded; an interrupted v3 run closes its open wave without inventing a duration.
const legacy = { runId: "v2", metricsVersion: 2, endedAt: "old", outcome: "death", events: [], samples: [], stats: { matterEarned: 9 }, summary: { durationSeconds: 3 } };
const interrupted = { runId: "open", metricsVersion: 3, endedAt: null, outcome: null, context: {}, events: [], samples: [], cards: [], death: null,
  waves: [{ wave: 4, startedAt: 90, endedAt: null, seconds: null, outcome: null, matterEarned: 0, matterSpent: 0, damageDealt: 0, damageTaken: 0, coreDamage: 0,
    damageBySource: {}, damageTakenBySource: {}, matterSpentByReason: {} }], stats: { matterEarned: 0, matterSpent: 0, matterRefunded: 0, enemiesKilledByType: {} } };
const reloaded = harness({ schemaVersion: 2, testerId: "kept", runs: [legacy, interrupted] }).data();
assert.equal(reloaded.schemaVersion, 3); assert.equal(reloaded.testerId, "kept");
assert.deepEqual(reloaded.runs[0], legacy);
assert.equal(reloaded.runs[1].outcome, "interrupted");
assert.equal(reloaded.runs[1].waves[0].outcome, "interrupted"); assert.equal(reloaded.runs[1].waves[0].seconds, null);

console.log("Telemetry balance passed: per-wave rows, break spending, card offers/rerolls/picks/skips, damage and kills by source, damage taken by enemy, death cause, victory, endless runs, v2 history and interrupted waves.");
