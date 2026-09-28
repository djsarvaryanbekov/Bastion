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
assert.equal(Object.keys(api.MODULES).length, 18, "The module catalogue is unchanged");
assert.equal(api.current().nextBossAt, 180);

// Real core modifiers still apply to both starter and newly attached modules.
const profiles = [];
for (const core of cores.cores) {
  reset();
  api.save.campaign.purchasedCores = [core.id];
  api.save.campaign.selectedCore = core.id;
  const game = new api.Game(); api.activate(game);
  assert.ok(Math.abs(game.ship.tiles.get("0,-1").maxHp - api.MODULES.cannon.hp * core.moduleHpMultiplier) < 1e-8, "Starter uses baseline HP with the selected core modifier");
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


// The same ship continues past ten minutes without a checkpoint or duplicated payout.
reset();api.startRun();const game=api.current();game.state='building';game.matter=1000;
assert.ok(api.buyRunUpgrade('cannon','base1',0));assert.ok(api.buyRunUpgrade('cannon','base2',1));api.select('cannon');assert.ok(api.placePurchasedModule(1,0));api.closeBuild();
const ship=game.ship,matter=game.matter,upgrades=plain(game.upgrades);
game.elapsed=600;game.kills=10000;game.killsByMinute=[10000];game.bossesDefeated=3;game.checkSurvival();assert.equal(game.state,'playing');assert.equal(game.survivalCompleted,false);assert.equal(api.ui.milestoneOverlay.classList.contains('hidden'),true);
assert.equal(game.ship,ship);assert.equal(game.matter,matter);assert.deepEqual(plain(game.upgrades),upgrades);assert.equal(api.save.fragments,0);
game.finishRun(false,true);assert.equal(api.save.fragments,56);assert.equal(game.state,'result');game.finishRun(false,true);assert.equal(api.save.fragments,56);
api.returnToMenu();api.startRun();assert.equal(api.current().matter,0);assert.deepEqual(plain(api.current().upgrades),{});assert.equal(api.current().ship.tiles.size,2);assert.equal(api.save.fragments,56);
// Removed Drive licenses are archived and refunded once; existing settings and bonuses survive.
reset();const old=api.defaultSave();old.version=8;old.fragments=17;old.fragmentCarryUnits=123;old.meta={core:0,modules:10,matter:8,drive:6,damage:10};old.campaign={purchasedCores:['striker'],selectedCore:'striker'};old.progression.purchasedModules=['drive','scatter'];old.settings.uiScale=125;
const migrated=api.sanitizeSave(old);assert.equal(migrated.fragments,53);assert.equal(migrated.fragmentCarryUnits,123);assert.equal(migrated.settings.uiScale,125);assert.deepEqual(plain(migrated.progression.retiredModules),['drive']);assert.deepEqual(plain(migrated.progression.purchasedModules),['scatter']);
assert.equal(migrated.campaign.coreRanks.striker.modules,25);assert.equal(migrated.campaign.legacyBonuses.striker.modules,.25);assert.equal(migrated.campaign.coreRanks.standard.damage,25);assert.ok(Math.abs(migrated.campaign.legacyBonuses.striker.damage-.15)<1e-9);assert.deepEqual(plain(api.sanitizeSave(migrated)),plain(migrated));
Object.assign(api.save,migrated);const probe=new api.Game();const damage=probe.coreBonus('damage');api.save.campaign.selectedCore='standard';api.save.campaign.coreRanks.standard.damage=0;assert.equal(probe.coreBonus('damage'),damage,'Active run snapshots its core ranks');
old.meta={core:10,modules:0,matter:0,drive:0,damage:0};
const coreOnly=api.sanitizeSave(old);
assert.ok(350*(1+coreOnly.campaign.coreRanks.standard.modules*.01+coreOnly.campaign.legacyBonuses.standard.modules)>=450-1e-9,'Preserve legacy core HP above new rank cap');
assert.deepEqual(plain(api.sanitizeSave(coreOnly)),plain(coreOnly));
console.log(JSON.stringify({passed:true,profiles,checks:['Endless past 600 seconds','Same ship and purchases','One payout and run reset','Owned licenses and settings preserved','Drive refunded exactly once','Legacy bonuses preserved beyond new cap','Active core snapshot']}));
