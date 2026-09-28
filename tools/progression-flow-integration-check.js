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
  game.killsByMinute = [kills];
  game.bossesDefeated = bosses;
  game.recordProgress({elapsed: seconds, kills, bosses});
  game.finishRun(false, false);
  return game;
}


resetProfile();storageMap.set('unrelated-progression-sentinel','unchanged');
const game=finishScenario(180,500,1);assert.equal(api.save.fragments,12);assert.equal(api.ui.resultFragments.textContent,'+12');assert.deepEqual(plain(resultCards().map(b=>b.dataset.preview)),['scatter']);
const offer=resultCards()[0];offer.id='';offer.focus();const before=persistent();fire(offer);assert.equal(panel().type,'scatter');assert.deepEqual(persistent(),before);fire(element('modulePreviewAction'));assert.equal(api.save.fragments,4);assert.equal(progression.isUnlocked(api.save.progression,'scatter'),true);assert.equal(api.save.lastLoadout.selectedWeapon,'cannon');assert.equal(panel().actionKind,'starter');fire(element('modulePreviewAction'));assert.equal(api.save.lastLoadout.selectedWeapon,'scatter');closePreview();
assert.equal(resultCards().length,0);assert.equal(api.ui.resultObjectiveProgress.max,16);assert.equal(api.ui.resultObjectiveProgress.value,4);const banked=persistent();game.finishRun(false,true);assert.deepEqual(persistent(),banked);
fire(api.ui.hangarButton);assert.equal(api.current(),null);assert.equal(api.ui.weaponPicker.children.length,18);assert.equal(api.ui.weaponPicker.children.some(b=>b.dataset.type==='drive'),false);
api.startRun();assert.equal(api.current().ship.tiles.get('0,-1').type,'scatter');api.exitToHangar();api.returnToMenu();
resetProfile();finishScenario(30,15,0);assert.equal(api.save.fragments,0);assert.equal(api.save.fragmentCarryUnits,318000);assert.equal(resultCards().length,0);api.returnToMenu();finishScenario(30,15,0);assert.equal(api.save.fragments,1);assert.equal(api.save.fragmentCarryUnits,36000);
api.returnToMenu();api.save.fragments=8;api.renderMetaShop();const meta=api.ui.metaList.children.find(b=>b.innerHTML.includes('Hull Integrity'));assert.match(meta.innerHTML,/\+0% → \+1%/);fire(meta);assert.equal(api.save.fragments,7);assert.equal(api.save.campaign.coreRanks.standard.modules,1);assert.equal(api.save.campaign.coreRanks.striker.modules,0);assert.equal(api.save.fragmentCarryUnits,36000);
// License parent dependencies and duplicate clicks are enforced by the real Hangar handler.
api.save.fragments=200;api.renderMetaShop();
function branchElement(field,value) { function find(node) { if(node.dataset && node.dataset[field]===value)return node;for(const child of node.children||[]){const match=find(child);if(match)return match;} }return find(element('branchList')); }
fire(branchElement('branch','cannon:focus'));assert.equal(branchElement('unlockBranch','cannon:focus').disabled,true);assert.equal(api.save.fragments,200);
fire(branchElement('branch','cannon:twin'));const twin=branchElement('unlockBranch','cannon:twin');fire(twin);assert.equal(api.save.fragments,136);assert.ok(api.save.progression.branchLicenses.includes('cannon:twin'));fire(twin);assert.equal(api.save.fragments,136);
fire(branchElement('branch','cannon:focus'));fire(branchElement('unlockBranch','cannon:focus'));assert.equal(api.save.fragments,56);assert.ok(api.save.progression.branchLicenses.includes('cannon:focus'));
const stored=api.loadSave();assert.deepEqual(plain(stored.progression.branchLicenses),['cannon:twin','cannon:focus']);assert.equal(stored.campaign.coreRanks.standard.modules,1);assert.equal(stored.fragmentCarryUnits,36000);assert.equal(storageMap.get('unrelated-progression-sentinel'),'unchanged');
console.log('Progression flow passed: first-boss result, explicit license purchase/equip, new run, fractional settlements, independent core rank, branch parents and one-time costs, reload and unrelated storage preserved.');
