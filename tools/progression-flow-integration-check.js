"use strict";

// Reuse the maintained preview fixture; exercise real gameplay/UI functions without a browser.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const plain = value => JSON.parse(JSON.stringify(value));
let fixture = fs.readFileSync("tools/module-preview-integration-check.js", "utf8");
const startOfChecks = fixture.indexOf("// All cards, including unavailable");
assert.ok(startOfChecks > 0, "The shared fixture must expose its bootstrap before running its checks");
fixture = fixture.slice(0, startOfChecks);
const exposure = "drawModuleGlyph, current: () => game";
assert.ok(fixture.includes(exposure));
fixture = fixture.replace(exposure,
  "drawModuleGlyph, META_DEFS, META_PURCHASE_CAP, makeTile, selectStarter, renderObjectives, renderMetaShop, exitToHangar, openHangar, setHangarTab, loadSave, continueSurvival, current: () => game");
const host = { require, console, URLSearchParams, setTimeout, clearTimeout };
vm.runInNewContext(fixture + "\nglobalThis.testFixture = {runtime, storageMap, api, element, persistent, fire, card, panel, closePreview, telemetry};", host);
const { runtime, storageMap, api, element, persistent, fire, card, panel, closePreview, telemetry } = host.testFixture;
const progression = runtime.DriftProgression;
const resultCards = () => api.ui.resultUnlocks.children;
const visible = target => !target.classList.contains("hidden");
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} vs ${expected}`);
const report = { verification: "Isolated VM integration; no browser, layout validation or real player storage", checks: [] };

function resetProfile() {
  api.closeModulePreview();
  if (api.current()) api.returnToMenu();
  const fresh = api.defaultSave();
  Object.keys(api.save).forEach(key => { delete api.save[key]; });
  Object.assign(api.save, fresh);
  api.selectStarter("cannon");
  api.storeSave();
  api.renderMetaShop();
  api.renderStarterPicker();
}

function finishScenario(seconds, kills, bosses) {
  api.startRun();
  const game = api.current();
  game.elapsed = seconds;
  game.kills = kills;
  game.bossesDefeated = bosses;
  game.recordProgress({elapsed: seconds, kills, bosses});
  game.finishRun(false, false);
  return game;
}

resetProfile();
storageMap.set("unrelated-progression-sentinel", "unchanged");
const game = finishScenario(134.23, 184, 1);
assert.equal(game.state, "result");
assert.equal(api.save.fragments, 5);
assert.equal(api.save.fragmentCarryUnits, 347680);
assert.equal(api.ui.resultFragments.textContent, "+5");
assert.match(element("resultFragmentProgress").textContent, /57%.*saved/);
assert.deepEqual(plain(resultCards().map(button => button.dataset.preview)), ["scatter", "shield"]);
assert.ok(resultCards().every(button => progression.status(api.save.progression, button.dataset.preview).cost <= api.save.fragments));
assert.match(element("resultUnlockHeading").textContent, /You can buy/);
assert.equal(visible(element("resultObjectiveCard")), false);
assert.equal(element("resultBankedBalance").textContent, "5 Fragments in Hangar");
const beforePreview = persistent(), resultTelemetry = telemetry();
const shieldOffer = resultCards().find(button => button.dataset.preview === "shield");
// Dynamic result buttons have no DOM id; model keyboard activation explicitly.
shieldOffer.id = "";
shieldOffer.focus();
fire(shieldOffer);
assert.equal(panel().type, "shield");
assert.equal(panel().context, "result");
assert.equal(panel().actionKind, "buy");
assert.equal(panel().actionDisabled, false);
assert.equal(game.state, "result", "A finished run stays finished underneath the preview");
assert.deepEqual(persistent(), beforePreview, "Viewing an affordable result cannot purchase or write a save");
assert.deepEqual(telemetry(), resultTelemetry);
closePreview();
assert.equal(runtime.document.activeElement, shieldOffer, "Closing without a purchase returns to the original offer");
fire(shieldOffer);
const buyShield = element("modulePreviewAction");
fire(buyShield);
// The DOM fixture does not automatically disconnect children replaced by innerHTML.
shieldOffer.isConnected = false;
assert.equal(api.save.fragments, 1);
assert.equal(api.save.fragmentCarryUnits, 347680);
assert.equal(progression.isUnlocked(api.save.progression, "shield"), true);
assert.equal(api.save.lastLoadout.selectedWeapon, "cannon", "A support licence cannot change the opening weapon");
assert.equal(panel().actionKind, null, "An owned support module has no starter action");
assert.equal(resultCards().length, 0, "After purchase the result must remove offers which the remaining wallet cannot afford");
assert.equal(element("resultBankedBalance").textContent, "1 Fragments in Hangar");
assert.equal(element("resultObjectiveLabel").textContent, "Save for a module");
assert.equal(api.ui.resultObjectiveProgress.value, 1);
assert.equal(api.ui.resultObjectiveProgress.max, 4);
assert.equal(api.ui.resultFragments.textContent, "+5", "Spending changes the banked balance, not the reward earned by this run");
assert.deepEqual(telemetry(), resultTelemetry, "Purchasing outside combat cannot rewrite the already-finished run payout");
const afterPurchase = persistent();
fire(buyShield);
fire(buyShield, "click", {detail: 2});
game.finishRun(false, true);
assert.deepEqual(persistent(), afterPurchase, "Stale purchase callbacks and repeated finishing cannot charge or bank again");
closePreview();
assert.equal(runtime.document.activeElement, api.ui.hangarButton, "When the purchased offer disappears, keyboard focus returns to Hangar");
fire(api.ui.hangarButton);
assert.equal(api.current(), null);
assert.equal(visible(api.ui.hangarOverlay), true);
assert.equal(visible(api.ui.hangarWeaponsPanel), true, "Return to Hangar must open the Modules section named by the result offers");
assert.equal(visible(api.ui.hangarUpgradesPanel), false);
assert.equal(api.ui.hangarWeaponTab.classList.contains("selected"), true);
assert.equal(api.save.fragments, 1);
report.checks.push("5F first-boss result retains 347680 fractional units and offers only two affordable licences; explicit support purchase spends4F once, preserves fractional credit and finished telemetry, and Return opens Modules");

assert.equal(api.ui.weaponPicker.children.length, 19, "All owned, available, poor and locked modules remain inspectable");
assert.match(card("shield").innerHTML, /Unlocked/);
assert.match(card("scatter").innerHTML, /Need 3 more Fragments/);
assert.match(card("rail").innerHTML, /Bosses defeated/);
assert.ok(api.ui.weaponPicker.children.every(button => button.disabled === false));
assert.match(element("hangarStatusSummary").textContent, /3 unlocked.*0 affordable/i);
const hangarBefore = persistent();
for (const type of ["shield", "scatter", "rail"]) {
  fire(card(type));
  assert.equal(panel().type, type);
  if (type === "shield") assert.equal(panel().actionKind, null);
  else assert.equal(panel().actionDisabled, true);
  closePreview();
  assert.deepEqual(persistent(), hangarBefore);
}
report.checks.push("The complete 19-module catalogue distinguishes owned support, unaffordable eligibility and locked requirements without disabling previews");

// Buying a weapon remains separate from selecting it, then the next real run uses it.
api.save.fragments = 4;
api.storeSave();
api.renderStarterPicker();
fire(card("scatter"));
fire(element("modulePreviewAction"));
assert.equal(api.save.fragments, 0);
assert.equal(api.save.fragmentCarryUnits, 347680);
assert.equal(api.save.lastLoadout.selectedWeapon, "cannon");
assert.equal(panel().actionKind, "starter");
fire(element("modulePreviewAction"));
assert.equal(api.save.lastLoadout.selectedWeapon, "scatter");
closePreview();
api.startRun();
assert.equal(api.current().ship.tiles.get("0,-1").type, "scatter");
assert.equal(api.save.fragments, 0);
assert.ok(progression.isUnlocked(api.save.progression, "shield"));
report.checks.push("An explicit weapon purchase does not equip it; the separate starter action changes the next actual run while preserving support ownership");

resetProfile();
finishScenario(30, 15, 0);
assert.equal(api.save.fragments, 0);
assert.equal(api.save.fragmentCarryUnits, 480000);
assert.match(element("resultFragmentProgress").textContent, /80%.*saved/);
assert.equal(resultCards().length, 0);
assert.equal(visible(element("resultObjectiveCard")), true);
assert.equal(element("resultObjectiveLabel").textContent, "Save for a module");
assert.match(api.ui.resultObjectiveText.textContent, /4 more Fragments \(4 total\)/);
assert.equal(api.ui.resultObjectiveProgress.value, 0);
assert.equal(api.ui.resultObjectiveProgress.max, 4);
assert.ok(api.ui.resultObjectiveProgress.value < api.ui.resultObjectiveProgress.max, "A completed unlock condition cannot display a full savings bar for a poor wallet");
report.checks.push("A short defeat saves80% of the next Fragment and shows0/4 licence savings rather than pretending an integer reward or affordable purchase");

// Spending the same wallet on a permanent rank must update licence affordability too.
api.save.fragments = 8;
api.storeSave();
api.renderMetaShop();
api.renderStarterPicker();
assert.equal(resultCards().length, 2);
const metaButton = api.ui.metaList.children.find(button => button.innerHTML.includes("Reinforced Modules"));
assert.match(metaButton.innerHTML, /\+0% → \+5% module HP/);
assert.equal(metaButton.disabled, false);
fire(metaButton);
assert.equal(api.save.fragments, 3);
assert.equal(api.save.meta.modules, 1);
assert.equal(resultCards().length, 0);
assert.equal(api.ui.resultObjectiveProgress.value, 3);
assert.equal(api.ui.resultObjectiveProgress.max, 4);
assert.match(card("scatter").innerHTML, /Need 1 more Fragments/);
assert.match(api.ui.metaList.children.find(button => button.innerHTML.includes("Reinforced Modules")).innerHTML, /\+5% → \+10% module HP/);
assert.equal(api.ui.resultFragments.textContent, "+0", "Permanent spending cannot rewrite the preceding result reward");
assert.equal(api.save.fragmentCarryUnits, 480000, "A permanent-rank purchase cannot spend or reset fractional credit");
report.checks.push("A real 5F permanent-rank purchase refreshes licence affordability and result savings, and advances the displayed current-to-next bonus");

resetProfile();
const legacyRaw = api.defaultSave();
legacyRaw.version = 5;
legacyRaw.fragments = 123;
legacyRaw.meta = {core: 7, modules: 10, matter: 8, drive: 6, damage: 4};
legacyRaw.progression = {schemaVersion: 3, purchasedModules: ["scatter", "shield"], legacyEligibleModules: ["laser"], totalKills: 15, bestTime: 30};
legacyRaw.campaign = {schemaVersion: 2, purchasedCores: ["striker"], legacyEligibleCores: ["bulwark"], selectedCore: "striker"};
legacyRaw.lastLoadout.selectedWeapon = "scatter";
const sourceLegacy = plain(legacyRaw);
const migrated = api.sanitizeSave(legacyRaw);
assert.deepEqual(plain(legacyRaw), sourceLegacy, "Sanitizing cannot mutate the old saved record");
assert.deepEqual(plain(migrated.meta), sourceLegacy.meta);
assert.equal(migrated.fragments, 123);
assert.equal(migrated.fragmentCarryUnits, 0, "A pre-carry save must not manufacture fractional credit");
assert.deepEqual(plain(migrated.progression.purchasedModules), ["scatter", "shield"]);
assert.ok(progression.canPurchase(migrated.progression, "laser"));
assert.equal(migrated.campaign.selectedCore, "striker");
assert.equal(migrated.lastLoadout.selectedWeapon, "scatter");
Object.assign(api.save, migrated);
api.selectStarter("scatter");
api.renderMetaShop();
const beforeRetainedView = persistent();
api.renderMetaShop();
api.renderStarterPicker();
assert.deepEqual(persistent(), beforeRetainedView);
for (const def of api.META_DEFS) {
  const button = api.ui.metaList.children.find(item => item.innerHTML.includes(def.name));
  assert.equal(button.disabled, true, "An existing rank above the new cap cannot be sold again");
  if (!def.legacy) assert.ok(button.innerHTML.includes(`+${api.save.meta[def.id] * def.bonusPercent}%`));
}
report.checks.push("Legacy currency, purchased licences, prior eligibility, selected core/loadout and ranks above the new cap survive migration and repeated rendering");

resetProfile();
api.save.progression.purchasedModules = progression.definitions.map(def => def.type);
api.renderMetaShop();
api.renderStarterPicker();
assert.equal(resultCards().length, 0);
assert.equal(visible(element("resultObjectiveCard")), false);
assert.equal(visible(element("resultUnlockHeading")), false);
assert.equal(api.ui.weaponPicker.children.length, 19);
assert.match(element("hangarStatusSummary").textContent, /19 unlocked.*0 affordable/i);
report.checks.push("All-owned progress leaves no misleading purchase or objective prompt and keeps all module previews available");

// Credit lives in the persistent Fragments wallet, and settlement is performed only once at run end.
resetProfile();
assert.equal(api.defaultSave().version, 8);
assert.equal(api.defaultSave().fragmentCarryUnits, 0);
for (const invalid of [-1, 1.5, 600000, Infinity, NaN, "480000", null, {}, []]) {
  const raw = api.defaultSave();
  raw.fragments = 123;
  raw.fragmentCarryUnits = invalid;
  const clean = api.sanitizeSave(raw);
  assert.equal(clean.fragmentCarryUnits, 0, "Invalid fractional credit cannot mint a Fragment or be coerced into a valid balance");
  assert.equal(clean.fragments, 123);
}
finishScenario(30, 15, 0);
assert.equal(api.save.fragments, 0);
assert.equal(api.save.fragmentCarryUnits, 480000);
const storedShort = persistent();
const loadedShort = api.loadSave();
assert.deepEqual(plain(loadedShort), plain(api.save));
assert.deepEqual(persistent(), storedShort, "Reloading a saved fraction cannot settle it or rewrite storage");
Object.assign(api.save, loadedShort);
const secondShort = finishScenario(30, 15, 0);
assert.equal(api.save.fragments, 1);
assert.equal(api.save.fragmentCarryUnits, 360000);
assert.match(element("resultFragmentProgress").textContent, /60%.*saved/);
assert.equal(api.ui.resultFragments.textContent, "+1");
const creditedOnce = persistent();
secondShort.finishRun(false, false);
secondShort.finishRun(true, true);
assert.deepEqual(persistent(), creditedOnce);
finishScenario(600, 0, 3);
assert.equal(api.save.fragments, 1);
assert.equal(api.save.fragmentCarryUnits, 360000);
assert.equal(api.ui.resultFragments.textContent, "+0");
const beforeTraining = persistent();
api.startTraining();
const training = api.current();
training.elapsed = 1200;
training.kills = 999;
training.bossesDefeated = 6;
training.checkSurvival();
training.finishRun(true, true);
assert.deepEqual(persistent(), beforeTraining, "A training death/finish and synthetic training milestone cannot bank Survival credit");
api.leaveTraining();
assert.equal(api.current(), null, "Returning from training after an already finished run goes to the menu");
assert.deepEqual(persistent(), beforeTraining);
api.save.fragmentCarryUnits = 1;
api.renderObjectives();
assert.match(element("resultFragmentProgress").textContent, /<1%.*saved/, "Positive credit under one percent remains visible without being rounded away");
api.save.fragmentCarryUnits = 599999;
api.storeSave();
api.renderObjectives();
assert.match(element("resultFragmentProgress").textContent, /99%.*saved/, "Uncredited carry cannot claim100% before its Fragment is banked");
assert.equal(api.loadSave().fragmentCarryUnits, 599999);
assert.equal(api.save.fragments, 1);
report.checks.push("Save-v8 carry validation, exact reload, two30s settlements0F80% then1F60%, repeated finish, zero-kill run and training cannot mint or lose fractional credit; UI bounds are honest");

resetProfile();
api.save.fragments = 17;
api.save.fragmentCarryUnits = 360000;
api.storeSave();
api.startRun();
const extended = api.current();
extended.elapsed = 600;
extended.kills = 300;
extended.bossesDefeated = 3;
extended.matter = 157;
const walletBeforeMilestone = persistent();
const shipBeforeMilestone = plain(Array.from(extended.ship.tiles));
extended.checkSurvival();
assert.equal(extended.state, "milestone");
assert.match(api.ui.milestoneReward.textContent, /36 Fragments/);
assert.deepEqual(persistent(), walletBeforeMilestone, "The ten-minute milestone quotes the full payout but does not bank it");
extended.checkSurvival();
assert.deepEqual(persistent(), walletBeforeMilestone);
api.continueSurvival();
assert.equal(api.current(), extended);
assert.equal(extended.state, "playing");
assert.equal(extended.matter, 157);
assert.deepEqual(plain(Array.from(extended.ship.tiles)), shipBeforeMilestone);
assert.deepEqual(persistent(), walletBeforeMilestone, "Continuing preserves the same ship, Matter and unbanked reward");
extended.elapsed = 1200;
extended.kills = 10000;
extended.bossesDefeated = 6;
extended.finishRun(true, true);
assert.equal(api.save.fragments, 64, "An extended run banks47F once, not36F at the milestone plus another47F");
assert.equal(api.save.fragmentCarryUnits, 360000);
assert.equal(extended.matter, 157, "Permanent reward settlement cannot convert or spend leftover Matter");
assert.equal(api.ui.resultFragments.textContent, "+47");
const extendedLog = plain(telemetry().runs.at(-1));
assert.equal(extendedLog.context.fragments, 17);
assert.equal(extendedLog.context.fragmentCarryUnits, 360000);
assert.deepEqual(extendedLog.context.purchasedModules, []);
assert.deepEqual(extendedLog.context.purchasedCores, []);
assert.deepEqual(extendedLog.summary.fragmentReward, {
  earnedUnits: 28200000, carryBeforeUnits: 360000, carryAfterUnits: 360000, scale: 600000
});
const extendedStored = persistent();
extended.finishRun(true, true);
api.continueSurvival();
assert.deepEqual(persistent(), extendedStored);
assert.equal(api.loadSave().fragmentCarryUnits, 360000);
report.checks.push("A600s milestone quotes36F without a write; continuing preserves ship/Matter and banks47F exactly once at1200s; telemetry reconciles carry and records the initial permanent wallet separately");

// Measure the actual gameplay operations which META_DEFS claims to improve.
resetProfile();
api.startRun();
function measureMeta(id, rank) {
  Object.keys(api.save.meta).forEach(key => { api.save.meta[key] = 0; });
  api.save.meta[id] = rank;
  const probe = new api.Game();
  if (id === "modules") return api.makeTile("armor", 1, 0, false, 1).maxHp;
  if (id === "matter") return probe.matterIncomeMultiplier();
  if (id === "drive") return probe.driveMultiplier();
  const cannon = probe.ship.tiles.get("0,-1");
  cannon.cooldown = 0;
  probe.spawnEnemy("scout", 0, -130).hp = 100000;
  probe.rebuildEnemyGrid();
  probe.updateWeapons(0);
  assert.ok(probe.projectiles.length > 0, "The damage comparison must measure a real fired projectile");
  return probe.projectiles[0].damage;
}
for (const def of api.META_DEFS.filter(def => !def.legacy)) {
  const base = measureMeta(def.id, 0);
  for (const rank of [1, 3, 10]) {
    near(measureMeta(def.id, rank) / base, 1 + rank * def.bonusPercent / 100, `${def.id} metadata must match the actual rank ${rank} gameplay calculation`);
  }
}
assert.equal(storageMap.get("unrelated-progression-sentinel"), "unchanged");
report.checks.push("Metadata percentages match actual module HP, Matter income, drive multiplier and fired Cannon damage at rank1, cap3 and retained rank10");
report.passed = true;
fs.mkdirSync("outputs/gradual-progression-2026-09-09", {recursive: true});
fs.writeFileSync("outputs/gradual-progression-2026-09-09/progression-integration-report.json", JSON.stringify(report, null, 2) + "\n");
console.log("Progression flow integration passed: result/preview/purchase/next-run route, exact wallet and payout, poor/all-owned catalogue states, legacy preservation and metadata measured against actual gameplay. No browser run.");
