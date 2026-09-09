"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "let installPromptCalls";
const source = fs.readFileSync("game.js", "utf8");
const exposure = "    window.__driftBastion = {";
assert.ok(harness.includes(marker) && source.includes(exposure));
const instrumented = source.replace(exposure,
  "    window.__economyTest = { Game: Game, save: save, defaultSave: defaultSave, price: modulePrice, place: placePurchasedModule, buy: buyRunUpgrade, reward: runFragmentReward, activate: function (instance) { game = instance; selectedBuildModule = 'cannon'; } };\n" + exposure);
const bootstrap = {
  console, URLSearchParams,
  setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      return file === "game.js" ? instrumented : fs.readFileSync(file, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf(marker)) + "\nglobalThis.runtime = sandbox;", bootstrap);
const api = bootstrap.runtime.__economyTest;
const upgrades = bootstrap.runtime.DriftRunUpgrades;
const progression = bootstrap.runtime.DriftProgression;
Object.assign(api.save, api.defaultSave());
api.save.fragments = 123;
api.save.fragmentCarryUnits = 347680;
const permanentWallet = {fragments: api.save.fragments, carryUnits: api.save.fragmentCarryUnits};
const game = new api.Game();
api.activate(game);
assert.equal(game.ship.tiles.get("0,-1").maxHp, 75, "Starter Cannon receives 1.5x base HP");
game.state = "building";
game.matter = 10000;
const expansionCosts = [];
for (let row = 2; row <= 8; row++) {
  expansionCosts.push(api.price("cannon"));
  api.place(0, -row);
}
assert.deepEqual(expansionCosts, [25,30,37,45,55,66,81]);
assert.equal(game.matter, 9661);
assert.equal(game.ship.tiles.get("0,-2").maxHp, 50, "Purchased copies retain normal durability");
assert.equal(game.upgradeFleetSizes.cannon, 8);
assert.equal(api.price("cannon"), 99);
assert.equal(api.buy("cannon", "tune", 0), true);
assert.equal(api.buy("cannon", "twin", 1), true);
const branchDamage = game.weaponDefinitions.cannon.damage;
const balanceBeforeLoss = game.matter;
game.destroyTile("0,-2");
assert.equal(game.modulesLost, 7, "Disconnected branch losses must reduce the fitted count too");
assert.equal(api.price("cannon"), 25, "One survivor must restore the first paid-copy price");
assert.equal(game.matter, balanceBeforeLoss, "Destruction must not refund Matter");
assert.equal(game.upgrades.cannon.branch, "twin");
assert.equal(game.weaponDefinitions.cannon.damage, branchDamage);
assert.equal(game.upgradeFleetSizes.cannon, 8, "Global upgrade investment must survive losses");
const globalUpgrade = upgrades.options("cannon", game.upgrades.cannon, game.upgradeFleetSizes.cannon)[0];
assert.equal(globalUpgrade.cost, 49);
assert.equal(api.buy("cannon", "calibrate", 2), true);
assert.equal(game.matter, balanceBeforeLoss - 49);
assert.equal(api.buy("cannon", "calibrate", 2), false, "A stale upgrade button must not buy another level");
for (let attempt = 0; attempt < 3; attempt++) {
  const before = game.matter;
  api.place(0, -2);
  assert.equal(game.matter, before - 25);
  game.destroyTile("0,-2");
  assert.equal(api.price("cannon"), 25, "Repeated losses must not increase replacement prices");
}
game.destroyTile("0,-1");
assert.equal(api.price("cannon"), 20);
assert.equal(api.buy("cannon", "calibrate", 3), false, "An absent weapon cannot be upgraded");
api.place(0, -1);
assert.equal(game.upgrades.cannon.level, 3, "Rebuilt weapons retain the family's purchased level");
assert.equal(game.weaponDefinitions.cannon.damage, branchDamage * 1.12);
const fresh = new api.Game();
api.activate(fresh);
assert.equal(fresh.upgradeFleetSizes.cannon, 1);
assert.equal(Object.keys(fresh.upgrades).length, 0);
assert.equal(api.price("cannon"), 25);
assert.deepEqual({fragments: api.save.fragments, carryUnits: api.save.fragmentCarryUnits}, permanentWallet,
  "Placement, Matter spending, family upgrades and losses must never consume the permanent Fragments wallet or its saved fraction");

for (const kills of [0, -1, NaN, Infinity]) assert.equal(api.reward(kills, 10000, 10), 0);
assert.equal(api.reward(1, 0, 0), 0, "An instantaneous restart cannot mint a minimum reward");
assert.equal(api.reward(14, 30, 0), 0);
assert.equal(api.reward(15, 30, 0), 0, "A short run accumulates saved sub-Fragment progress instead of a flat defeat reward");
assert.equal(api.reward(75, 150, 1), 6, "The first boss can afford a first four-Fragment licence without emptying the catalogue");
assert.equal(api.reward(300, 600, 3, false), 26);
assert.equal(api.reward(300, 600, 3, true), 36, "A completed main run receives the ten-Fragment culmination bonus");
assert.equal(api.reward(300, 599, 3, true), 25, "The completion bonus cannot be claimed before ten minutes");
assert.equal(api.reward(300, 600, 0, true), 16, "Time alone cannot claim the completion bonus without a boss kill");
assert.equal(api.reward(300, 600, 2, true), 22, "Two bosses cannot claim the main-run completion bonus");
assert.equal(api.reward(10000, 600, 0), 16, "Kill income must stay capped even for a dense late swarm");
assert.equal(api.reward(10000, 1200, 6, true), 47, "Continuing the same run must keep earning time and boss rewards");
assert.equal(api.reward(10000, 1200, 7, true) - api.reward(10000, 1200, 6, true), 2,
  "Late bosses must keep a predictable two-Fragment marginal reward");
const shortRun = {kills: 15, elapsed: 30, bosses: 0};
let wallet = 0, carryUnits = 0;
for (let i = 0; i < 20; i++) {
  const settled = progression.settleRunReward(shortRun, carryUnits);
  wallet += settled.fragments;
  carryUnits = settled.carryUnits;
}
assert.equal(wallet, 16);
assert.equal(carryUnits, 0);
assert.ok(api.reward(300, 600, 3, true) > wallet,
  "Twenty short resets must earn less than a full ten-minute clear over equal combat time");
const firstBoss = progression.settleRunReward({elapsed: 134.23, kills: 184, bosses: 1});
assert.equal(firstBoss.fragments, 5);
assert.equal(firstBoss.carryUnits, 347680);
const firstBossRate = (firstBoss.fragments + firstBoss.carryUnits / firstBoss.scale) / 134.23;
assert.ok(36 / 600 > firstBossRate, "Finishing the main run must out-earn repeated first-boss exits per second");
assert.deepEqual({fragments: api.save.fragments, carryUnits: api.save.fragmentCarryUnits}, permanentWallet,
  "Reward quotes are pure and cannot settle into the real wallet");
console.log(JSON.stringify({ passed: true, expansionCosts, afterSevenLosses: 25, afterAllLosses: 20,
  verified: ["Real placement and disconnected losses", "No replacement inflation", "No destruction refunds", "Upgrade retention", "Peak upgrade pricing", "Stale button rejection", "Fresh-run reset", "Separate Matter and Fragments wallets", "Saved fractional progress", "Completion bonus guards", "Continuing-run income", "Full-run reward beats reset farming"] }, null, 2));
