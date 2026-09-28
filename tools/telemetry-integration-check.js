"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const original = fs.readFileSync("game.js", "utf8");
assert.ok(original.includes(marker));
const gameSource = original.replace(marker,
  "    window.__telemetryHooksTest = { save, startRun, openBuild, closeBuild, buyRunUpgrade, placePurchasedModule, sellInstalledModule, telemetrySample, select: function(type) {selectedBuildModule = type;}, current: function() {return game;} };\n" + marker);
const bootstrap = { console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {}, process: { env: { BALANCE_SECONDS: "1" } },
  require(name) { return name === "fs" ? { ...fs, readFileSync(file, encoding) { return file === "game.js" ? gameSource : fs.readFileSync(file, encoding); } } : require(name); }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime = sandbox;", bootstrap);
const runtime = bootstrap.runtime, api = runtime.__telemetryHooksTest, telemetry = runtime.PlaytestTelemetry;
const plain = value => JSON.parse(JSON.stringify(value));
api.save.progression.purchasedModules.push("shield");
api.startRun();
const game = api.current();
game.enemies.length = 0; game.enemyById.clear();
let expectedOutgoingHp = 0, expectedOutgoingShield = 0;
game.elapsed = 40;
// Earn the fixture's funds through actual kills and damage hooks; never add debug Matter.
for (let index = 0; index < 150; index++) {
  const enemy = game.spawnEnemy("drone", 1000 + index, 1000);
  expectedOutgoingHp += enemy.hp;
  game.damageEnemy(enemy, 1000000);
  game.damageEnemy(enemy, 1000000);
}
assert.equal(game.kills, 150);
const fundsBeforeBuild = game.matter;
api.openBuild();
assert.equal(api.buyRunUpgrade("cannon", "base1", 0), true);
assert.equal(api.buyRunUpgrade("cannon", "base1", 0), false, "A stale duplicate upgrade must not generate a transaction");
assert.equal(api.buyRunUpgrade("cannon", "base2", 1), true);
api.select("cannon"); assert.equal(api.placePurchasedModule(1, 0), true);
const afterBuy = game.matter;
assert.equal(api.sellInstalledModule("1,0"), true);
const refund = game.matter - afterBuy;
assert.equal(refund, 0);
assert.equal(api.sellInstalledModule("1,0"), false, "A stale duplicate sale must not generate a transaction");
api.select("shield"); assert.equal(api.placePurchasedModule(1, 0), true);
api.closeBuild();
const shield = game.ship.tiles.get("1,0"), shieldBefore = shield.shield;
game.applyDamageToTile("0,0", 5);
assert.equal(shield.shield, shieldBefore - 5);
const absolute = api.telemetrySample();
assert.equal(absolute.coreHp, game.ship.tiles.get("0,0").hp);
assert.equal(absolute.coreMaxHp, game.ship.tiles.get("0,0").maxHp);
assert.equal(absolute.shield, shield.shield); assert.equal(absolute.shieldMax, shield.maxShield);
assert.ok(absolute.moduleHp > 0 && absolute.moduleMaxHp >= absolute.moduleHp);
telemetry.sample(absolute, true);
const built = plain(telemetry.getDataForTests().runs.at(-1));
assert.equal(built.stats.matterEarned - built.stats.matterSpent + built.stats.matterRefunded, game.matter, "Real upgrade/purchase/sale hooks reconcile all Matter");
assert.equal(built.stats.upgradesPurchased, 2); assert.equal(built.stats.moduleMoves, 0);
assert.equal(built.events.some(event => event.type === "module_moved"), false, "Current gameplay cannot emit an installed-module move");
assert.equal(built.stats.modulesSoldByType.cannon, 1); assert.deepEqual(built.stats.modulesLostByType, {});
assert.ok(built.stats.matterSpentByReason.upgrade > 0);
const upgradeEvents = built.events.filter(event => event.type === "weapon_upgraded");
assert.deepEqual(upgradeEvents.map(event => event.data.level), [2, 3], "Upgrade events record displayed levels, not internal zero-based ranks");

game.elapsed = 42;
const heavy = game.spawnEnemy("bulwark", 1500, 1500);
expectedOutgoingHp += heavy.hp; expectedOutgoingShield += heavy.shield;
game.damageEnemy(heavy, 20);
game.damageEnemy(heavy, 1000000);
assert.equal(heavy.dead, true);
game.elapsed = 120; game.spawnBoss();
const boss = game.boss;
expectedOutgoingHp += boss.hp;
expectedOutgoingShield += boss.shield || 0;
game.elapsed = 121; game.damageEnemy(boss, 50);
game.elapsed = 124; game.damageEnemy(boss, 1000000);
assert.equal(boss.dead, true);
game.elapsed = 125;
// Verify incoming overkill is capped at actual module HP; remove shield protection for this hit.
shield.shield = 0;
const starter = game.ship.tiles.get("0,-1"); starter.hp = 10;
game.applyDamageToTile("0,-1", 1000000);
game.finishRun(false, true);
const run = plain(telemetry.getDataForTests().runs.at(-1)), summary = run.summary;
assert.equal(summary.matterBalanceError, 0);
assert.ok(Math.abs(summary.hullDamageDealt - expectedOutgoingHp) < .01, "Outgoing overkill cannot inflate damage totals: recorded " + summary.hullDamageDealt + ", expected " + expectedOutgoingHp);
assert.ok(Math.abs(summary.shieldDamageDealt - expectedOutgoingShield) < .001, "Enemy shield damage is counted once including shield-only hits");
assert.equal(summary.damageToModules, 10, "Incoming overkill must not inflate ship damage");
assert.equal(summary.shieldDamageAbsorbed, 5);
assert.equal(summary.bossEncounters.length, 1);
assert.equal(summary.bossEncounters[0].id, boss.id);
assert.equal(summary.bossEncounters[0].spawnToDefeatSeconds, 4);
assert.equal(summary.bossEncounters[0].engagementSeconds, 3);
assert.equal(summary.bossEncounters[0].hullDamageTaken, boss.maxHp);
assert.equal(summary.moduleMoves, 0); assert.equal(summary.modulesSold.cannon, 1);
assert.equal(summary.finalShield, 0);
assert.equal(summary.finalCoreMaxHp, game.ship.tiles.get("0,0").maxHp);
console.log(JSON.stringify({ passed: true, realEarnedFixtureFunds: fundsBeforeBuild, refunded: refund, finalMatter: summary.finalMatter,
  matterBalanceError: summary.matterBalanceError, outgoingDamage: summary.damageDealt, bossSpawnToDefeat: summary.bossEncounters[0].spawnToDefeatSeconds,
  bossEngagement: summary.bossEncounters[0].engagementSeconds, verified: ["real kill income", "real upgrades and purchases", "sale transactions", "no runtime move transactions", "real absolute HP and shields", "incoming and outgoing overkill", "boss identity and first damage", "no duplicate spend/refund"] }, null, 2));
