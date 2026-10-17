"use strict";
const {assert,game,enemy,tile,makeTile,upgrades,MODULES} = require("./balance-fixture");
const near=(a,b,label="value")=>assert.ok(Math.abs(a-b)<1e-8,`${label}: ${a} != ${b}`);
const receivers=["cannon","scatter","flak"];
function setup(type="scatter",ex=-1,ey=-1,emberFirst=false) {
  const g=game();g.ship.tiles.clear();g.ship.tiles.set("0,0",makeTile("core",0,0,true));
  let emitter,ember;
  if(emberFirst)ember=tile(g,"ember",ex,ey);
  emitter=tile(g,type,0,-1);
  if(!emberFirst)ember=tile(g,"ember",ex,ey);
  emitter.cooldown=ember.cooldown=999;
  const origin=g.gridToWorld(0,-1),target=g.spawnEnemy("colossus",origin.x+160,origin.y);
  target.hp=target.maxHp=100000;g.rebuildEnemyGrid();
  return {g,emitter,ember,origin,target};
}
function activate(s) {
  const origin=s.g.gridToWorld(s.ember.x,s.ember.y);
  // A real flame burst points away from the pellet target, isolating the combo burn.
  s.g.fireAttack(s.ember,origin,0,-1,s.g.weaponDefinitions.ember,{x:origin.x,y:origin.y-100},1);
}
function fire(s) {s.g.fireAttack(s.emitter,s.origin,1,0,s.g.weaponDefinitions[s.emitter.type],s.target,1);}
function tickBurn(g,seconds) {for(let t=0;t<seconds-1e-9;t+=1/30)g.updateWeaponStatuses(Math.min(1/30,seconds-t));}
const cardinal=[[-1,-1],[1,-1],[0,-2],[0,0]],misses=[[-1,-2],[1,-2],[-1,0],[1,0],[2,-1]];
for(const type of receivers)for(const [x,y] of [...cardinal,...misses]) {
  const s=setup(type,x,y);assert.equal(s.g.hasActiveEmberNeighbor(s.emitter),false,"Idle adjacency is not activation");
  activate(s);const expected=cardinal.some(([a,b])=>a===x&&b===y);
  assert.equal(s.g.hasActiveEmberNeighbor(s.emitter),expected,`${type}: only edge neighbors can activate the combo at ${x},${y}`);
  fire(s);
  if(type!=="flak")assert.ok(s.g.projectiles.length>0&&s.g.projectiles.every(p=>p.incendiary===expected));
  else assert.equal(s.target.burnDamage,expected?3:0);
}
for(const type of ["laser","rail","cryo","missile","mine","arc","pulse","gravity","armor"]){
  const s=setup(type);activate(s);assert.equal(s.g.hasActiveEmberNeighbor(s.emitter),false,"Other module families cannot receive this combo");
}
for(const type of receivers)for(const emberFirst of [false,true]) {
  const s=setup(type,-1,-1,emberFirst);s.emitter.cooldown=s.ember.cooldown=0;
  s.target.x=100;s.g.rebuildEnemyGrid();
  s.g.updateWeapons(0);
  assert.ok(s.ember.emberActiveTime>0);
  if(type!=="flak")assert.ok(s.g.projectiles.length>0&&s.g.projectiles.every(p=>p.incendiary),"Simultaneous firing ignores placement order");
  else assert.ok(s.g.effects.some(e=>e.weaponType==="flak"&&e.incendiary));
}
// Ember cannot activate without a real discharge, even if it is ready to fire.
for(const type of receivers) {
  const idle=setup(type);idle.target.x=230;idle.g.rebuildEnemyGrid();idle.emitter.cooldown=idle.ember.cooldown=0;
  idle.g.updateWeapons(0);
  if(type!=="flak")assert.ok(idle.g.projectiles.length>0&&idle.g.projectiles.every(p=>!p.incendiary));
  else assert.ok(idle.g.effects.some(e=>e.weaponType==="flak"&&!e.incendiary));
  near(idle.ember.emberActiveTime||0,0,"An out-of-range Ember cannot ignite a ready neighbor");
}

for(const type of receivers) {
  const timed=setup(type);activate(timed);timed.g.updateWeapons(.19);fire(timed);
  if(type!=="flak")assert.ok(timed.g.projectiles.every(p=>p.incendiary));
  else assert.ok(timed.g.effects.some(e=>e.weaponType==="flak"&&e.incendiary));
  timed.g.projectiles.length=0;timed.g.effects.length=0;
  timed.g.updateWeapons(.01);fire(timed);
  if(type!=="flak")assert.ok(timed.g.projectiles.every(p=>!p.incendiary),"Window expires at 0.2s");
  else assert.ok(timed.g.effects.some(e=>e.weaponType==="flak"&&!e.incendiary),"Window expires at 0.2s");
  const cooling=setup(type);activate(cooling);cooling.g.updateWeapons(0);
  assert.equal(cooling.g.projectiles.length,0,"Ember must not force a cooling neighbor to fire");
  assert.ok(!cooling.g.effects.some(e=>e.weaponType==="flak"));
  near(cooling.emitter.cooldown,999);
  cooling.g.state="paused";const activeTime=cooling.ember.emberActiveTime;cooling.g.update(1);near(cooling.ember.emberActiveTime,activeTime);
}

for(const type of ["cannon","scatter"]) {
  const volley=setup(type);activate(volley);fire(volley);
  const shots=type==="scatter"?5:1;
  assert.equal(volley.g.projectiles.length,shots);
  volley.g.detachTile("-1,-1",false);assert.equal(volley.g.hasActiveEmberNeighbor(volley.emitter),false);
  const before=volley.target.hp;volley.g.updateProjectiles(.25);
  near(before-volley.target.hp,shots*MODULES[type].damage,"All direct hits retain their damage");
  near(volley.target.burnDamage,3);near(volley.target.burnTimer,1.5);
  const hp=volley.target.hp;tickBurn(volley.g,1.5);near(hp-volley.target.hp,4.5,"A volley shares one burn rather than stacking DPS");
  near(volley.target.burnDamage,0);near(volley.target.burnTimer,0);
  volley.g.projectiles.length=0;fire(volley);assert.ok(volley.g.projectiles.every(p=>!p.incendiary),"Lost Ember cannot activate future shots");
}

const multiple=setup();activate(multiple);
for(const [x,y] of [[1,-1],[0,-2]]){const t=tile(multiple.g,"ember",x,y);t.emberActiveTime=.2;}
fire(multiple);multiple.g.updateProjectiles(.25);near(multiple.target.burnDamage,3);
tickBurn(multiple.g,.1);const pending=multiple.target.burnTickTime;
multiple.g.applyEmberComboBurn(multiple.target);near(multiple.target.burnTickTime,pending,"Refreshing cannot postpone a pending damage tick");near(multiple.target.burnTimer,1.5);
const strong=multiple.target;strong.burnDamage=12;strong.burnTimer=.1;strong.spreadBurn=true;
multiple.g.applyEmberComboBurn(strong);near(strong.burnDamage,12);near(strong.burnTimer,.1);assert.equal(strong.spreadBurn,true,"A weaker combo cannot extend or remove a stronger burn");
const multipleCannon=setup("cannon");activate(multipleCannon);
for(const [x,y] of [[1,-1],[0,-2]]){const t=tile(multipleCannon.g,"ember",x,y);t.emberActiveTime=.2;}
fire(multipleCannon);multipleCannon.g.updateProjectiles(.25);
near(multipleCannon.target.burnDamage,3,"Several active Ember neighbors still grant one Cannon burn");
near(multipleCannon.target.burnTimer,1.5);

const flak=setup("flak");const edge=enemy(flak.g,flak.target.x+MODULES.flak.blastRadius-1,flak.target.y,1000);
const outside=enemy(flak.g,flak.target.x+MODULES.flak.blastRadius+1,flak.target.y,1000);flak.g.rebuildEnemyGrid();
const hostile=flak.g.spawnProjectile(false,"enemy",flak.target.x,flak.target.y,0,0,10,4,2,"#fff");
activate(flak);fire(flak);near(flak.target.burnDamage,3);near(edge.burnDamage,3);near(outside.burnDamage,0);near(hostile.life,0);
assert.ok(flak.g.effects.find(e=>e.weaponType==="flak").incendiary);

const double=setup();upgrades(double.g,"scatter",["base1","base2","cone","cone","double"]);
double.target.x=100;double.g.rebuildEnemyGrid();
double.emitter.cooldown=double.ember.cooldown=0;double.g.updateWeapons(0);
const first=double.g.projectiles.length;double.g.updateWeapons(.15);
assert.equal(double.g.projectiles.length,first*2);assert.ok(double.g.projectiles.every(p=>p.incendiary));
const delayed=setup();upgrades(delayed.g,"scatter",["base1","base2","cone","cone","double"]);
delayed.target.x=100;delayed.g.rebuildEnemyGrid();
delayed.emitter.cooldown=delayed.ember.cooldown=0;delayed.g.updateWeapons(0);
const count=delayed.g.projectiles.length;delayed.g.updateWeapons(.21);
assert.ok(delayed.g.projectiles.slice(count).every(p=>!p.incendiary),"Delayed attacks check the current activation window");

for(const [path,shots] of [
  [["base1","base2","twin"],2],
  [["base1","base2","twin","twin"],3],
  [["base1","base2","twin","twin","fan"],5],
  [["base1","base2","twin","twin","focus"],4]
]) {
  const cannon=setup("cannon");const def=upgrades(cannon.g,"cannon",path);
  activate(cannon);fire(cannon);
  assert.equal(cannon.g.projectiles.length,shots,"Ember preserves cannon specialization volley counts");
  assert.ok(cannon.g.projectiles.every(p=>p.incendiary));
  if(shots<=3) {
    const hp=cannon.target.hp;cannon.g.updateProjectiles(.25);
    near(hp-cannon.target.hp,shots*def.damage,"Parallel cannon volleys retain all direct damage");
    near(cannon.target.burnDamage,3);near(cannon.target.burnTimer,1.5);
    const burningHp=cannon.target.hp;tickBurn(cannon.g,1.5);
    near(burningHp-cannon.target.hp,4.5,"Twin and Triple cannon hits cannot stack burn DPS");
  }
}

for(const path of [
  ["base1","base2","pierce"],
  ["base1","base2","pierce","pierce","through"],
  ["base1","base2","pierce","pierce","impact"]
]) {
  const cannon=setup("cannon");const def=upgrades(cannon.g,"cannon",path);
  cannon.g.enemies=[];cannon.g.enemyById.clear();
  const targets=Array.from({length:def.penetration+1},(_,i)=>enemy(cannon.g,cannon.origin.x+80+i*70,cannon.origin.y,10000));
  cannon.target=targets[0];cannon.g.rebuildEnemyGrid();
  targets[1].burnDamage=12;targets[1].burnTimer=.1;targets[1].spreadBurn=true;
  activate(cannon);
  const directHits=[],damageEnemy=cannon.g.damageEnemy;
  cannon.g.damageEnemy=function(target,...args){directHits.push(target.id);return damageEnemy.call(this,target,...args);};
  fire(cannon);const shot=cannon.g.projectiles[0];
  assert.equal(shot.incendiary,true);
  for(let step=0;step<120;step++)cannon.g.updateProjectiles(1/120);
  assert.equal(directHits.length,def.penetration,"Ignition preserves the penetration cap");
  assert.equal(new Set(directHits).size,directHits.length,"A piercing round cannot repeat-hit the same enemy");
  assert.ok(shot.life<=0,"A piercing shot stops after its allowed direct hits");
  targets.forEach((target,index)=>{
    const hit=index<def.penetration;
    const expected=hit?def.damage*(index>0?(def.secondHitScale||1):1):0;
    near(10000-target.hp,expected,"Piercing damage and Impact second-hit scale are unchanged");
    if(index===1) {
      near(target.burnDamage,12);near(target.burnTimer,.1);assert.equal(target.spreadBurn,true);
    } else {
      near(target.burnDamage,hit?3:0,"Every direct hit receives one minor burn within the cap");
      near(target.burnTimer,hit?1.5:0);
    }
  });
}

// Cannon currently has no burst upgrade; exercise the shared scheduler with a cannon definition.
for(const [interval,lateStep] of [[.15,.15],[.15,.21],[.2,.2]]) {
  const cannon=setup("cannon");
  cannon.g.weaponDefinitions.cannon=Object.assign({},cannon.g.weaponDefinitions.cannon,{burstCount:3,burstInterval:interval});
  cannon.target.x=100;cannon.g.rebuildEnemyGrid();cannon.emitter.cooldown=cannon.ember.cooldown=0;
  cannon.g.updateWeapons(0);assert.equal(cannon.g.projectiles.length,1);assert.equal(cannon.g.projectiles[0].incendiary,true);
  cannon.g.updateWeapons(lateStep);assert.equal(cannon.g.projectiles.length,2);
  assert.equal(cannon.g.projectiles[1].incendiary,lateStep<.2,"Each delayed cannon shot checks the current flame window");
  cannon.g.updateWeapons(interval);assert.equal(cannon.g.projectiles.length,3);
  assert.equal(cannon.g.projectiles[2].incendiary,false);assert.equal(cannon.emitter.pendingBurst,null);
}

const upgraded=setup();upgrades(upgraded.g,"ember",["base1","base2","searing","searing","spread"]);activate(upgraded);fire(upgraded);upgraded.g.updateProjectiles(.25);
near(upgraded.target.burnDamage,3);near(upgraded.target.burnTimer,1.5);assert.equal(upgraded.target.spreadBurn,false,"Combo cannot inherit Ember specialization effects");
const upgradedCannon=setup("cannon");upgrades(upgradedCannon.g,"ember",["base1","base2","searing","searing","spread"]);
activate(upgradedCannon);fire(upgradedCannon);upgradedCannon.g.updateProjectiles(.25);
near(upgradedCannon.target.burnDamage,3);near(upgradedCannon.target.burnTimer,1.5);
assert.equal(upgradedCannon.target.spreadBurn,false,"Cannon cannot inherit Ember specialization effects");
upgraded.target.hp=1;const witness=enemy(upgraded.g,upgraded.target.x+50,upgraded.target.y,1000);upgraded.g.rebuildEnemyGrid();
const matter=upgraded.g.matter;tickBurn(upgraded.g,.6);assert.ok(upgraded.target.dead);assert.ok(upgraded.g.matter>matter);near(witness.burnTimer,0);
upgraded.g.compactEnemies();const reused=upgraded.g.spawnEnemy("scout",100,0);near(reused.burnDamage,0);near(reused.burnTimer,0);near(reused.burnTickTime,0);
const pool=setup();pool.g.projectilePool.push({incendiary:true});const plain=pool.g.spawnProjectile(true,"scatter",0,0,0,0,1,2,1,"#fff");assert.equal(plain.incendiary,false);
pool.g.projectilePool.push({incendiary:true});const plainCannon=pool.g.spawnProjectile(true,"cannon",0,0,0,0,1,2,1,"#fff");assert.equal(plainCannon.incendiary,false);
pool.g.effectPool.push({incendiary:true});assert.equal(pool.g.spawnEffect("ring",0,0,1,"#fff").incendiary,false);
console.log(JSON.stringify({passed:true,checks:["Actual activation required","All four edge neighbors; no diagonals","Only Cannon/Scatter/Flak","Order-independent simultaneous fire","0.2s window and pause","No cooldown bypass","Launch snapshot and source loss","One 3 DPS burn for 1.5s","No multi-Ember or volley stacks","Stronger burn preservation","Flak area bounds and interception","Delayed Double blast timing","Cannon Twin/Triple/Fan/Focus counts","Piercing cap, every direct hit and Impact scaling","Delayed cannon scheduler rechecks window","No inherited specializations","Real death rewards and pooled resets"]}));
