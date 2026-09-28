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

assert.equal(game.ship.tiles.get("0,-1").maxHp,50);
api.save.progression.branchLicenses=['cannon:twin'];game.state='building';game.matter=10000;
const expansionCosts=[];for(let row=2;row<=8;row++){expansionCosts.push(api.price('cannon'));assert.equal(api.place(0,-row),true);}
assert.deepEqual(expansionCosts,[25,30,37,45,55,66,81]);assert.equal(game.matter,9661);
assert.equal(api.buy('cannon','base1',0),true);assert.equal(api.buy('cannon','base2',1),true);assert.equal(game.matter,9501);assert.equal(api.price('cannon'),119);
const beforeLoss=game.matter;game.destroyTile('0,-2');assert.equal(game.modulesLost,7);assert.equal(game.matter,beforeLoss);assert.equal(api.price('cannon'),45);
assert.equal(api.buy('cannon','twin',2),true);assert.equal(game.matter,beforeLoss-24);assert.equal(api.price('cannon'),69);assert.equal(api.buy('cannon','twin',2),false);
for(let i=0;i<3;i++){const before=game.matter;assert.equal(api.place(0,-2),true);assert.equal(game.matter,before-69);game.destroyTile('0,-2');assert.equal(api.price('cannon'),69);}
game.destroyTile('0,-1');assert.equal(api.price('cannon'),64);assert.equal(api.buy('cannon','twin',3),false);assert.equal(api.place(0,-1),true);assert.equal(game.weaponDefinitions.cannon.shots,2);
const fresh=new api.Game();api.activate(fresh);assert.equal(api.price('cannon'),25);assert.deepEqual(Object.keys(fresh.upgrades),[]);
assert.deepEqual({fragments:api.save.fragments,carryUnits:api.save.fragmentCarryUnits},permanentWallet);
console.log(JSON.stringify({passed:true,expansionCosts,priceAfterLoss:69,priceAfterAllLosses:64,checks:['Actual per-copy upgrade spending','Current count after disconnected losses','Upgrade surcharge on replacements','No refund','No free step without copies','Stale rejection','Fresh-run reset','Separate permanent wallet']}));
