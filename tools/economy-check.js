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
  "    window.__economyTest = { Game: Game, save: save, defaultSave: defaultSave, price: modulePrice, place: placePurchasedModule, buy: buyRunUpgrade, reward: runFragmentReward, activate: function (instance, type) { game = instance; selectedBuildModule = type || 'cannon'; } };\n" + exposure);
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
assert.deepEqual(expansionCosts,[25,36,53,77,113,165,241]);assert.equal(game.matter,9290);
assert.equal(api.buy('cannon','base1',0),true);assert.equal(api.buy('cannon','base2',1),true);assert.equal(game.matter,9082);assert.equal(api.price('cannon'),378);
const beforeLoss=game.matter;game.destroyTile('0,-2');assert.equal(game.modulesLost,7);assert.equal(game.matter,beforeLoss);assert.equal(api.price('cannon'),51);
assert.equal(api.buy('cannon','twin',2),true);assert.equal(game.matter,beforeLoss-36);assert.equal(api.price('cannon'),87);assert.equal(api.buy('cannon','twin',2),false);
for(let i=0;i<3;i++){const before=game.matter;assert.equal(api.place(0,-2),true);assert.equal(game.matter,before-87);game.destroyTile('0,-2');assert.equal(api.price('cannon'),87);}
game.destroyTile('0,-1');assert.equal(api.price('cannon'),82);assert.equal(api.buy('cannon','twin',3),false);assert.equal(api.place(0,-1),true);assert.equal(game.weaponDefinitions.cannon.shots,2);
const fresh=new api.Game();api.activate(fresh);assert.equal(api.price('cannon'),25);assert.deepEqual(Object.keys(fresh.upgrades),[]);
assert.deepEqual({fragments:api.save.fragments,carryUnits:api.save.fragmentCarryUnits},permanentWallet);

const earlyCosts = {};
api.save.progression.purchasedModules = ['shield','scatter','missile','repair'];
for (const [type, expected] of [['shield',[37,46,67]],['missile',[42,52,76]],['repair',[32,39,56]],['scatter',[24,30,43]]]) {
  const fleet = new api.Game();
  fleet.state = 'building'; fleet.matter = 10000;
  api.activate(fleet,type);
  const actual = [];
  for (let x=1;x<=3;x++) { actual.push(api.price(type)); assert.equal(api.place(x,0),true); }
  assert.deepEqual(actual,expected, type+' keeps the first two copies affordable, then requires more Matter');
  earlyCosts[type]=actual;
}
const constrained = new api.Game();
constrained.state='building'; constrained.matter=30; api.activate(constrained);
assert.equal(api.place(1,0),true); assert.equal(constrained.matter,5);
constrained.matter=35;
assert.equal(api.place(2,0),false,'An old-price budget cannot buy the higher-priced third Cannon');
assert.equal(constrained.matter,35);assert.equal(constrained.ship.tiles.size,3);
assert.equal(api.buy('cannon','base1',0),true); assert.equal(constrained.matter,19);
assert.equal(api.buy('cannon','base2',1),false,'A family upgrade charges each installed copy at the new unit cost');
assert.equal(constrained.matter,19);assert.equal(constrained.upgrades.cannon.level,1);
constrained.matter=36;assert.equal(api.buy('cannon','base2',1),true);assert.equal(constrained.matter,0);
assert.equal(api.price('cannon'),62,'Buying upgrades first still charges their investment on future copies');
const range = new api.Game(); range.testRange=true; range.state='building'; range.matter=0; api.activate(range);
assert.equal(api.price('cannon'),0);assert.equal(api.place(1,0),true);
assert.equal(api.buy('cannon','base1',0),true);assert.equal(api.buy('cannon','base2',1),true);assert.equal(range.matter,0);
assert.deepEqual({fragments:api.save.fragments,carryUnits:api.save.fragmentCarryUnits},permanentWallet);
console.log(JSON.stringify({passed:true,expansionCosts,earlyCosts,priceAfterLoss:87,priceAfterAllLosses:82,checks:['Actual per-copy upgrade spending','Higher late-copy prices','Affordable first purchases','Insufficient budgets reject atomically','Current count after disconnected losses','Upgrade surcharge on replacements and new copies','No refund','No free step without copies','Stale rejection','Fresh-run reset','Free Test Range','Separate permanent wallet']}));
