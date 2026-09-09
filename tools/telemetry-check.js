"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("telemetry.js", "utf8");
const key = "drift-bastion-playtest-v1";
function harness(previous) {
  let wall = 0, nextId = 0, exported = null;
  const storage = new Map();
  if (previous) storage.set(key, JSON.stringify(previous));
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [wall])); }
    static now() { return wall; }
  }
  const context = {
    Date: ClockDate, console, setTimeout(callback) { callback(); },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    crypto: { randomUUID: () => String(++nextId) },
    navigator: { language: "test", userAgent: "test" },
    Blob: class { constructor(parts) { exported = parts.join(""); } },
    URL: { createObjectURL() { return "blob:test"; }, revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement() { return { click() {}, remove() {} }; } },
    window: { innerWidth: 100, innerHeight: 100, matchMedia: () => ({ matches: false }) }
  };
  vm.runInNewContext(source, context, { filename: "telemetry.js" });
  const api = context.window.PlaytestTelemetry;
  return { api, advance: milliseconds => { wall += milliseconds; }, data: () => JSON.parse(JSON.stringify(api.getDataForTests())), storage,
    exportData() { api.exportLog(); return JSON.parse(exported); } };
}
const legacyRuns = [{ runId: "old-1", endedAt: "old", outcome: "retired", events: [{ t: 1, type: "module_purchased", data: { type: "cannon" } }], samples: [{ t: 10, coreHp: 300 }], stats: { matterEarned: 20 }, summary: { kills: 4 } },
  { runId: "old-2", gameBuild: "known-old-build", endedAt: "old", events: [], samples: [], stats: {}, summary: { durationSeconds: 0 } }];
const old = { schemaVersion: 1, gameBuild: "old-exporter", testerId: "preserved-id", createdAt: "old", runs: legacyRuns };
const migrated = harness(old);
assert.equal(migrated.data().schemaVersion, 2);
assert.deepEqual(migrated.data().runs, legacyRuns, "All completed historical records survive schema migration unchanged");
assert.equal(migrated.data().testerId, "preserved-id");
assert.equal(migrated.data().runs[0].gameBuild, undefined, "The current exporter cannot fabricate a legacy run's build");
assert.match(migrated.data().metricDefinitions.gameBuild, /exporter/);
assert.deepEqual(harness(migrated.exportData()).data().runs, legacyRuns, "A schema2 export can load again without changing history");
assert.deepEqual(old.runs, legacyRuns);

const test = harness(), api = test.api;
const sample = (elapsed, overrides = {}) => ({ elapsed, matter: 27, kills: 2, modules: 3,
  coreHp: 300, coreMaxHp: 350, coreHpRatio: 300 / 350,
  moduleHp: 90, moduleMaxHp: 120, shield: 50, shieldMax: 90, shieldModules: 2, activeShieldModules: 1,
  bossHp: 0, bossMaxHp: 100, bossShield: 0, bossMaxShield: 15, ...overrides });
api.beginRun({ starterWeapon: "cannon" }, sample(0, { matter: 10 }));
assert.equal(test.data().runs[0].metricsVersion, 2);
assert.equal(test.data().runs[0].gameBuild, test.data().gameBuild);
api.recordEnemyKill("drone", 50);
api.recordPurchase("cannon", 20, 1, { x: 0, y: 1 });
api.recordUpgrade("cannon", "tune", 16, 1, { level: 2, branch: null });
api.recordMatterSpent("repair", 4, 1, { modules: 1 });
api.recordSale("armor", 7, 1, { x: 1, y: 0 });
api.recordMove("shield", { x: -1, y: 0 }, { x: 1, y: 0 }, 1);
api.recordBuild(true, 1, {}); test.advance(1000); api.recordBuild(true, 1, {});
test.advance(3000); api.recordBuild(false, 1, {}); api.recordBuild(false, 1, {});
api.recordPause(true, 1); test.advance(2000);
api.recordDamage("core", 10, 20); api.recordDamage("cannon", 30, 5);
api.recordOutgoingDamage("drone", 25, 0, 1, 1);
api.recordOutgoingDamage("bulwark", 20, 10, 4.9, 2);
api.sample(sample(5), true);
let point = test.data().runs[0].samples.at(-1);
assert.equal(point.damageDealt, 55); assert.equal(point.outgoingDps5s, 11);
assert.equal(point.dpsWindowSeconds, 5);
assert.equal(point.coreMaxHp, 350); assert.equal(point.moduleHp, 90); assert.equal(point.shield, 50);
assert.equal(point.matterEarned, 50); assert.equal(point.matterSpent, 40); assert.equal(point.matterRefunded, 7);
api.sample(sample(6), true);
assert.equal(test.data().runs[0].samples.at(-1).outgoingDps5s, 6, "Damage ages out of the trailing five-second simulation window");
api.sample(sample(10), true);
assert.equal(test.data().runs[0].samples.at(-1).outgoingDps5s, 0);
api.recordBossSpawn(10, 100, { id: 7, variant: "siege" });
api.recordOutgoingDamage("boss", 0, 15, 10.2, 7);
api.recordOutgoingDamage("boss", 100, 0, 11.2, 7);
api.recordBossDefeat(11.4, { id: 7 });
api.recordBossSpawn(20, 200, { id: 8, variant: "storm" });
api.recordOutgoingDamage("boss", 10, 0, 20.1, 999);
api.recordBossDefeat(22, { id: 8 });
api.finishRun({ outcome: "retired", elapsed: 22, kills: 2, matter: 27, modules: 3, fragments: 8 }, sample(22));
const run = test.data().runs[0], summary = run.summary;
assert.equal(summary.initialMatter, 10);
assert.equal(summary.matterEarned, 50); assert.equal(summary.matterSpent, 40); assert.equal(summary.matterRefunded, 7);
assert.equal(summary.matterBalanceError, 0, "Purchases, upgrades, repairs and refunds reconcile with final funds");
assert.deepEqual(summary.matterSpentByReason, { module: 20, upgrade: 16, repair: 4 });
assert.equal(summary.damageDealt, 180); assert.equal(summary.hullDamageDealt, 155); assert.equal(summary.shieldDamageDealt, 25);
assert.equal(summary.averageOutgoingDps, 8.18, "Average DPS divides actual damage by all simulation time");
assert.equal(summary.damageToCore, 10); assert.equal(summary.damageToModules, 30); assert.equal(summary.shieldDamageAbsorbed, 25);
assert.equal(summary.finalCoreHp, 300); assert.equal(summary.finalCoreMaxHp, 350); assert.equal(summary.finalShieldMax, 90);
assert.equal(summary.buildVisits, 1); assert.equal(summary.buildSeconds, 4);
assert.equal(summary.pauseVisits, 1); assert.equal(summary.pauseSeconds, 2, "Finishing while paused includes the pending wall interval");
assert.equal(summary.upgradesPurchased, 1); assert.equal(summary.moduleMoves, 1); assert.deepEqual(summary.modulesSold, { armor: 1 });
assert.equal(summary.bossEncounters[0].spawnToDefeatSeconds, 1.4);
assert.equal(summary.bossEncounters[0].engagementSeconds, 1.2);
assert.equal(summary.bossEncounters[0].hullDamageTaken, 100); assert.equal(summary.bossEncounters[0].shieldDamageTaken, 15);
assert.equal(summary.bossEncounters[1].engagementSeconds, null, "No recorded matching hit means unknown engagement, not zero seconds");
assert.equal(summary.bossEncounters[1].spawnToDefeatSeconds, 2);
for (const eventType of ["module_purchased", "weapon_upgraded", "module_sold", "module_moved", "matter_spent"]) assert.ok(run.events.some(event => event.type === eventType));
const finished = JSON.stringify(run); api.finishRun({}, sample(25)); assert.equal(JSON.stringify(test.data().runs[0]), finished);
assert.equal(test.exportData().runs[0]._pauseOpenedWall, undefined);

api.beginRun({}, { elapsed: 0, matter: 0, coreHp: 350, coreHpRatio: 1 });
api.recordOutgoingDamage("drone", 10, 0, .5, 1);
api.sample({ elapsed: 1, matter: 0, coreHp: 350, coreHpRatio: 1 }, true);
point = test.data().runs[1].samples.at(-1);
assert.equal(point.damageDealt, 10); assert.equal(point.outgoingDps5s, 10); assert.equal(point.dpsWindowSeconds, 1);
assert.equal(point.coreMaxHp, null); assert.equal(point.moduleHp, null); assert.equal(point.shield, null, "Missing absolute readings cannot be reported as zero");
assert.equal(point.enemiesVisible, undefined, "Older snapshots must not invent visible population measurements");
api.sample({ elapsed: 1.1, coreHpRatio: 1, enemiesVisible: 81, swarmRate: 9.25, streamEnemiesSpawned: 120, swarmRepositioned: 14 }, true);
const swarmPoint = test.data().runs[1].samples.at(-1);
assert.equal(swarmPoint.enemiesVisible,81); assert.equal(swarmPoint.swarmRate,9.25);
assert.equal(swarmPoint.streamEnemiesSpawned,120); assert.equal(swarmPoint.swarmRepositioned,14);
assert.equal(swarmPoint.assaultIndex,undefined,"The new stream must not invent obsolete wave counters");
api.recordOutgoingDamage("drone", Infinity, NaN, 1, 1);
api.recordOutgoingDamage("drone", -5, -2, 1, 1);
api.recordOutgoingDamage("drone", 5, 2, NaN, 1);
api.recordEnemyKill("drone", Infinity);
api.sample({ elapsed: 2, matter: 0, coreHp: 350, coreHpRatio: 1 }, true);
assert.equal(test.data().runs[1].samples.at(-1).damageDealt, 10, "Invalid damage cannot poison totals");
api.recordBuild(true, 2); test.advance(1500); api.finishRun({ elapsed: 2 }, null);
assert.equal(test.data().runs[1].summary.buildSeconds, 1.5, "A run ended in Build includes pending Build time");
api.beginRun({}, { elapsed: 0, matter: 0, coreHpRatio: 1 });
assert.equal(api.shouldSample(4.999), true); api.sample({ elapsed: 4.999, coreHpRatio: 1 }); assert.equal(api.shouldSample(5), false);
api.clearCompleted(); assert.equal(test.data().runs.length, 1); assert.equal(api.getStatus().active, true);
console.log("Telemetry passed: schema1/2 history preservation, per-run build identity, absolute HP/shields, reconciled Matter transactions, real outgoing damage, five-second DPS, boss engagement vs spawn duration, move/sell/upgrade events, final open intervals, and missing/invalid data.");
