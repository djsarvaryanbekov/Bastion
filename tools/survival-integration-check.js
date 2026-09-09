"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const source = fs.readFileSync("game.js", "utf8").replace(marker,
  "    window.__survivalTest = { Game, save, ui, makeTile, MODULES, defaultSave, sanitizeSave, storeSave, startRun, returnToMenu, continueSurvival, updateHud, buyModuleUnlock, buyRunUpgrade, renderMetaShop, openBuild, closeBuild, placePurchasedModule, select: function(type) {selectedBuildModule = type;}, current: function() { return game; }, activate: function(value) {game = value;}, setKeys: function(value) { keys = value; } };\n" + marker);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) { return file === "game.js" ? source : fs.readFileSync(file, encoding); } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
const { runtime } = bootstrap;
const api = runtime.__survivalTest;
const progression = runtime.DriftProgression;
const cores = runtime.DriftCampaign;
const reset = () => { api.activate(null); Object.assign(api.save, api.defaultSave()); };

// An old selection requiring unowned support modules must never block the new Play.
reset();
api.save.campaign.selectedOperation = "sector5-3";
api.startRun();
assert.equal(api.current().state, "playing");
assert.equal(api.ui.startButton.disabled, false);
assert.equal(Object.keys(api.MODULES).length, 19, "The module catalogue is unchanged");
assert.equal(api.current().nextBossAt, 120);

// Real core modifiers still apply to both starter and newly attached modules.
const profiles = [];
for (const core of cores.cores) {
  reset();
  api.save.campaign.purchasedCores = [core.id];
  api.save.campaign.selectedCore = core.id;
  const game = new api.Game(); api.activate(game);
  assert.ok(Math.abs(game.ship.tiles.get("0,-1").maxHp - api.MODULES.cannon.hp * 1.5 * core.moduleHpMultiplier) < 1e-8, "Starter HP applies the 1.5 multiplier and selected core modifier");
  api.setKeys({ KeyW: true, KeyD: true }); game.updateMovement(1 / 30); api.setKeys({});
  const speed = Math.hypot(game.ship.vx, game.ship.vy);
  profiles.push({ id: core.id, speed });
  game.matter = 1000; game.state = "building"; api.select("cannon"); api.placePurchasedModule(1, 0);
  assert.equal(game.ship.tiles.get("1,0").maxHp, api.MODULES.cannon.hp * core.moduleHpMultiplier);
  api.save.campaign.selectedCore = "standard";
  assert.equal(game.coreDef.id, core.id, "Next run choices cannot alter active ship stats");
}
for (const profile of profiles) assert.ok(Math.abs(profile.speed / profiles[0].speed - cores.getCore(profile.id).speedMultiplier) < 1e-9);

// Full legacy save round-trip: currency, ranks, licences, equipped starter, cores and earned access.
reset();
const legacy = api.defaultSave(); legacy.version = 5;
legacy.fragments = 137; legacy.bestTime = 120; legacy.bestKills = 70;
legacy.meta = { core: 10, modules: 10, matter: 10, drive: 10, damage: 10 };
legacy.progression = { schemaVersion: 3, totalKills: 70, bestTime: 120, bossesDefeated: 1, totalUpgrades: 2,
  contractsCompleted: 9, purchasedModules: ["scatter", "shield", "rail"], legacyEligibleModules: ["gravity"] };
legacy.campaign = { completed: Array.from({ length: 9 }, (_, i) => "sector" + (Math.floor(i / 3) + 1) + "-" + (i % 3 + 1)),
  mastered: ["sector1-1"], purchasedCores: ["striker"], selectedCore: "striker", selectedOperation: "sector4-1" };
legacy.lastLoadout.selectedWeapon = "rail";
Object.assign(api.save, api.sanitizeSave(legacy)); api.storeSave();
const stored = JSON.parse(runtime.localStorage.getItem("drift-bastion-save-v2"));
const reloaded = api.sanitizeSave(stored);
assert.equal(reloaded.fragments, 137);
assert.deepEqual(plain(reloaded.meta), legacy.meta);
assert.deepEqual(plain(reloaded.progression.purchasedModules), legacy.progression.purchasedModules);
assert.equal(reloaded.lastLoadout.selectedWeapon, "rail");
assert.equal(reloaded.campaign.selectedCore, "striker");
assert.ok(cores.isCoreAvailable(reloaded.campaign, "salvager", reloaded.progression), "Old earned core access survives changed goals");
assert.ok(progression.canPurchase(reloaded.progression, "gravity"));
assert.deepEqual(plain(api.sanitizeSave(reloaded)), plain(reloaded), "Migration must be idempotent");

// Milestone: no premature completion, paused choice, same live ship, no reward duplication.
reset(); api.startRun();
const game = api.current();
game.state = "building"; game.matter = 1000;
assert.ok(api.buyRunUpgrade("cannon", "tune", 0));
assert.ok(api.buyRunUpgrade("cannon", "twin", 1));
api.select("cannon"); api.placePurchasedModule(1, 0); api.closeBuild();
game.enemies.length = 0; game.enemyById.clear(); game.kills = 350;
game.elapsed = 599.9; game.bossesDefeated = 3; game.checkSurvival();
assert.equal(game.survivalCompleted, false);
game.elapsed = 600; game.bossesDefeated = 2; game.checkSurvival();
assert.equal(game.survivalCompleted, false, "Elapsed time alone cannot skip the last boss");
game.bossesDefeated = 3; game.checkSurvival();
assert.equal(game.state, "milestone"); assert.equal(api.ui.milestoneOverlay.classList.contains("hidden"), false);
const ship = game.ship, upgrades = plain(game.upgrades), matter = game.matter;
const fragments = api.save.fragments;
game.update(1); assert.equal(game.elapsed, 600, "The decision pauses combat");
api.continueSurvival();
assert.equal(api.current(), game); assert.equal(game.ship, ship);
assert.deepEqual(plain(game.upgrades), upgrades); assert.equal(game.matter, matter);
assert.equal(game.nextBossAt, 780); assert.equal(game.recoveryUntil, 608);
assert.equal(api.save.fragments, fragments, "Continuation must not pay a reward twice");
game.checkSurvival(); assert.equal(game.state, "playing", "The checkpoint must not reopen");
const payout = progression.runReward({ elapsed: 600, kills: 350, bosses: 3, completed: true });
game.applyDamageToTile("0,0", 1e9);
assert.equal(game.finished, true); assert.equal(api.save.fragments, fragments + payout);
game.finishRun(true, true); assert.equal(api.save.fragments, fragments + payout);
assert.ok(game.survivalCompleted, "Death after continuing keeps the completion bonus");
api.returnToMenu(); api.startRun();
assert.equal(api.current().upgrades.cannon, undefined); assert.equal(api.current().continued, false);
assert.equal(api.save.fragments, fragments + payout);

reset(); api.startRun();
const banked = api.current(); banked.elapsed = 600; banked.bossesDefeated = 3; banked.kills = 300;
banked.checkSurvival(); api.ui.finishSurvivalButton.listeners.click();
assert.equal(banked.finished, true); assert.equal(api.ui.resultTitle.textContent, "SURVIVAL COMPLETE");
const firstBank = api.save.fragments; api.ui.finishSurvivalButton.listeners.click();
assert.equal(api.save.fragments, firstBank);

console.log(JSON.stringify({ passed: true, profiles, completionPayout: firstBank,
  checked: ["ungated Play", "19 unchanged modules", "core modifiers", "legacy ownership/currency/access round-trip", "600s and three boss checkpoint", "same ship continuation", "death retains earned bonus", "one payout", "fresh run reset"] }, null, 2));
