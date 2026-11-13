"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildReport, median } = require("./balance-report.cjs");

function waveRow(wave, outcome, extra = {}) {
  return { wave, boss: wave === 5 ? "warden" : null, startedAt: 0, endedAt: 40, seconds: 40, outcome, kills: 10, killsByType: {}, killsBySource: { cannon: 10 },
    matterEarned: 30, matterSpent: 20, matterSpentByReason: { module: 20 }, damageDealt: 400, damageBySource: { cannon: 400 },
    damageTaken: 50, damageTakenBySource: { drone: 50 }, coreDamage: 10, minCoreHpRatio: .8, coreHpEnd: 300, modulesStart: 3, modulesEnd: 4,
    purchases: { laser: 1 }, upgrades: [], peakEnemies: 30, minRenderFps: 58, clearReward: 12, ...extra };
}
function v3Run(id, { debug = false, death = null, picked = "calibration", waves = [waveRow(1, "cleared")], damage = { cannon: 300, laser: 100 } } = {}) {
  const total = Object.values(damage).reduce((s, v) => s + v, 0);
  return { runId: id, gameBuild: "2026.11.13-test", metricsVersion: 3, startedAt: "2026-11-13T10:00:0" + id.slice(-1), endedAt: "x", outcome: death ? "death" : "retired",
    context: { mode: "waves", debugTools: debug, coreId: "standard", starterWeapon: "cannon" }, events: [], samples: [], waves,
    cards: [{ wave: 1, offers: [["calibration", "optics", "plating"], ["calibration", "thrusters", "salvage"]], picked, skipped: !picked, rerolls: 1, rerollMatter: 3 }],
    death, stats: {},
    summary: { durationSeconds: 120, highestWave: waves.at(-1).wave, wavesCleared: waves.filter(w => w.outcome === "cleared").length, victory: false, death,
      damageBySource: damage, damageShareBySource: Object.fromEntries(Object.entries(damage).map(([k, v]) => [k, v / total])), killsBySource: { cannon: 10 },
      damageTakenBySource: { drone: 50, sniper: 30 }, coreDamageBySource: { sniper: 30 }, matterEarnedByReason: { kills: 40, waveClear: 12 },
      matterSpentByReason: { module: 20, reroll: 3 }, modulesPurchased: { laser: 1 }, upgradePaths: { cannon: ["base1", "base2"] }, matterBalanceError: 0 } };
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bastion-report-"));
try {
  const runA = v3Run("run-1", { death: { t: 100, wave: 2, waveSeconds: 30, killedBy: "sniper" }, waves: [waveRow(1, "cleared"), waveRow(2, "died", { seconds: 30 })] });
  const runB = v3Run("run-2", { picked: null, damage: { laser: 50, "card:castaway": 50 } });
  const legacy = { runId: "old-1", gameBuild: "2026.10.08-old", metricsVersion: 2, endedAt: "x", outcome: "death", context: { mode: "survival" }, events: [], samples: [], stats: {}, summary: { durationSeconds: 300 } };
  const debugRun = v3Run("run-9", { debug: true });
  // The same tester exported twice: run-1 appears in both files.
  fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify({ schemaVersion: 3, testerId: "tester-a", runs: [runA, legacy] }));
  fs.writeFileSync(path.join(dir, "b.json"), JSON.stringify({ schemaVersion: 3, testerId: "tester-a", runs: [runA, runB, debugRun] }));
  fs.writeFileSync(path.join(dir, "broken.json"), "{ not json");
  const report = buildReport([dir]);
  const a = report.analysis;
  assert.equal(a.runs, 3, "Duplicate and debug runs are dropped");
  assert.equal(a.balanceRuns, 2); assert.equal(a.legacyRuns, 1); assert.equal(a.testers, 1);
  assert.deepEqual(a.killedBy, { sniper: 1 }); assert.deepEqual(a.deathsByWave, { 2: 1 });
  assert.deepEqual(a.damageBySource, { cannon: 300, laser: 150, "card:castaway": 50 });
  assert.deepEqual(a.sourceRuns, { cannon: 1, laser: 2, "card:castaway": 1 });
  assert.equal(a.breaks, 2); assert.equal(a.skips, 1); assert.equal(a.rerolls, 2);
  assert.deepEqual(a.cardsSeen.calibration, 2, "A card offered twice in one break counts once"); assert.equal(a.cardsPicked.calibration, 1);
  assert.equal(a.waveRows[1].reached, 2); assert.equal(a.waveRows[2].died, 1);
  assert.match(report.markdown, /duplicates removed: 1; excluded: 1 debug/);
  assert.match(report.markdown, /\| calibration \| 2 \| 1 \| 50% \|/);
  assert.match(report.markdown, /\| sniper \| 60 \| 38% \| 60 \| 100% \|/);
  assert.match(report.markdown, /Unreadable files: broken\.json/);
  const csv = report.csv.trim().split("\n");
  assert.equal(csv.length, 1 + 3, "Header plus one row per wave of the balance runs");
  assert.match(csv[2], /^tester-a,run-1,2026\.11\.13-test,standard,cannon,2,,died,30,/);
  assert.equal(buildReport([dir], { includeDebug: true }).analysis.runs, 4);
  assert.equal(buildReport([dir], { build: "2026.10" }).analysis.runs, 1);
  assert.equal(median([3, 1, 2, NaN]), 2); assert.equal(median([4, 1]), 2.5); assert.equal(median([]), null);
  console.log("Balance report passed: merge, duplicate exports, debug and build filters, legacy runs, deaths, damage sources, card pick rates, wave table and CSV.");
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
