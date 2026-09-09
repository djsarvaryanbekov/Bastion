"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const campaign = require("../campaign.js");

const fresh = campaign.normalize();
assert.deepEqual(fresh, { schemaVersion: 2, completed: [], mastered: [], purchasedCores: [], legacyEligibleCores: [], selectedCore: "standard" });
[null, undefined, "bad", false, [], 12].forEach(raw => assert.deepEqual(campaign.normalize(raw), fresh));
assert.equal(campaign.cores.length, 4);
assert.deepEqual(campaign.cores.map(core => core.cost), [0, 20, 32, 44]);
for (const removed of ["operations", "getOperation", "isAvailable", "nextOperation", "evaluate", "complete"]) assert.equal(campaign[removed], undefined, "Contracts must not remain as a runtime game mode");
assert.equal(campaign.isCoreOwned(fresh, "standard"), true);
assert.equal(campaign.isCoreAvailable(fresh, "standard"), true);
assert.equal(campaign.purchaseCore(fresh, "standard", 1000), null);
for (const id of ["unknown", "__proto__", "toString", null]) {
  assert.equal(campaign.getCore(id), null);
  assert.equal(campaign.isCoreOwned(fresh, id), false);
  assert.equal(campaign.isCoreAvailable(fresh, id, { bestTime: 999 }), false);
  assert.equal(campaign.purchaseCore(fresh, id, 1000, { bestTime: 999 }), null);
}
assert.throws(() => { campaign.cores[0].hpMultiplier = 99; }, TypeError);
const expectedCoreStats = {
  standard: [1, 1, 1, 1], striker: [.75, 1, .85, 1],
  bulwark: [1.35, .85, 1, 1], salvager: [1, 1, 1.1, 1.2]
};
for (const core of campaign.cores) {
  assert.equal(core.hpMultiplier, 1);
  assert.deepEqual([core.moduleHpMultiplier, core.speedMultiplier, core.cooldownMultiplier, core.matterMultiplier], expectedCoreStats[core.id], "Core tradeoffs remain unchanged");
}
const depthGates = { striker: [180, 1, 3], bulwark: [360, 3, 6], salvager: [600, 5, 9] };
const oldIds = Array.from({ length: 15 }, (_, index) => `sector${Math.floor(index / 3) + 1}-${index % 3 + 1}`);
for (const core of campaign.cores.slice(1)) {
  const [seconds, bosses, oldClears] = depthGates[core.id];
  assert.equal(campaign.isCoreAvailable(fresh, core.id), false);
  assert.equal(campaign.isCoreAvailable(fresh, core.id, { bestTime: seconds - 1, bossesDefeated: bosses - 1 }), false);
  assert.equal(campaign.isCoreAvailable(fresh, core.id, { bestTime: seconds }), true, "Depth alone can earn a core license");
  assert.equal(campaign.isCoreAvailable(fresh, core.id, { bossesDefeated: bosses }), true, "Lifetime bosses offer an alternative to depth");
  assert.match(campaign.coreRequirementText(core.id), / or defeat /);
  for (const invalid of [NaN, Infinity, -1, {}, [], false]) assert.equal(campaign.isCoreAvailable(fresh, core.id, { bestTime: invalid, bossesDefeated: invalid }), false);
  const state = campaign.normalize();
  const before = JSON.stringify(state);
  assert.equal(campaign.purchaseCore(state, core.id, 1000), null, "Currency alone cannot bypass a milestone");
  for (const invalidBalance of [core.cost - .01, -1, NaN, Infinity, "100", null]) {
    assert.equal(campaign.purchaseCore(state, core.id, invalidBalance, { bestTime: seconds }), null);
    assert.equal(JSON.stringify(state), before, "Rejected purchases must be atomic");
  }
  assert.deepEqual(campaign.purchaseCore(state, core.id, core.cost, { bestTime: seconds }), { fragments: 0, cost: core.cost });
  assert.equal(campaign.isCoreOwned(state, core.id), true);
  assert.equal(campaign.purchaseCore(state, core.id, 1000, { bestTime: seconds }), null, "Repeated clicks cannot spend twice");
  state.selectedCore = core.id;
  assert.deepEqual(campaign.normalize(JSON.parse(JSON.stringify(state))), state);
  const legacy = { completed: oldIds.slice(0, oldClears), purchasedCores: [], selectedCore: "standard" };
  const copied = JSON.stringify(legacy);
  const migrated = campaign.normalize(legacy);
  assert.equal(campaign.isCoreAvailable(migrated, core.id), true, "Every previously earned core offer stays available");
  assert.equal(campaign.isCoreOwned(migrated, core.id), false, "Earned availability never fabricates a purchase");
  assert.deepEqual(campaign.normalize(migrated), migrated);
  assert.equal(JSON.stringify(legacy), copied);
  assert.equal(campaign.isCoreAvailable(campaign.normalize({ completed: oldIds.slice(0, oldClears - 1) }), core.id), false);
  assert.deepEqual(campaign.purchaseCore(migrated, core.id, core.cost), { fragments: 0, cost: core.cost });
}
const malformed = campaign.normalize({ completed: ["sector1-2", "sector1-1", "sector1-1", "sector2-2", "bad", null], mastered: ["sector1-1", "sector1-1", "sector2-2", "bad"], purchasedCores: ["salvager", "salvager", "bad", {}], legacyEligibleCores: ["striker", "striker", "bad"], selectedCore: "salvager" });
assert.deepEqual(malformed, { schemaVersion: 2, completed: ["sector1-2", "sector1-1", "sector2-2"], mastered: ["sector1-1", "sector2-2"], purchasedCores: ["salvager"], legacyEligibleCores: ["striker"], selectedCore: "salvager" });
assert.equal(campaign.isCoreOwned(malformed, "salvager"), true, "Owned cores survive damaged history");
assert.equal(campaign.isCoreAvailable(campaign.normalize({ completed: ["sector1-1", "sector2-1", "sector2-2"] }), "striker"), false, "Old incomplete prerequisites cannot fabricate earned access");
assert.deepEqual(campaign.normalize({ completed: "sector1-1", mastered: {}, purchasedCores: false, selectedCore: "striker" }), fresh);
const original = { completed: [oldIds[0]], mastered: [], purchasedCores: ["striker"], legacyEligibleCores: ["bulwark"], selectedCore: "striker" };
const source = JSON.stringify(original);
const copied = campaign.normalize(original);
copied.completed.push(oldIds[1]);
copied.purchasedCores.push("bulwark");
copied.legacyEligibleCores.push("salvager");
assert.equal(JSON.stringify(original), source, "Migration must not share arrays with its source");
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../campaign.js"), "utf8"), browser);
assert.equal(browser.window.DriftCampaign.getCore("standard").hpMultiplier, 1);
assert.equal(typeof browser.window.DriftCampaign.isCoreAvailable, "function");
console.log("Core checks passed: existing four cores and prices, independent depth/boss gates, earned legacy offers, archived history, purchase and selection preservation, atomic spending, no runtime contracts, malformed state, and browser export.");
