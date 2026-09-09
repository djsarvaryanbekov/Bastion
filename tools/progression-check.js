"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const progression = require("../progression.js");

const fresh = progression.normalize();
assert.deepEqual(fresh, { schemaVersion: 4, purchasedModules: [], legacyEligibleModules: [], totalKills: 0, bestTime: 0, bossesDefeated: 0, totalUpgrades: 0, contractsCompleted: 0 });
[null, undefined, [], false, "broken", 17].forEach(raw => assert.deepEqual(progression.normalize(raw), fresh));
assert.equal(progression.definitions.length, 17);
assert.equal(new Set(["cannon", "armor"].concat(progression.definitions.map(item => item.type))).size, 19, "Survival keeps the existing catalog without adding modules");
assert.deepEqual(Object.fromEntries(progression.definitions.map(item => [item.type, item.cost])), {
  scatter: 4, shield: 4, drive: 36, flak: 36, missile: 44, collector: 44, repair: 44,
  ember: 48, laser: 56, bulkhead: 48, cryo: 56, gravity: 64, reactor: 64, arc: 72,
  pulse: 80, rail: 96, mine: 80
}, "Two early choices stay cheap while later licenses span multiple main runs");
assert.equal(progression.definitions.reduce((sum, item) => sum + item.cost, 0), 876);
["cannon", "armor"].forEach(type => {
  assert.equal(progression.isUnlocked(fresh, type), true);
  assert.equal(progression.purchase(fresh, type, 1000), null);
  assert.deepEqual(progression.status(fresh, type), { owned: true, available: false, goalComplete: true, cost: 0, objective: null });
});
for (const unknown of ["unknown", "toString", "__proto__", null]) {
  assert.equal(progression.isUnlocked(fresh, unknown), false);
  assert.equal(progression.canPurchase(fresh, unknown), false);
  assert.equal(progression.purchase(fresh, unknown, 1000), null);
  assert.deepEqual(progression.status(fresh, unknown), { owned: false, available: false, goalComplete: false, cost: null, objective: null });
}
assert.throws(() => { progression.definitions[0].cost = 0; }, TypeError);
assert.equal(progression.nextObjective(fresh).type, "scatter");
const deltaKeys = { totalKills: "kills", bestTime: "elapsed", bossesDefeated: "bosses" };
for (const definition of progression.definitions) {
  assert.equal(Object.hasOwn(definition, "requiredClears"), false);
  assert.ok(Object.hasOwn(deltaKeys, definition.stat), "No license requires a particular build or buying run upgrades");
  assert.equal(progression.canPurchase(fresh, definition.type), false);
  const progress = progression.normalize();
  const deltaKey = deltaKeys[definition.stat];
  progression.apply(progress, { [deltaKey]: definition.target - 1 });
  assert.equal(progression.canPurchase(progress, definition.type), false);
  assert.ok(progression.apply(progress, { [deltaKey]: deltaKey === "elapsed" ? definition.target : 1 }).includes(definition.type));
  assert.equal(progression.canPurchase(progress, definition.type), true);
  assert.equal(progression.isUnlocked(progress, definition.type), false, "An achievement grants eligibility, not ownership");
  assert.equal(progression.objective(progress, definition.type).current, definition.target);
  assert.deepEqual(progression.apply(progress, {}), [], "Unpurchased eligibility is not announced repeatedly");
  const before = JSON.stringify(progress);
  for (const invalidBalance of [definition.cost - .01, -1, NaN, Infinity, "100", null]) {
    assert.equal(progression.purchase(progress, definition.type, invalidBalance), null);
    assert.equal(JSON.stringify(progress), before, "A rejected purchase is atomic");
  }
  assert.deepEqual(progression.purchase(progress, definition.type, definition.cost), { fragments: 0, cost: definition.cost, type: definition.type });
  assert.equal(progression.purchase(progress, definition.type, 1000), null, "Double clicks cannot spend twice");
  assert.deepEqual(progression.normalize(JSON.parse(JSON.stringify(progress))), progress);
}

const oldGoals = [
  ["scatter", "totalKills", 15, 0], ["shield", "bestTime", 30, 0], ["drive", "totalKills", 30, 0],
  ["flak", "totalKills", 45, 0], ["missile", "bestTime", 45, 0], ["collector", "totalKills", 60, 0],
  ["repair", "bestTime", 60, 0], ["ember", "totalKills", 75, 1], ["laser", "totalKills", 75, 3],
  ["bulkhead", "totalKills", 90, 3], ["cryo", "totalKills", 150, 3], ["gravity", "totalUpgrades", 2, 5],
  ["reactor", "totalUpgrades", 2, 6], ["arc", "totalUpgrades", 3, 6], ["pulse", "bossesDefeated", 1, 9],
  ["rail", "bossesDefeated", 2, 12], ["mine", "totalKills", 350, 12]
];
for (const [type, stat, target, clears] of oldGoals) {
  const raw = { schemaVersion: 3, purchasedModules: [], [stat]: target, contractsCompleted: clears };
  const before = JSON.stringify(raw);
  const migrated = progression.normalize(raw);
  assert.equal(progression.canPurchase(migrated, type), true, `${type}: earned old eligibility cannot be revoked`);
  assert.equal(progression.isUnlocked(migrated, type), false);
  assert.equal(JSON.stringify(raw), before, "Migration does not mutate its source");
  assert.deepEqual(progression.normalize(migrated), migrated, "Migration must be idempotent");
  if (clears) {
    const insufficient = progression.normalize({ ...raw, contractsCompleted: clears - 1 });
    assert.equal(insufficient.legacyEligibleModules.includes(type), false, "An unmet old contract gate cannot become grandfathered access");
  }
}
const campaignOnlyCount = progression.normalize({ schemaVersion: 3, totalKills: 75 }, { campaign: { completed: ["sector1-1", "sector1-2", "sector1-3"] } });
assert.equal(progression.canPurchase(campaignOnlyCount, "laser"), true, "Migration reads a legacy campaign count when the duplicated counter is missing");
assert.equal(campaignOnlyCount.contractsCompleted, 3);
const beforeCampaign = progression.normalize({ schemaVersion: 2, purchasedModules: ["mine"], totalKills: 75, bestTime: 45, bossesDefeated: 1, totalUpgrades: 3 });
["laser", "reactor", "arc", "pulse"].forEach(type => assert.equal(progression.canPurchase(beforeCampaign, type), true));
["ember", "gravity", "rail"].forEach(type => assert.equal(progression.canPurchase(beforeCampaign, type), false));
assert.equal(progression.isUnlocked(beforeCampaign, "mine"), true);
const legacy = progression.normalize(undefined, { bestKills: 250, bestTime: 73.5, victories: 1, lastLoadout: { selectedWeapon: "rail" } });
assert.equal(legacy.totalKills, 250);
assert.equal(legacy.bestTime, 73.5);
assert.deepEqual(legacy.purchasedModules, ["rail"]);
assert.equal(progression.canPurchase(legacy, "repair"), true, "Old 60-second eligibility survives a raised Survival threshold");
assert.equal(progression.isUnlocked(progression.normalize(null, { lastLoadout: { selectedWeapon: "mine" } }), "mine"), false);
assert.deepEqual(progression.normalize(legacy, { bestKills: 999, bestTime: 999, victories: 999 }), legacy, "Modern loads do not reapply old counters");
const automatic = progression.normalize({ unlockedWeapons: ["laser", "laser", "rail", "bad"], totalKills: 75 }, { lastLoadout: { selectedWeapon: "laser" } });
assert.deepEqual(automatic.purchasedModules, ["laser"]);
assert.equal(progression.canPurchase(automatic, "rail"), true);
assert.equal(progression.isUnlocked(automatic, "rail"), false);
const ownedSave = { fragments: 22, progression: { schemaVersion: 3, purchasedModules: ["scatter", "rail", "ember", "gravity"], legacyEligibleModules: ["cryo"] } };
const ownedSource = JSON.stringify(ownedSave);
const owned = progression.normalize(ownedSave.progression, ownedSave);
assert.deepEqual(owned.purchasedModules, ownedSave.progression.purchasedModules);
assert.equal(progression.canPurchase(owned, "cryo"), true);
assert.equal(JSON.stringify(ownedSave), ownedSource, "Funds and owned content cannot be changed by migration");
owned.purchasedModules.push("laser");
assert.equal(JSON.stringify(ownedSave), ownedSource, "Migration arrays must not share storage");
const corrupt = progression.normalize({ schemaVersion: 4, purchasedModules: ["laser", "laser", "shield", "bad", {}, null], legacyEligibleModules: ["rail", "rail", "bad"], totalKills: Infinity, bestTime: NaN, bossesDefeated: -5, totalUpgrades: "2.8" });
assert.deepEqual(corrupt, { schemaVersion: 4, purchasedModules: ["laser", "shield"], legacyEligibleModules: ["rail"], totalKills: 0, bestTime: 0, bossesDefeated: 0, totalUpgrades: 2, contractsCompleted: 0 });
const malformed = progression.normalize({ schemaVersion: 4, totalKills: [], bestTime: {}, bossesDefeated: true, totalUpgrades: "Infinity", contractsCompleted: Infinity, purchasedModules: "rail", legacyEligibleModules: "rail" });
assert.deepEqual(malformed, fresh);
const acrossRuns = progression.normalize();
progression.apply(acrossRuns, { kills: 40, elapsed: 25, upgrades: 1, contracts: 99 });
progression.apply(acrossRuns, { kills: 35, elapsed: 20, upgrades: 2 });
assert.equal(acrossRuns.totalKills, 75);
assert.equal(acrossRuns.bestTime, 25, "Depth is a per-run best, never cumulative time");
assert.equal(acrossRuns.contractsCompleted, 0, "Archived contract history cannot progress during Survival");
assert.equal(progression.canPurchase(acrossRuns, "arc"), false, "Upgrade purchases cannot bypass depth goals");
assert.deepEqual(progression.apply(acrossRuns, { elapsed: 30 }), ["shield"]);
assert.deepEqual(progression.apply(acrossRuns, { elapsed: 30 }), []);
const beforeBad = progression.normalize(acrossRuns);
assert.deepEqual(progression.apply(acrossRuns, { kills: -100, bosses: Infinity, upgrades: [], elapsed: NaN }), []);
assert.deepEqual(acrossRuns, beforeBad);
assert.throws(() => progression.apply(null, {}), TypeError);
const mainClear = progression.normalize();
progression.apply(mainClear, { elapsed: 600, kills: 300, bosses: 5 });
assert.ok(progression.definitions.every(item => progression.canPurchase(mainClear, item.type)), "A complete main run exposes all existing licenses for later purchase");
let balance = 876;
for (const definition of progression.definitions) balance = progression.purchase(mainClear, definition.type, balance).fragments;
assert.equal(balance, 0);
assert.equal(progression.nextObjective(mainClear), null);

assert.equal(progression.runReward({ elapsed: 120, kills: 1, bosses: 1 }), 4, "A first boss can afford one early license without a front-loaded 6F bonus");
assert.equal(progression.runReward({ elapsed: 600, kills: 300, bosses: 3, completed: true }), 36);
assert.equal(progression.runReward({ elapsed: 600, kills: 300, bosses: 3 }), 26, "Main completion supplies one explicit bonus");
assert.equal(progression.runReward({ elapsed: 120, kills: 1, bosses: 1, completed: true }), 4, "Premature completion cannot mint the finale bonus");
assert.equal(progression.runReward({ elapsed: 600, kills: 300, bosses: 3, completed: "true" }), 26);
assert.equal(progression.runReward({ elapsed: 600, kills: 300, bosses: 2, completed: true }), 22, "Survival time alone cannot claim the finale bonus");
assert.equal(progression.runReward({ elapsed: 840, kills: 10000, bosses: 5, completed: true }), 42, "Continued survival gains time and boss rewards, with capped kill farming");
assert.equal(progression.runReward({ elapsed: 120, kills: 1, bosses: 900 }), 4, "A malformed boss total cannot exceed actual kills");
assert.equal(progression.runReward({ elapsed: 1, kills: 10000 }), 0, "A short run cannot front-load the 6F kill cap");
assert.equal(progression.runReward({ elapsed: 1, kills: 15 }), 0, "There is no fixed minimum payout to farm through restarts");

const scale = progression.settleRunReward(null).scale;
assert.equal(scale, 600000);
const rewardCredit = snapshot => progression.settleRunReward(snapshot).earnedUnits / scale;
const shortRun = { elapsed: 30, kills: 15, bosses: 0 };
const shortPayout = progression.settleRunReward(shortRun);
assert.deepEqual(shortPayout, { fragments: 0, carryUnits: 480000, earnedUnits: 480000, scale });
assert.deepEqual(progression.settleRunReward(shortRun, shortPayout.carryUnits), {
  fragments: 1, carryUnits: 360000, earnedUnits: 480000, scale
}, "Unpaid credit carries into the next run without a second currency");
assert.deepEqual(progression.settleRunReward({ elapsed: 90, kills: 45 }), { fragments: 2, carryUnits: 240000, earnedUnits: 1440000, scale });
assert.deepEqual(progression.settleRunReward({ elapsed: 134.23, kills: 184, bosses: 1 }), {
  fragments: 5, carryUnits: 347680, earnedUnits: 3347680, scale
});
assert.equal(progression.settleRunReward({ elapsed: 1, kills: 1 }).earnedUnits, 16000);
assert.equal(progression.settleRunReward({ elapsed: 1.0009, kills: 1 }).earnedUnits, 16000, "Settlement quantizes time once to completed milliseconds");
assert.equal(progression.settleRunReward(shortRun, scale - 1).fragments, 1);
assert.equal(progression.settleRunReward(shortRun, scale - 1).carryUnits, 479999);

for (const invalid of [null, undefined, -1, .5, scale, scale + 1, Infinity, NaN, "480000", true, {}, []]) {
  assert.deepEqual(progression.settleRunReward(shortRun, invalid), shortPayout, "Malformed saved carry cannot mint money");
}
for (const snapshot of [null, undefined, [], false, "bad", {},
  { elapsed: Infinity, kills: Infinity, bosses: Infinity },
  { elapsed: 600, kills: 0, bosses: 5, completed: true },
  { elapsed: -1, kills: 3, bosses: 3, completed: true },
  { elapsed: 0, kills: 100, bosses: 1 },
  { elapsed: NaN, kills: 100, bosses: 1 }]) {
  assert.equal(progression.runReward(snapshot), 0);
  assert.deepEqual(progression.settleRunReward(snapshot, 480000), { fragments: 0, carryUnits: 480000, earnedUnits: 0, scale }, "Empty or invalid runs preserve earned saved credit");
}

// Splitting the same early combat into restarts cannot mint rounded-up rewards.
for (const [count, elapsed, kills] of [[2, 30, 15], [5, 30, 15], [100, 1, 1], [120, 5, 5]]) {
  let wallet = 0;
  let carry = 0;
  for (let i = 0; i < count; i += 1) {
    const payout = progression.settleRunReward({ elapsed, kills }, carry);
    wallet += payout.fragments;
    carry = payout.carryUnits;
  }
  const continuous = progression.settleRunReward({ elapsed: count * elapsed, kills: count * kills });
  assert.equal(wallet * scale + carry, continuous.earnedUnits, "Split runs conserve credit before the continuation pacing change");
}
let cheapAttemptBalance = 0;
let cheapAttemptCarry = 0;
for (let i = 0; i < 5; i += 1) {
  const payout = progression.settleRunReward(shortRun, cheapAttemptCarry);
  cheapAttemptBalance += payout.fragments;
  cheapAttemptCarry = payout.carryUnits;
}
assert.equal(cheapAttemptBalance, 4);
assert.equal(cheapAttemptCarry, 0, "Repeated settlement cannot slowly lose fractional earnings");
const mainRate = rewardCredit({ elapsed: 600, kills: 300, bosses: 3, completed: true }) / 10;
for (const snapshot of [shortRun, { elapsed: 134.23, kills: 184, bosses: 1 }, { elapsed: 300, kills: 150, bosses: 2 }]) {
  assert.ok(rewardCredit(snapshot) / (snapshot.elapsed / 60) < mainRate, "Early exits have lower Fragments-per-minute than reaching the finale");
}
const noBoss = rewardCredit({ elapsed: 600, kills: 300, bosses: 0 });
const firstBoss = rewardCredit({ elapsed: 600, kills: 300, bosses: 1 });
const secondBoss = rewardCredit({ elapsed: 600, kills: 300, bosses: 2 });
const thirdBoss = rewardCredit({ elapsed: 600, kills: 300, bosses: 3 });
assert.deepEqual([firstBoss - noBoss, secondBoss - firstBoss, thirdBoss - secondBoss], [2, 4, 4]);
const hugeSnapshot = { elapsed: 1e30, kills: 1e30, bosses: 1e30, completed: true };
const boundedSnapshot = { elapsed: 1e9, kills: 1e9, bosses: 1e9, completed: true };
const hugePayout = progression.settleRunReward(hugeSnapshot, scale - 1);
assert.deepEqual(hugePayout, progression.settleRunReward(boundedSnapshot, scale - 1));
assert.ok(Number.isSafeInteger(hugePayout.earnedUnits));
assert.ok(Number.isSafeInteger(hugePayout.fragments));
assert.ok(Number.isInteger(hugePayout.carryUnits) && hugePayout.carryUnits >= 0 && hugePayout.carryUnits < scale);
assert.equal(hugePayout.fragments * scale + hugePayout.carryUnits, hugePayout.earnedUnits + scale - 1);
const frozenSnapshot = Object.freeze({ elapsed: 30, kills: 15, bosses: 0 });
assert.deepEqual(progression.settleRunReward(frozenSnapshot, 0), shortPayout, "Settlement never mutates the supplied run");
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../progression.js"), "utf8"), browser);
assert.equal(typeof browser.window.DriftProgression.runReward, "function");
assert.equal(typeof browser.window.DriftProgression.settleRunReward, "function");
assert.equal(browser.window.DriftProgression.isUnlocked(browser.window.DriftProgression.normalize(), "cannon"), true);
console.log("Progression passed: 19 preserved modules, 4F early licenses / 876F catalog, existing depth/boss goals and schema1-4 migration, old ownership and eligibility preserved, atomic purchases, exact saved fractional credit, restart-credit conservation, lower early-exit income, 36F main clear, continued income, extreme input safety, and browser export.");
