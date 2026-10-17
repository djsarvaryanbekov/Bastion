"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm");
const handling = require("../ship-handling");
const near = (a, b, label = "value") => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} != ${b}`);
const layout = coordinates => new Map(coordinates.map(([x, y, mass = 1]) => [x + "," + y, {x, y, mass}]));
const compact = [], wide = [], offCenter = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) compact.push([x, y, x || y ? 1.7 : 1.5]);
for (let x = -4; x <= 4; x++) wide.push([x, 0, x ? 1.7 : 1.5]);
for (let x = 0; x <= 8; x++) offCenter.push([x, 0, x ? 1.7 : 1.5]);

const known = handling.measure(layout([[0, 0, 2], [3, 4, 1]]));
near(known.mass, 3); near(known.polarMoment, 25); near(known.centerX, 1); near(known.centerY, 4 / 3);
const c = handling.measure(layout(compact)), w = handling.measure(layout(wide));
near(c.mass, w.mass); near(c.turnMultiplier, 1); near(c.responseMultiplier, 1);
near(w.turnMultiplier, .72); near(w.responseMultiplier, .55);
for (const shape of [compact, wide, offCenter]) {
  const reference = handling.measure(layout(shape));
  for (const transform of [(x,y) => [-x,y], (x,y) => [-y,x], (x,y) => [x,-y]]) {
    const mirrored = handling.measure(layout(shape.map(([x,y,m]) => [...transform(x,y),m])));
    near(mirrored.mass, reference.mass); near(mirrored.polarMoment, reference.polarMoment);
    near(mirrored.turnMultiplier, reference.turnMultiplier);
  }
}
// The same heavy tile matters more on an outer arm than beside the Core.
const innerHeavy = [[0,0,1.5],[1,0,1.7],[2,0,1],[3,0,1]];
const outerHeavy = [[0,0,1.5],[1,0,1],[2,0,1],[3,0,1.7]];
assert.ok(handling.measure(layout(outerHeavy)).turnMultiplier < handling.measure(layout(innerHeavy)).turnMultiplier);
near(handling.measure(layout([[0,0,1.5],[0,-1,1]])).turnMultiplier, 1);
for (const shape of [[], [[0,0,1.5]], Array.from({length:420}, (_,x) => [x,0,1.7])]) {
  const result = handling.measure(layout(shape));
  assert.ok(Object.values(result).every(Number.isFinite));
  assert.ok(result.turnMultiplier >= .72 && result.turnMultiplier <= 1);
  assert.ok(result.responseMultiplier >= .55 && result.responseMultiplier <= 1);
}
const reusable = {};
assert.equal(handling.measure(layout(wide), reusable), reusable);
handling.measure(layout(compact), reusable); near(reusable.turnMultiplier, 1);

const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
let source = fs.readFileSync("game.js", "utf8");
const baseline = process.env.HANDLING_BASELINE && fs.readFileSync(process.env.HANDLING_BASELINE, "utf8");
const legacy = baseline ? baseline.match(/Game.prototype.updateMovement = function \(dt\) \{[\s\S]*?\n    \};/)[0]
  .replace("Game.prototype.updateMovement =", "var legacyMovement =") : "var legacyMovement = null;";
source = source.replace(marker, legacy + "\n    window.handlingTest = {Game,makeTile,save,keys,mouseInput,mobileInput,placePurchasedModule,sellInstalledModule,select:function(type){selectedBuildModule=type;},activate:function(g){game=g;},legacy:function(g,dt){legacyMovement.call(g,dt);}};\n" + marker);
const bootstrap = {console,setTimeout,clearTimeout,URLSearchParams,process:{env:{BALANCE_SECONDS:"1"}},require(name){
  if(name === "fs") return {...fs,readFileSync(p,e){return p === "game.js" ? source : fs.readFileSync(p,e);}};
  return require(name);
}};
vm.runInNewContext(harness.slice(0,harness.indexOf("let installPromptCalls")) + "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.handlingTest;
function inputs(mode, g, heading = Math.PI / 2) {
  Object.keys(api.keys).forEach(k => delete api.keys[k]);
  api.mouseInput.active = mode === "mouse"; api.mobileInput.active = mode === "touch";
  if(mode === "keyboard") api.keys.KeyD = true;
  api.mobileInput.x = Math.sin(heading); api.mobileInput.y = -Math.cos(heading); api.mobileInput.magnitude = 1;
  api.mouseInput.x = 960 + (g.ship.x - g.camera.x) * g.camera.zoom + Math.sin(heading) * 200;
  api.mouseInput.y = 540 + (g.ship.y - g.camera.y) * g.camera.zoom - Math.cos(heading) * 200;
}
function game(shape = compact, core = "standard") {
  api.save.campaign.selectedCore = core;
  const g = new api.Game(); g.ship.tiles.clear();
  shape.forEach(([x,y,mass]) => {const t=api.makeTile(x || y ? "bulkhead" : "core", x,y,!x&&!y); t.mass=mass;g.ship.tiles.set(x+","+y,t);});
  g.emitDriveParticles = () => {};
  return g;
}
if (baseline) for(const core of ["standard","striker","bulwark","salvager"]) for(const mode of ["keyboard","mouse","touch"]) {
  const current=game(compact,core), previous=game(compact,core);
  for(let i=0;i<60;i++) {
    inputs(mode,current); current.updateMovement(1/30);
    inputs(mode,previous); api.legacy(previous,1/30);
  }
  for(const k of ["x","y","vx","vy","angle","angularVelocity"]) near(current.ship[k],previous.ship[k],"compact parity " + core + " " + mode + " " + k);
}
const motion=[];
for(const shape of [compact,wide,offCenter]) {
  const g=game(shape); inputs("keyboard",g);
  for(let i=0;i<12;i++)g.updateMovement(1/30);
  motion.push({angle:g.ship.angle,velocity:g.ship.angularVelocity,turn:g.handling.turnMultiplier});
  g.ship.angularVelocity=1; inputs("none",g);
  for(let i=0;i<6;i++)g.updateMovement(1/30);
  motion[motion.length-1].releasedVelocity=g.ship.angularVelocity;
}
assert.ok(motion[1].angle < motion[0].angle * .8,"A wide hull must visibly turn more slowly at equal mass");
assert.ok(motion[1].releasedVelocity > motion[0].releasedVelocity,"Wide hulls retain bounded angular momentum longer");
for(const mode of ["mouse","touch"]) for(const heading of [Math.PI/2,-Math.PI/2,Math.PI+.02]) {
  const g=game(wide);
  for(let i=0;i<180;i++){inputs(mode,g,heading);g.updateMovement(1/30);}
  const error=Math.atan2(Math.sin(heading-g.ship.angle),Math.cos(heading-g.ship.angle));
  assert.ok(Math.abs(error)<.001,"Pointer steering must settle without sustained oscillation");
}
if (baseline) for(const shape of [compact,wide]) {
  const current=game(shape), previous=game(shape);inputs("none",current);api.keys.KeyW=true;
  current.ship.vx=previous.ship.vx=100;
  for(let i=0;i<30;i++){current.updateMovement(1/30);api.legacy(previous,1/30);}
  for(const k of ["x","y","vx","vy"])near(current.ship[k],previous.ship[k],"Linear flight parity");
  current.state="paused";const frozen=JSON.stringify(current.ship);current.update(1);
  assert.equal(JSON.stringify(current.ship),frozen,"Pause must not advance inertia");
}
// Real Build and combat paths must affect handling immediately, with no stale cache.
const dynamic=game([[0,0,1.5],[0,-1,1]]); dynamic.ship.tiles.get("0,-1").type="cannon";
for(const state of ["paused","building"]){dynamic.state=state;const before=JSON.stringify(dynamic.ship);dynamic.update(1);assert.equal(JSON.stringify(dynamic.ship),before);}
api.save.progression.purchasedModules.push("bulkhead");
api.activate(dynamic); inputs("none",dynamic);dynamic.state="building";dynamic.matter=1e8;api.select("bulkhead");
for(let x=1;x<=6;x++)assert.ok(api.placePurchasedModule(x,0));
dynamic.updateMovement(0);near(dynamic.handling.turnMultiplier,.72);
const resultReference=dynamic.handling;
for(let x=6;x>=1;x--)assert.ok(api.sellInstalledModule(x+",0"));
dynamic.updateMovement(0);near(dynamic.handling.turnMultiplier,1);assert.equal(dynamic.handling,resultReference);
for(let x=1;x<=6;x++){const t=api.makeTile("bulkhead",x,0,false);dynamic.ship.tiles.set(x+",0",t);}
dynamic.updateMovement(0);near(dynamic.handling.turnMultiplier,.72);
dynamic.destroyTile("1,0");dynamic.updateMovement(0);
assert.equal(dynamic.ship.tiles.size,2);near(dynamic.handling.turnMultiplier,1);
console.log(JSON.stringify({passed:true,baselineCompared:Boolean(baseline),motion,checks:["Mass distribution and independent moments","Mirrored and rotated layouts","Outer heavy modules","Wide hull turn and release response","Pointer convergence and wraparound","Live purchase, dismantle and severing","420-tile bounds"]}));
