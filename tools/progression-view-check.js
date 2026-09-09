"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const progression = require("../progression.js");
const view = require("../progression-view.js");
const names = { shield: { name: "Shield Node" }, scatter: { name: "Scatter Cannon" } };
const model = (progress, fragments, newTypes = []) => view.buildResultModel(progression, progress, fragments, newTypes, names);

function freshRun(elapsed, kills, bosses, completed) {
  const progress = progression.normalize();
  const newTypes = progression.apply(progress, { elapsed, kills, bosses });
  const reward = progression.runReward({ elapsed, kills, bosses, completed });
  return { progress, newTypes, reward, result: model(progress, reward, newTypes) };
}

const early = freshRun(30, 15, 0);
assert.equal(early.reward, 0, "A short run with no saved fraction does not earn a restart minimum");
assert.deepEqual(early.result, {
  availableCount: 2, affordableCount: 0, offers: [], availableNewTypes: ["scatter", "shield"],
  goal: { type: "scatter", label: "Save for a module", text: "Scatter Cannon · 4 more Fragments (4 total)", value: 0, max: 4 }
});
const ninety = freshRun(90, 45, 0);
assert.equal(ninety.reward, 2);
assert.equal(ninety.result.availableCount, 6);
assert.equal(ninety.result.affordableCount, 0);
assert.equal(ninety.result.goal.type, "scatter");
const firstBoss = freshRun(134.23, 184, 1);
assert.equal(firstBoss.reward, 5);
assert.equal(firstBoss.result.availableCount, 7);
assert.equal(firstBoss.result.affordableCount, 2);
assert.deepEqual(firstBoss.result.offers.map(offer => offer.type), ["scatter", "shield"]);
assert.equal(firstBoss.result.goal, null, "Affordable choices do not compete with another goal bar");
const clear = freshRun(600, 300, 3, true);
assert.equal(clear.reward, 36);
assert.equal(clear.result.availableCount, 16, "An actual first clear has three bosses, not five");
assert.equal(clear.result.affordableCount, 4, "A full clear cannot afford the middle and late catalogue immediately");
assert.ok(!clear.result.availableNewTypes.includes("rail"), "Rail still needs five lifetime bosses");
assert.equal(clear.result.offers.length, 3);

const ordered = model(clear.progress, 80, ["mine", "pulse", "pulse", "unknown"]);
assert.deepEqual(ordered.offers.map(offer => offer.type), ["pulse", "mine", "scatter"], "New affordable offers lead; equal prices use definition order");
assert.deepEqual(ordered.availableNewTypes, ["pulse", "mine"]);
assert.equal(ordered.offers[2].newlyAvailable, false);
const olderCheap = model(firstBoss.progress, 4, ["missile"]);
assert.deepEqual(olderCheap.offers.map(offer => offer.type), ["scatter", "shield"], "A new expensive offer cannot displace an affordable older one");
assert.deepEqual(olderCheap.availableNewTypes, ["missile"], "New eligibility is reported even when the offer cannot be bought yet");

const owned = progression.normalize(early.progress);
assert.ok(progression.purchase(owned, "scatter", 4));
assert.deepEqual(model(owned, 2, ["scatter", "shield"]).goal, {
  type: "shield", label: "Save for a module", text: "Shield Node · 2 more Fragments (4 total)", value: 2, max: 4
});
assert.deepEqual(model(owned, 4, ["scatter"]).availableNewTypes, []);
const legacy = progression.normalize({ schemaVersion: 4, purchasedModules: ["rail"], legacyEligibleModules: ["laser"] });
assert.equal(model(legacy, 0, ["laser", "rail"]).goal.type, "laser", "Retained eligibility overrides current missing gates");
assert.deepEqual(model(legacy, 56).offers, [{ type: "laser", cost: 56, newlyAvailable: false }]);

const fresh = progression.normalize();
assert.deepEqual(model(fresh, 999).goal, {
  type: "scatter", label: "More modules", text: "Defeat 15 enemies across runs", value: 0, max: 15
});
progression.apply(fresh, { elapsed: 29, kills: 1 });
assert.equal(model(fresh, 999).goal.type, "shield", "Before eligibility, compare real objective completion fractions");
assert.equal(model(fresh, 999).goal.value, 29);
assert.equal(model(fresh, 999).goal.max, 30);
const allOwned = progression.normalize({ schemaVersion: 4, purchasedModules: progression.definitions.map(def => def.type) });
assert.deepEqual(model(allOwned, 1000, ["shield"]), { availableCount: 0, affordableCount: 0, offers: [], availableNewTypes: [], goal: null });

for (const invalid of [Infinity, -Infinity, NaN, -100, null, undefined, [], {}, false, "not money"]) {
  const result = model(early.progress, invalid);
  assert.equal(result.affordableCount, 0);
  assert.equal(result.goal.value, 0);
  assert.ok(!/NaN|Infinity/.test(result.goal.text));
}
assert.equal(model(early.progress, "4").affordableCount, 2);
assert.equal(model(early.progress, 2.5).goal.text, "Scatter Cannon · 1.5 more Fragments (4 total)");

const progressBefore = JSON.stringify(clear.progress);
const typesBefore = JSON.stringify(clear.newTypes);
Object.freeze(clear.progress.purchasedModules);
Object.freeze(clear.progress.legacyEligibleModules);
Object.freeze(clear.progress);
Object.freeze(clear.newTypes);
const detached = model(clear.progress, 36, clear.newTypes);
detached.offers[0].cost = 9999;
detached.availableNewTypes.push("unknown");
assert.equal(JSON.stringify(clear.progress), progressBefore);
assert.equal(JSON.stringify(clear.newTypes), typesBefore);
assert.equal(model(clear.progress, 36, clear.newTypes).offers[0].cost, 4);

for (const [bonus, unit] of [[5, "module HP"], [5, "Matter income"], [3, "movement"], [4, "damage"]]) {
  const first = view.buildMetaComparison(0, 3, bonus, unit);
  assert.equal(first.currentPercent, 0);
  assert.equal(first.nextPercent, bonus);
  assert.equal(first.text, `+0% → +${bonus}% ${unit}`);
  const last = view.buildMetaComparison(2, 3, bonus, unit);
  assert.equal(last.nextPercent, bonus * 3);
  assert.equal(last.maxed, false);
  const capped = view.buildMetaComparison(3, 3, bonus, unit);
  assert.equal(capped.text, `+${bonus * 3}% ${unit} · Max`);
  assert.equal(capped.nextRank, 3);
  assert.equal(capped.maxed, true);
  const retained = view.buildMetaComparison(10, 3, bonus, unit);
  assert.equal(retained.currentPercent, bonus * 10, "Old purchased ranks must not be visually reduced to the new cap");
  assert.equal(retained.nextPercent, bonus * 10);
  assert.equal(retained.text, `+${bonus * 10}% ${unit} · Retained`);
}
assert.equal(view.buildMetaComparison("1", "3", "2.5", " damage ").text, "+2.5% → +5% damage");
for (const invalid of [Infinity, NaN, -4, null, undefined, {}, []]) {
  const comparison = view.buildMetaComparison(invalid, invalid, invalid, invalid);
  assert.equal(comparison.rank, 0);
  assert.equal(comparison.currentPercent, 0);
  assert.equal(comparison.maxed, true);
  assert.ok(!/NaN|Infinity/.test(comparison.text));
}
const browser = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve("../progression-view.js"), "utf8"), browser);
assert.equal(typeof browser.window.DriftProgressionView.buildResultModel, "function");
assert.equal(browser.window.DriftProgressionView.buildMetaComparison(1, 3, 5, "module HP").text, "+5% → +10% module HP");
console.log("Progression view checks passed: actual fresh rewards and three-boss clear, affordability and deterministic suggestions, savings/eligibility goals, owned/legacy/all-owned states, detached data, finite values, current-to-next meta totals and retained ranks.");
