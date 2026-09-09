"use strict";

const assert = require("node:assert/strict");
const upgrades = require("../run-upgrades.js");
const types = ["cannon", "scatter", "missile", "laser", "cryo", "arc", "rail", "flak", "pulse", "mine", "ember", "gravity"];
const singleCopyPrices = [18, 35, 25, 30, 50, 40, 70];
const fourCopyPrices = [31, 62, 44, 53, 88, 70, 123];
const milestoneRanks = [4, 7, 9];
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
assert.equal(upgrades.MAX_RANK, 9, "Stored ranks must remain zero-based");
assert.equal(upgrades.MAX_LEVEL, 10, "The displayed cap must be Lv10");

function baseFor(id) {
  return Object.freeze({ id, damage: 100, cooldown: 2, range: 400, shots: 1, pellets: 7, spread: .6, chains: 4,
    jumpRange: 250, blastRadius: 80, slowFactor: .5, slowDuration: 2, fieldRadius: 100,
    fieldDuration: 2, pullStrength: 100, burnDamage: 6, burnDuration: 2.5, coneAngle: .65, beamWidth: 11 });
}

let completedTracks = 0;
for (const type of types) {
  const base = baseFor(type);
  assert.equal(upgrades.label(type), "Lv1/10");
  assert.equal(upgrades.label(type, { level: 1 }), "Lv2/10 · Tuned");
  const branches = upgrades.options(type, { level: 1 });
  assert.equal(branches.length, 2, `${type}: the Lv3 choice must remain a pair of branches`);
  for (const branch of branches) {
    const state = {};
    const tune = upgrades.options(type)[0];
    assert.equal(tune.rank, 0);
    assert.equal(upgrades.purchase(state, type, "tune", 20, 1, tune.rank).matter, 0);
    assert.equal(upgrades.purchase(state, type, branch.id, 48, 1, branch.rank).matter, 0);
    assert.equal(state[type].level, 2);
    const specialized = upgrades.resolve(base, state[type]);
    const cachedSpecialization = { ...specialized };
    assert.equal(specialized.cooldown, upgrades.resolve(base, state[type]).cooldown);
    let totalSpent = 68;
    let previous = specialized;
    for (let expectedRank = 2; expectedRank < upgrades.MAX_RANK; expectedRank += 1) {
      const options = upgrades.options(type, state[type]);
      assert.equal(options.length, 1, `${type}: after specialization there must be one upgrade per level`);
      const option = options[0];
      assert.equal(option.id, "calibrate");
      assert.equal(option.rank, expectedRank);
      assert.equal(option.milestone, milestoneRanks.includes(expectedRank + 1));
      assert.ok(option.description.length > 12, "Each purchase must explain the effect in the choice card");
      assert.equal(option.cost, singleCopyPrices[expectedRank - 2]);
      assert.equal(upgrades.options(type, state[type], 4)[0].cost, fourCopyPrices[expectedRank - 2]);
      const before = structuredClone(state);
      assert.equal(upgrades.purchase(state, type, option.id, option.cost - .01, 1, option.rank), null);
      assert.deepEqual(state, before, "Insufficient Matter must not alter the level or branch");
      for (const rejectedChoice of ["tune", ...branches.map(item => item.id)]) {
        assert.equal(upgrades.purchase(state, type, rejectedChoice, 100000, 1, option.rank), null,
          "A later purchase must never replay tuning or replace a branch");
      }
      for (const staleRank of [option.rank - 1, option.rank + 1, String(option.rank), null, NaN, Infinity]) {
        assert.equal(upgrades.purchase(state, type, option.id, 100000, 1, staleRank), null);
      }
      assert.deepEqual(state, before, "Rejected rank guards must never spend or advance progress");
      const purchase = upgrades.purchase(state, type, option.id, option.cost, 1, option.rank);
      assert.equal(purchase.matter, 0, "Exact affordability must buy exactly one level");
      assert.equal(state[type].level, expectedRank + 1);
      assert.equal(state[type].branch, branch.id);
      totalSpent += option.cost;
      const after = structuredClone(state);
      assert.equal(upgrades.purchase(state, type, option.id, 100000, 1, option.rank), null,
        "A repeated callback carrying the previous rank must not buy the next level");
      assert.deepEqual(state, after);
      const resolved = upgrades.resolve(base, Object.freeze({ ...state[type] }));
      if (option.milestone) {
        near(resolved.damage, previous.damage, `${type}: milestones replace another small damage rank`);
        const changed = Object.keys(resolved).filter(key => resolved[key] !== previous[key]);
        assert.ok(changed.length > 0 && changed.every(key => key !== "damage" && key !== "burnDamage"),
          `${type}: every milestone must change attack behavior or coverage`);
      } else {
        near(resolved.damage - previous.damage, specialized.damage * .12, `${type}: intermediate ranks must add a fixed amount`);
      }
      assert.deepEqual(specialized, cachedSpecialization, "Later resolutions must not mutate an existing cached combat definition");
      assert.deepEqual(resolved, upgrades.resolve(base, state[type]), "Resolving repeatedly must not compound stat bonuses");
      previous = resolved;
    }
    assert.equal(totalSpent, 336, "The single-copy Lv1–Lv10 track must have a stable total price");
    assert.equal(upgrades.label(type, state[type]), `Lv10/10 · ${branch.name}`);
    assert.deepEqual(upgrades.options(type, state[type]), []);
    const atCap = structuredClone(state);
    assert.equal(upgrades.purchase(state, type, "calibrate", 1000000000, 1, 9), null);
    assert.deepEqual(state, atCap);
    const maxed = upgrades.resolve(base, state[type]);
    near(maxed.damage, specialized.damage * 1.48, `${type}: four power ranks must stop at +48%`);
    near(maxed.burnDamage, specialized.burnDamage * (type === "ember" ? 1.48 : 1), "Ember burn DPS must receive power-rank growth");
    assert.ok(maxed.shots <= 5 && maxed.pellets <= 13 && maxed.chains <= 12, "Milestones must keep attack fan-out bounded");
    assert.ok(maxed.cooldown >= base.cooldown * .25, "Milestones must not create an unbounded rapid-fire track");
    assert.ok(Object.values(maxed).filter(value => typeof value === "number").every(value => Number.isFinite(value) && value >= 0));
    completedTracks += 1;
  }
}

const base = baseFor("cannon");
const malformed = [false, 0, 1, "2", [], {}, { level: "1" }, { level: 1.5 }, { level: NaN }, { level: Infinity },
  { level: -1 }, { level: 10, branch: "twin" }, { level: 0, branch: "twin" }, { level: 1, branch: "twin" },
  { level: 2 }, { level: 2, branch: "missing" }, { level: 7, branch: "calibrate" }, { level: 9, branch: null }];
for (const invalid of malformed) {
  const state = { cannon: invalid };
  const before = structuredClone(state);
  assert.deepEqual(upgrades.options("cannon", invalid), []);
  for (const choice of ["tune", "twin", "calibrate"]) assert.equal(upgrades.purchase(state, "cannon", choice, 100000), null);
  assert.deepEqual(state, before, "Malformed progress must not become a free or cheap fallback purchase");
  assert.deepEqual(upgrades.resolve(base, invalid), { ...base }, "Malformed progress must grant no combat bonus");
  assert.equal(upgrades.label("cannon", invalid), "Upgrade unavailable");
}
for (const container of [null, [], "state", Object.freeze({}), Object.freeze({ cannon: { level: 1 } }), Object.create({ cannon: { level: 1 } })]) {
  assert.equal(upgrades.purchase(container, "cannon", "tune", 10000), null);
}
const accessor = {};
Object.defineProperty(accessor, "cannon", { get() { throw new Error("A malformed upgrade accessor must not execute"); } });
assert.equal(upgrades.purchase(accessor, "cannon", "tune", 10000), null);
for (const copies of [0, -1, 1.5, "4", null, NaN, Infinity]) {
  const state = { cannon: { level: 2, branch: "twin" } };
  assert.deepEqual(upgrades.options("cannon", state.cannon, copies), []);
  assert.equal(upgrades.purchase(state, "cannon", "calibrate", 100000, copies), null);
  assert.equal(state.cannon.level, 2);
}
for (const rank of [2, 8]) {
  const state = { level: rank, branch: "twin" };
  const maximum = upgrades.options("cannon", state, 420)[0];
  assert.equal(upgrades.options("cannon", state, 421)[0].cost, maximum.cost);
  assert.equal(upgrades.options("cannon", state, Number.MAX_VALUE)[0].cost, maximum.cost);
  assert.ok(Number.isSafeInteger(maximum.cost) && maximum.cost > 0);
}
const sequential = { cannon: { level: 2, branch: "twin" } };
assert.equal(upgrades.purchase(sequential, "cannon", "calibrate", 18).matter, 0);
assert.equal(upgrades.purchase(sequential, "cannon", "calibrate", 35).matter, 0);
assert.equal(sequential.cannon.level, 4, "Old callers without a rank guard must retain intentional sequential purchases");
assert.equal(sequential.cannon.branch, "twin");

console.log(JSON.stringify({ passed: true, completedTracks, displayedCap: upgrades.MAX_LEVEL,
  totalCostOneCopy: 336, laterPricesOneCopy: singleCopyPrices, laterPricesFourCopies: fourCopyPrices,
  checked: ["all branches through Lv10", "visible milestones at Lv5/8/10", "bounded firing counts and cadence", "fixed-baseline power ranks", "unchanged cache and base", "exact affordability", "stale callback rejection", "malformed state rejection", "branch lock", "price/count bounds"] }, null, 2));
