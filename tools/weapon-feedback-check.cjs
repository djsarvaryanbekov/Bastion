"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const {assert, game, enemy, tile, makeTile, upgrades, U, MODULES} = require("./balance-fixture");
const feedback = require("../weapon-feedback");
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

function fireGroup(count, mass, opposing = false) {
  const f = feedback.create(), ship = {vx:0,vy:0};
  f.begin(0, mass);
  for (let i = 0; i < count; i++) f.fire({type:"rail"},{},opposing && i % 2 ? -1 : 1,0);
  f.flush(ship);
  return {f,ship};
}
near(fireGroup(1,3).ship.vx,-6);
near(fireGroup(1,12).ship.vx,-1.5);
near(fireGroup(100,3).ship.vx,-8);
near(fireGroup(100,3,true).ship.vx,0);
const capped = fireGroup(100,3);
capped.f.begin(0,3); capped.f.fire({type:"rail"},{},1,0); capped.f.flush(capped.ship);
near(capped.ship.vx,-8);
capped.f.begin(.5,3); capped.f.fire({type:"rail"},{},1,0); capped.f.flush(capped.ship);
near(capped.ship.vx,-11);
for (const fps of [30,60,144]) {
  const f = feedback.create(), ship = {vx:0,vy:0};
  for(let frame=0; frame<fps; frame++) {
    f.begin(1/fps,3);
    for(let gun=0;gun<100;gun++) f.fire({type:"rail"},{},.6,.8);
    f.flush(ship);
  }
  assert.ok(Math.hypot(ship.vx,ship.vy) <= 14 + 1e-8,"Sustained recoil must have a real-time budget");
}

function cycle(type, ids = []) {
  const g = game(); g.ship.tiles.clear();
  g.ship.tiles.set("0,0",makeTile("core",0,0,true));
  const emitter = tile(g,type,0,-1); emitter.cooldown=0;
  const def = ids.length ? upgrades(g,type,ids) : g.weaponDefinitions[type];
  enemy(g,180,-42,1e8); g.rebuildEnemyGrid();
  return {g,emitter,def};
}
const heavyCases = [
  ["rail",[]],
  ["rail",["base1","base2","magazine","magazine"]],
  ["missile",["base1","base2","heavy"]],
  ["missile",["base1","base2","heavy","heavy","cluster"]],
  ["scatter",["base1","base2","cone","cone","double"]]
];
for(const [type,ids] of heavyCases) {
  const {g,emitter,def} = cycle(type,ids);
  const beforeDef = JSON.stringify(def);
  g.updateWeapons(0);
  assert.ok(g.projectiles.length > 0);
  assert.ok(g.ship.vx < 0); near(g.ship.vy,0);
  assert.ok(feedback.offset(emitter)>0);
  assert.equal(JSON.stringify(def),beforeDef,"Feedback cannot mutate weapon stats");
  if(def.burstCount>1) {
    const firstCount=g.projectiles.length,firstVx=g.ship.vx;
    g.updateWeapons(def.burstInterval);
    assert.ok(g.projectiles.length>firstCount);
    assert.ok(g.ship.vx<firstVx,"Delayed shots get their own single kick");
    near(emitter.weaponKickTime,.30);
  }
  const frozen={vx:g.ship.vx,kick:emitter.weaponKickTime,budget:g.weaponFeedback.budget};
  g.state="paused"; g.update(1);
  assert.deepEqual({vx:g.ship.vx,kick:emitter.weaponKickTime,budget:g.weaponFeedback.budget},frozen);
  g.enemies.length=0;g.enemyById.clear();g.enemyGrid.clear();emitter.pendingBurst=null;
  g.updateWeapons(.31); near(feedback.offset(emitter),0);

  const dry=cycle(type,ids);dry.g.spawnProjectile=()=>null;dry.g.updateWeapons(0);
  near(dry.g.ship.vx,0);near(feedback.offset(dry.emitter),0);
}
for(const type of ["cannon","missile","scatter","flak"]) {
  const {g,emitter}=cycle(type);g.updateWeapons(0);
  near(g.ship.vx,0);assert.ok(feedback.offset(emitter)>0,"Ordinary kinetic weapons must kick too");
  assert.equal(g.weaponFeedback.budget,8,"Cosmetic kick cannot spend the physical recoil budget");
  const peak=feedback.offset(emitter);feedback.settle(emitter,.03);near(feedback.offset(emitter),peak);
  feedback.settle(emitter,.10);assert.ok(feedback.offset(emitter)<peak);
  feedback.settle(emitter,.18);near(feedback.offset(emitter),0);
}
const energy=cycle("cryo");energy.g.updateWeapons(0);near(feedback.offset(energy.emitter),0);
const dryCannon=cycle("cannon");dryCannon.g.spawnProjectile=()=>null;dryCannon.g.updateWeapons(0);
near(feedback.offset(dryCannon.emitter),0);
// A missile salvo gets one impulse, regardless of its projectile count.
const single=cycle("missile",["base1","base2","heavy"]);
const salvo=cycle("missile",["base1","base2","heavy"]);salvo.def.shots=8;
single.g.updateWeapons(0);salvo.g.updateWeapons(0);
near(single.g.ship.vx,salvo.g.ship.vx);assert.equal(salvo.g.projectiles.length,8);
let configurations=0;
for(const type of ["rail","missile","scatter"]) {
  const licenses=U.trees[type].branches.map(b=>type+":"+b.id);
  function walk(state) {
    const def=U.resolve(MODULES[type],state);
    const path=state && state.path || [];
    const isHeavy=type==="rail" || path.includes("heavy") || path.includes("double");
    assert.ok(feedback.profile({type},def));
    assert.equal(Boolean(feedback.create().fire({type},def,1,0)),isHeavy);
    configurations++;
    for(const option of U.options(type,state,1,licenses))walk(U.nextState(type,state,option));
  }
  walk(undefined);
}

// Verify the existing renderer moves equipment only, including hull-relative aim.
const harness=fs.readFileSync(".artifact_build/runtime-check.js","utf8");
const exposure="    window.__driftBastion = {";
const source=fs.readFileSync("game.js","utf8").replace(exposure,
  "    window.feedbackRenderTest={Game:Game,makeTile:makeTile,draw:drawShip,activate:function(g,a){game=g;moduleArt=a;}};\n"+exposure);
const bootstrap={console,setTimeout,clearTimeout,URLSearchParams,process:{env:{BALANCE_SECONDS:"1"}},require(name){
  if(name==="fs")return {...fs,readFileSync(p,e){return p==="game.js"?source:fs.readFileSync(p,e);}};
  return require(name);
}};
vm.runInNewContext(harness.slice(0,harness.indexOf("let installPromptCalls"))+"\nglobalThis.runtime=sandbox;",bootstrap);
const render=bootstrap.runtime.feedbackRenderTest,ship=new render.Game({training:true}),draws=[];
const rail=render.makeTile("rail",1,0,false);rail.aim=Math.PI/2;
ship.ship.tiles.set("1,0",rail);
ship.weaponFeedback.fire(rail,{},0,1);
render.activate(ship,{available(){return true;},drawBase(c,t,x,y){draws.push({layer:"base",t,x,y});return true;},
  drawEquipment(c,t,x,y){draws.push({layer:"equipment",t,x,y});return true;}});
render.draw();
const base=draws.find(d=>d.layer==="base"&&d.t==="rail");
const equipment=draws.find(d=>d.layer==="equipment"&&d.t==="rail");
near(base.x,42);near(base.y,0);near(equipment.x,42);near(equipment.y,-.16*42);

// Audio voice limits, common salvo throttle and mute/focus/volume cleanup.
let time=1000;
class AudioContextMock {
  constructor(){this.state="running";this.currentTime=1;this.destination={};this.oscillators=[];}
  createGain(){return {gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const context=this;const o={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
    connect(){},disconnect(){},start(){},stop(){},addEventListener(type,fn){this.ended=fn;}};context.oscillators.push(o);return o;}
}
const audioRoot={AudioContext:AudioContextMock};
vm.runInNewContext(fs.readFileSync("combat-audio.js","utf8"),{window:audioRoot,performance:{now:()=>time},Set,Math});
const a=audioRoot.DriftCombatAudio.create();a.heavyShot("rail");assert.equal(a.activeVoices,2);
for(let i=0;i<100;i++)a.heavyShot("missile");assert.equal(a.activeVoices,2);
time+=100;a.heavyShot("scatter");assert.equal(a.activeVoices,4);
for(let i=0;i<30;i++)a.tone(100,.1,.01);assert.equal(a.activeVoices,18);
time+=100;a.heavyShot("rail");assert.equal(a.activeVoices,18);
for(const o of [...a.sources])o.ended();assert.equal(a.activeVoices,0);assert.equal(a.sources.size,0);
a.muted=true;a.heavyShot("rail");assert.equal(a.activeVoices,0);
a.muted=false;a.setFocused(false);a.heavyShot("rail");assert.equal(a.activeVoices,0);
a.setFocused(true);a.setVolume(0);a.heavyShot("rail");assert.equal(a.activeVoices,0);
a.setVolume(.8);a.heavyShot("rail");assert.equal(a.activeVoices,2);
a.stop();assert.equal(a.nextHeavyShotAt,0);
console.log(JSON.stringify({passed:true,heavyConfigurations:configurations,checks:["Base Cannon, missiles, Scatter and Flak kick","Brief hold and complete return","Mass-scaled directional recoil","Opposing guns cancel","Broadside and sustained impulse caps","Real volleys and delayed bursts","No dry-fire or per-pellet recoil","Paused state and settling","Fixed platforms with moving equipment","Audio throttle, voice budget and lifecycle"]}));
