"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8");
const marker = "    window.__driftBastion = {";
const sourcePath = process.argv[2] || "game.js";
let gameSource = fs.readFileSync(sourcePath, "utf8");
if (/\.html?$/i.test(sourcePath)) {
  const scripts = Array.from(gameSource.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi), match=>match[1])
    .filter(script=>script.includes("Game.prototype.findProjectileImpact ="));
  assert.equal(scripts.length,1,"Expected exactly one game runtime script in the standalone HTML");
  gameSource = scripts[0];
}
assert.equal(gameSource.split(marker).length, 2);
const source = gameSource.replace(marker, `
    window.moduleCollisionTest = {Game,makeTile,save,defaultSave,place:placePurchasedModule,
      activate:function(instance,type){game=instance;selectedBuildModule=type||"cannon";
        buildInteraction.selectedKey=null;buildInteraction.pendingCellKey=null;}};
` + marker);
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: { env: { BALANCE_SECONDS: "1" } },
  require(name) {
    if (name === "fs") return { ...fs, readFileSync(file, encoding) {
      return file === "game.js" ? source : fs.readFileSync(file, encoding);
    } };
    return require(name);
  }
};
vm.runInNewContext(harness.slice(0, harness.indexOf("let installPromptCalls")) +
  "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.moduleCollisionTest;
assert.equal(typeof api.Game.prototype.findProjectileImpact, "function", "Swept collision API is required");
assert.equal(typeof api.Game.prototype.applyProjectileDamageToTile, "function", "Projectile mercy API is required");
const checks = [];
const near = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<1e-8,
  `${label}: ${actual} != ${expected}`);
function check(label, run) { run(); checks.push(label); }
function fresh() {
  Object.assign(api.save,api.defaultSave());
  api.save.settings.damageNumbers = false;
  api.save.settings.muted = true;
  const g = new api.Game({training:true});
  g.operation = null; g.elapsed = 1;
  g.enemies = []; g.enemyById.clear(); g.enemyGrid.clear(); g.projectiles = [];
  g.ship.tiles.clear();
  g.ambientSpawnClock = g.assaultClock = g.nextBossAt = 999;
  api.activate(g);
  add(g,"core",0,0);
  return g;
}
function add(g,type,x,y) {
  const tile = api.makeTile(type,x,y,type==="core",1,true);
  tile.cooldown = 999;
  g.ship.tiles.set(`${x},${y}`,tile);
  return tile;
}
function world(g,x,y) {
  const cos = Math.cos(g.ship.angle), sin = Math.sin(g.ship.angle);
  return {x:g.ship.x+x*cos-y*sin,y:g.ship.y+x*sin+y*cos};
}
function sweep(g,x1,y1,x2,y2,radius,ignored) {
  const a = world(g,x1,y1), b = world(g,x2,y2);
  return g.findProjectileImpact(a.x,a.y,b.x,b.y,radius,ignored);
}
function shot(g,{kind="bolterShot",damage=24,x=0,y=-150,vx=0,vy=3000,radius=3,dt=.1}={}) {
  const start = world(g,x,y), cos = Math.cos(g.ship.angle), sin = Math.sin(g.ship.angle);
  const projectile = g.spawnProjectile(false,kind,start.x,start.y,vx*cos-vy*sin,vx*sin+vy*cos,
    damage,radius,5,"#ff637c");
  assert.ok(projectile);
  g.updateProjectiles(dt);
  assert.ok([projectile.x,projectile.y,projectile.life,projectile.damage].every(Number.isFinite));
  return projectile;
}

check("Full square corners and exact incoming-circle corners",()=>{
  const g = fresh();
  assert.equal(g.findImpactedTile(20,20,0),"0,0","Visible square corners must block");
  assert.equal(g.findImpactedTile(22,22,0),null);
  assert.equal(g.findImpactedTile(21.8,21.8,1),null,"Expanded-AABB corner must not become a false hit");
  assert.equal(g.findImpactedTile(21.8,21.8,1.2),"0,0");
  assert.equal(g.findImpactedTile(0,0,3,new Set(["0,0"])),null);
  add(g,"armor",1,0);
  assert.ok(g.findImpactedTile(21,0,0),"Adjacent hull squares cannot leave a structural seam");
});
check("Rotated and translated point/swept square geometry",()=>{
  for (const angle of [0,Math.PI/2,-.73,Math.PI]) {
    const g = fresh(); g.ship.angle = angle; g.ship.x = 137; g.ship.y = -91;
    add(g,"armor",0,-1);
    const point = world(g,20,-22);
    assert.equal(g.findImpactedTile(point.x,point.y,0),"0,-1");
    const hit = sweep(g,0,-150,0,150,3);
    assert.equal(hit.key,"0,-1"); near(hit.time,(150-66)/300,"Front square entry time");
    const core = sweep(g,0,-150,0,150,3,new Set(["0,-1"]));
    assert.equal(core.key,"0,0"); near(core.time,(150-24)/300,"Ignored outer square exposes core");
  }
});
check("Swept edges, rounded circle corners and zero-length paths",()=>{
  const g = fresh();
  near(sweep(g,20,-100,20,100,0).time,79/200,"Square corner lane");
  assert.equal(sweep(g,22.1,-100,22.1,100,1),null,"A parallel near miss stays a miss");
  near(sweep(g,30,30,20,20,1).time,(9-Math.SQRT1_2)/10,"Exact diagonal corner contact");
  assert.equal(sweep(g,21.8,21.8,21.8,21.8,1),null);
  const inside = sweep(g,20,20,20,20,0);
  assert.equal(inside.key,"0,0"); near(inside.time,0,"Already overlapping path");
});
check("Open holes stay open and map insertion cannot choose a later tile",()=>{
  const g = fresh(); add(g,"armor",1,0); add(g,"armor",0,1);
  assert.equal(g.findImpactedTile(42,42,0),null);
  assert.equal(sweep(g,42,28,42,100,1),null);
  assert.equal(sweep(g,84,-150,84,150,3),null);
  g.ship.tiles.clear(); add(g,"core",0,0); add(g,"cannon",0,-1); add(g,"armor",0,-2);
  assert.equal(sweep(g,0,-200,0,100,3).key,"0,-2");
});
check("Fast ordinary shots hit the outer blocker before the core",()=>{
  for (const angle of [0,.91,Math.PI/2]) {
    const g = fresh(); const core = g.ship.tiles.get("0,0"), armor = add(g,"armor",0,-1);
    g.ship.angle = angle; g.ship.x = -80; g.ship.y = 120;
    shot(g);
    near(armor.hp,armor.maxHp-24,"Outer hull damage"); near(core.hp,core.maxHp,"Core is blocked");
    assert.equal(g.projectiles.length,0,"Crossing an entire ship in one frame cannot tunnel");
  }
});
check("A sniper hits two distinct modules in one frame and stops",()=>{
  const g = fresh(), core = g.ship.tiles.get("0,0");
  const inner = add(g,"cannon",0,-1), outer = add(g,"cannon",0,-2), hits = [];
  const apply = g.applyProjectileDamageToTile;
  g.applyProjectileDamageToTile = function (key,amount) { hits.push(key); return apply.call(this,key,amount); };
  shot(g,{kind:"sniperShot",y:-180,vy:4000});
  assert.deepEqual(hits,["0,-2","0,-1"]);
  near(outer.hp,outer.maxHp-24,"Primary hit"); near(inner.hp,inner.maxHp-15.6,"Attenuated second hit");
  near(core.hp,core.maxHp,"Two-module limit protects core"); assert.equal(g.projectiles.length,0);
});
check("Armor and Bulkhead stop even a shot that destroys them",()=>{
  for (const type of ["armor","bulkhead"]) for (const broken of [false,true]) {
    const g = fresh(), core = g.ship.tiles.get("0,0"), blocker = add(g,type,0,-1);
    if (broken) blocker.hp = 1;
    shot(g,{kind:"sniperShot",damage:50});
    near(core.hp,core.maxHp,"Dedicated blocker stops penetration"); assert.equal(g.projectiles.length,0);
    if (broken) assert.equal(g.ship.tiles.has("0,-1"),false);
    else near(blocker.hp,blocker.maxHp-50,"Blocker damage");
  }
});
check("Full and partial shields preserve actual sniper energy bookkeeping",()=>{
  for (const charge of [60,10]) {
    const g = fresh(), core = g.ship.tiles.get("0,0"), receiver = add(g,"cannon",0,-1), shield = add(g,"shield",1,0);
    shield.shield = charge;
    shot(g,{kind:"sniperShot"});
    near(shield.shield,Math.max(0,charge-24),"Only participating shield charge is spent");
    near(receiver.hp,receiver.maxHp-Math.max(0,24-charge),"Unabsorbed primary damage");
    near(core.hp,core.maxHp-(charge===10?9.1:0),"Only unabsorbed energy penetrates");
    near(receiver.projectileHitProtectedUntil,g.elapsed+.1,"Shielded hits also grant mercy");
  }
});
check("Projectile mercy is per module, expires exactly and rejects invalid hits",()=>{
  const g = fresh(), a = add(g,"cannon",1,0), b = add(g,"cannon",0,-1);
  near(a.placementProtectedUntil,0,"Initial placement deadline"); near(a.projectileHitProtectedUntil,0,"Initial hit deadline");
  g.applyProjectileDamageToTile("1,0",10); const deadline = a.projectileHitProtectedUntil;
  near(deadline,1.1,"Hit mercy duration");
  g.elapsed = 1.05; g.applyProjectileDamageToTile("1,0",10);
  near(a.hp,a.maxHp-10,"Same module is protected"); near(a.projectileHitProtectedUntil,deadline,"Ignored hits cannot prolong mercy");
  g.applyProjectileDamageToTile("0,-1",7); near(b.hp,b.maxHp-7,"Another module stays vulnerable");
  g.elapsed = deadline; g.applyProjectileDamageToTile("1,0",6);
  near(a.hp,a.maxHp-16,"The exact deadline is vulnerable");
  g.elapsed = 2; const next = a.projectileHitProtectedUntil;
  for (const amount of [0,-1,NaN,Infinity]) g.applyProjectileDamageToTile("1,0",amount);
  near(a.hp,a.maxHp-16,"Invalid damage cannot hurt"); near(a.projectileHitProtectedUntil,next,"Invalid damage cannot grant mercy");
});
check("Mercy consumes a later incoming sniper without leaking to the core",()=>{
  const g = fresh(), receiver = add(g,"cannon",0,-1), core = g.ship.tiles.get("0,0");
  g.applyProjectileDamageToTile("0,-1",10);
  shot(g,{kind:"sniperShot"});
  near(receiver.hp,receiver.maxHp-10,"Protected receiver absorbs without more HP loss");
  near(core.hp,core.maxHp,"Ignored hit still physically stops the bullet"); assert.equal(g.projectiles.length,0);
});
check("Protected hits spend no shield or recharge/repair bookkeeping",()=>{
  const g = fresh(), receiver = add(g,"cannon",1,0), shield = add(g,"shield",0,1);
  g.applyProjectileDamageToTile("1,0",12);
  near(shield.shield,48,"First shield hit spends charge");
  receiver.repairDelay = 1.7; receiver.repairCooldown = .6; shield.shieldDelay = 2.2;
  const before = JSON.stringify({hp:receiver.hp,repairDelay:receiver.repairDelay,repairCooldown:receiver.repairCooldown,
    shield:shield.shield,shieldDelay:shield.shieldDelay,reserveCharge:shield.reserveCharge,reserveCooldown:shield.reserveCooldown});
  g.elapsed += .05; g.applyProjectileDamageToTile("1,0",12);
  assert.equal(JSON.stringify({hp:receiver.hp,repairDelay:receiver.repairDelay,repairCooldown:receiver.repairCooldown,
    shield:shield.shield,shieldDelay:shield.shieldDelay,reserveCharge:shield.reserveCharge,reserveCooldown:shield.reserveCooldown}),before);
  near(g.lastShieldAbsorbed,0,"Blocked damage cannot retain stale shield absorption");
  assert.equal(g.shieldBuffer.length,0,"Ignored hit clears old participating-shield bookkeeping");
});
check("Continuous damage ignores projectile mercy",()=>{
  const g = fresh(), receiver = add(g,"cannon",1,0);
  g.applyProjectileDamageToTile("1,0",10); const deadline = receiver.projectileHitProtectedUntil;
  g.applyDamageToTile("1,0",4); g.applyDamageToTile("1,0",4);
  near(receiver.hp,receiver.maxHp-18,"Contact/continuous damage is not throttled");
  near(receiver.projectileHitProtectedUntil,deadline,"Continuous damage cannot extend projectile mercy");
});
check("Actual purchase grace freezes in Build and expires for every damage path",()=>{
  const g = fresh(); g.state = "building"; g.elapsed = 12.3; g.matter = 1000; api.activate(g,"cannon");
  assert.equal(api.place(1,0),true);
  const receiver = g.ship.tiles.get("1,0"), deadline = receiver.placementProtectedUntil;
  near(deadline,12.65,"Purchased placement grace");
  g.applyDamageToTile("1,0",12); g.applyProjectileDamageToTile("1,0",12);
  near(receiver.hp,receiver.maxHp,"Both damage paths respect placement grace");
  near(receiver.projectileHitProtectedUntil,0,"Ignored placement hit grants no extra mercy");
  g.update(60); near(g.elapsed,12.3,"Build pause cannot expire placement protection");
  near(receiver.placementProtectedUntil,deadline,"Paused deadline stays unchanged");
  g.elapsed = deadline-1e-5; g.applyDamageToTile("1,0",12); near(receiver.hp,receiver.maxHp,"Just before expiry");
  g.elapsed = deadline; g.applyDamageToTile("1,0",12); near(receiver.hp,receiver.maxHp-12,"Placement grace expires exactly");
});
check("A paused overlapping bullet is consumed safely on the first resume",()=>{
  const g = fresh(); g.state = "building"; g.elapsed = 10; g.matter = 1000; api.activate(g,"cannon");
  assert.equal(api.place(1,0),true);
  const receiver = g.ship.tiles.get("1,0"), shield = add(g,"shield",0,1);
  receiver.repairDelay = 1.7; shield.shieldDelay = 2.2;
  const projectile = g.spawnProjectile(false,"bolterShot",42,0,0,0,15,3,2,"#ff637c");
  g.update(30); assert.equal(g.projectiles.length,1); near(projectile.life,2,"Paused projectile lifetime");
  near(g.elapsed,10,"Paused simulation clock");
  g.state = "playing"; g.update(1/30);
  assert.equal(g.projectiles.length,0); assert.ok(projectile.life<=0);
  near(receiver.hp,receiver.maxHp,"Fresh placed hull survives overlap"); near(shield.shield,shield.maxShield,"No shield charge spent");
  near(shield.shieldDelay,2.2-1/30,"Only normal simulation decay changes shield delay");
  near(receiver.repairDelay,1.7-1/30,"Only normal simulation decay changes repair delay");
  near(receiver.projectileHitProtectedUntil,0,"Consumed overlap cannot extend protection");
});
check("Core destruction stops later friendly collisions in the same update",()=>{
  const g = fresh();
  g.training = false;
  g.ship.tiles.get("0,0").hp = 1;
  const enemy = g.spawnEnemy("hunter",1000,0);
  enemy.hp = enemy.maxHp = 1;
  g.rebuildEnemyGrid();
  const matter = g.matter;
  g.spawnProjectile(false,"bolterShot",0,0,0,0,10,3,2,"#ff637c");
  g.spawnProjectile(true,"cannon",enemy.x,enemy.y,0,0,10,3,2,"#65e8ff");
  g.updateProjectiles(1/30);
  assert.equal(g.finished,true,"The hostile shot must destroy Core first");
  assert.equal(enemy.dead,false,"A later friendly projectile cannot kill after run results finalize");
  near(enemy.hp,1,"No damage after Core destruction");
  assert.equal(g.kills,0); near(g.matter,matter,"No post-result kill rewards");
});

console.log(JSON.stringify({passed:true,source:sourcePath,checks,geometry:{tileSize:42,halfSize:21},
  protection:{placementSeconds:.35,projectileSeconds:.1}},null,2));
