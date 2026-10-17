"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = process.argv[2] || "game.js";
let source = fs.readFileSync(sourcePath, "utf8");
let coldSource = null;
if (/\.html?$/i.test(sourcePath)) {
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1]);
  const runtimes = scripts.filter(script => script.includes("Game.prototype.fireAttack ="));
  const cold = scripts.filter(script => script.includes("root.DriftColdVfx ="));
  assert.equal(runtimes.length, 1, "Expected one game runtime in standalone HTML");
  assert.equal(cold.length, 1, "Expected one cold renderer in standalone HTML");
  source = runtimes[0]; coldSource = cold[0];
}
const marker = "    window.__driftBastion = {";
assert.equal(source.split(marker).length, 2, "Expected one fixture injection point");
source = source.replace(marker, `
    window.cryoComboTest = {Game,makeTile,save,defaultSave,MODULES,upgrades:runUpgrades,
      supportCoversCell,receivedSupportBenefits,updateBuildPreview,
      activate:function(instance){game=instance;},
      preview:function(instance,type,cells){game=instance;selectedBuildModule=type;
        buildInteraction.owner=instance;buildInteraction.selectedKey=null;buildInteraction.drag=null;
        ui.buildGrid.children=cells;}};
` + marker);
const harness = fs.readFileSync(".artifact_build/runtime-check.js", "utf8").split("let installPromptCalls")[0];
const bootstrap = {
  console, URLSearchParams, setTimeout() { return 0; }, clearTimeout() {},
  process: {env: {BALANCE_SECONDS: "1"}},
  require(name) {
    if (name === "fs") return {...fs, readFileSync(file, encoding) {
      if (file === "game.js") return source;
      if (file === "cold-vfx.js" && coldSource) return coldSource;
      return fs.readFileSync(file, encoding);
    }};
    return require(name);
  }
};
vm.runInNewContext(harness + "\nglobalThis.runtime=sandbox;", bootstrap);
const api = bootstrap.runtime.cryoComboTest;
assert.equal(typeof api.Game.prototype.hasCryoNeighbor, "function", "Cryo adjacency API exists");
const checks = [];
function check(label, run) { run(); checks.push(label); }
function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
}
function add(g, type, x, y) {
  const tile = api.makeTile(type, x, y, type === "core", 1, true);
  tile.cooldown = 999;
  g.ship.tiles.set(`${x},${y}`, tile);
  g.applyFamilyTileStats(tile, true);
  return tile;
}
function fresh(cryoX = -1, cryoY = -1, type = "rail") {
  Object.assign(api.save, api.defaultSave());
  api.save.settings.muted = true;
  api.save.settings.damageNumbers = false;
  const g = new api.Game();
  g.operation = null; g.elapsed = 1;
  g.enemies = []; g.enemyById.clear(); g.enemyGrid.clear();
  g.projectiles = []; g.ship.tiles.clear(); g.effects = []; g.particles = [];
  add(g, "core", 0, 0);
  const rail = add(g, type, 0, -1);
  const cryo = cryoX === null ? null : add(g, "cryo", cryoX, cryoY);
  const origin = g.gridToWorld(rail.x, rail.y);
  api.activate(g);
  return {g, rail, cryo, origin};
}
function target(s, status = "clean", x = s.origin.x + 110, type = "colossus") {
  let enemy;
  if (type === "boss") { s.g.spawnBoss(); enemy = s.g.boss; enemy.x = x; enemy.y = s.origin.y; }
  else enemy = s.g.spawnEnemy(type, x, s.origin.y);
  enemy.hp = enemy.maxHp = 10000;
  enemy.speed = enemy.vx = enemy.vy = 0;
  enemy.fireClock = 999;
  enemy.slowTimer = status === "cold" ? 2 : 0;
  enemy.slowFactor = status === "cold" ? (type === "boss" ? .8 : .5) : 1;
  enemy.freezeUntil = status === "frozen" ? s.g.elapsed + .6 : 0;
  enemy.freezeImmuneUntil = status === "frozen" ? s.g.elapsed + 3.6 : 0;
  s.g.rebuildEnemyGrid();
  return enemy;
}
function fire(s, enemy, def = s.g.weaponDefinitions[s.rail.type]) {
  const dx = enemy.x - s.origin.x, dy = enemy.y - s.origin.y;
  const length = Math.hypot(dx, dy);
  s.g.fireAttack(s.rail, s.origin, dx / length, dy / length, def, enemy, 1);
  return s.g.projectiles.at(-1);
}
function resolve(g) {
  for (let frame = 0; g.projectiles.length && frame < 240; frame += 1) g.updateProjectiles(1 / 120);
  assert.equal(g.projectiles.length, 0, "Every fixture projectile resolves or expires");
}
function shatters(g) { return g.effects.filter(effect => effect.type === "cryoShatter"); }
function upgrade(s, type, ids) {
  const data = {}, licenses = api.upgrades.trees[type].branches.map(branch => type + ":" + branch.id);
  for (const id of ids) assert.ok(api.upgrades.purchase(data, type, id, 1e8, 1, undefined, licenses));
  s.g.upgrades[type] = data[type];
  return s.g.weaponDefinitions[type] = api.upgrades.resolve(api.MODULES[type], data[type]);
}
function cryoHit(s, enemy, def = s.g.weaponDefinitions.cryo) {
  const origin = s.g.gridToWorld(s.cryo.x, s.cryo.y);
  const dx = enemy.x - origin.x, dy = enemy.y - origin.y, length = Math.hypot(dx, dy);
  s.g.fireAttack(s.cryo, origin, dx / length, dy / length, def, enemy, 1);
  resolve(s.g);
}

check("Only four edge neighbors enable an installed Rail; idle Cryo is sufficient", () => {
  const edges = [[-1,-1],[1,-1],[0,-2],[0,0]];
  for (const [x,y] of [...edges,[-1,-2],[1,-2],[-1,0],[1,0],[2,-1]]) {
    const s = fresh(x,y);
    const expected = edges.some(([a,b]) => x === a && y === b);
    assert.equal(s.g.hasCryoNeighbor(s.rail), expected, `Adjacency at ${x},${y}`);
    const shot = fire(s,target(s,"cold"));
    assert.equal(shot.shatter, expected, "Rail snapshots edge adjacency on launch");
    assert.equal(shot.kind, "rail", "Combo keeps ordinary Rail targeting and piercing kind");
  }
  for (const type of ["cannon","scatter","flak","laser","arc","pulse","mine","ember","gravity","armor","cryo"]) {
    const s = fresh(-1,-1,type);
    assert.equal(s.g.hasCryoNeighbor(s.rail), false, `No implicit combo for ${type}`);
  }
  const s = fresh();
  assert.equal(s.g.hasCryoNeighbor({...s.rail}), false, "An uninstalled lookalike cannot inherit adjacency");
  s.g.ship.tiles.delete("0,-1");
  assert.equal(s.g.hasCryoNeighbor(s.rail), false, "Detached Rail cannot inherit adjacency");
});

check("Bonus is exactly 25% per impact against actual chill or real non-boss freeze", () => {
  for (const [status,modify,boosted] of [
    ["clean",()=>{},false], ["cold",()=>{},true], ["frozen",()=>{},true],
    ["clean",e=>{e.slowFactor=.5;},false],
    ["clean",e=>{e.slowTimer=2;},false],
    ["cold",e=>{e.slowTimer=0;},false],
    ["frozen",(e,g)=>{e.freezeUntil=g.elapsed;},false],
    ["cold",(e,g)=>{e.freezeUntil=g.elapsed;},true]
  ]) {
    const s = fresh(), enemy = target(s,status); modify(enemy,s.g);
    const shot = fire(s,enemy), damage = shot.damage;
    resolve(s.g);
    near(10000-enemy.hp,damage*(boosted?1.25:1),"Impact damage uses current cold status");
    assert.equal(shatters(s.g).length,boosted?1:0,"Only boosted impacts produce ice fragments");
  }
});

check("Actual Cryo impacts enable the combo without granting or consuming statuses", () => {
  const s = fresh(), enemy = target(s);
  cryoHit(s,enemy);
  near(enemy.slowFactor,.5,"Real base Cryo slow"); near(enemy.slowTimer,2,"Real base Cryo duration");
  const before = enemy.hp, status = JSON.stringify({slow:enemy.slowFactor,time:enemy.slowTimer,
    freeze:enemy.freezeUntil,immune:enemy.freezeImmuneUntil,hitTimes:enemy.freezeHitTimes});
  const shot = fire(s,enemy);
  resolve(s.g);
  near(before-enemy.hp,shot.damage*1.25,"A real chilled enemy takes the combo bonus");
  assert.equal(JSON.stringify({slow:enemy.slowFactor,time:enemy.slowTimer,
    freeze:enemy.freezeUntil,immune:enemy.freezeImmuneUntil,hitTimes:enemy.freezeHitTimes}),status);
  const clean = fresh(), victim = target(clean);
  fire(clean,victim);resolve(clean.g);
  near(victim.slowTimer,0,"Shatter rounds cannot apply their own chill");
  near(victim.slowFactor,1,"Clean target remains clean");
});

check("Status is evaluated at impact rather than remembered at launch", () => {
  const s = fresh(), enemy = target(s,"cold"), shot = fire(s,enemy);
  enemy.slowTimer = 0; resolve(s.g);
  near(10000-enemy.hp,shot.damage,"Expired chill cannot earn the bonus");
  const later = fresh(), victim = target(later), delayed = fire(later,victim);
  victim.slowFactor = .5; victim.slowTimer = 2; resolve(later.g);
  near(10000-victim.hp,delayed.damage*1.25,"A chill acquired during flight earns the bonus");
});

check("Several Cryos do not stack; no adjacent Cryo means ordinary Rail damage", () => {
  const s = fresh(); add(s.g,"cryo",1,-1);add(s.g,"cryo",0,-2);
  const enemy = target(s,"cold"), shot = fire(s,enemy); resolve(s.g);
  near(10000-enemy.hp,shot.damage*1.25,"Multiple neighbors still give one multiplier");
  const plain = fresh(null), victim = target(plain,"cold"), ordinary = fire(plain,victim);resolve(plain.g);
  assert.equal(ordinary.shatter,false);near(10000-victim.hp,ordinary.damage,"Unlinked Rail stays ordinary");
  assert.equal(shatters(plain.g).length,0);
});

check("Launched rounds retain their snapshot; moving or severing Cryo changes future rounds", () => {
  const s = fresh(), enemy = target(s,"cold"), shot = fire(s,enemy);
  s.g.detachTile("-1,-1",false);
  assert.equal(s.g.hasCryoNeighbor(s.rail),false);resolve(s.g);
  near(10000-enemy.hp,shot.damage*1.25,"Source loss does not erase a launched round");
  const before = enemy.hp, plain = fire(s,enemy);resolve(s.g);
  assert.equal(plain.shatter,false);near(before-enemy.hp,plain.damage,"Future rounds lose the link");
  const moved = fresh();moved.g.ship.tiles.delete("-1,-1");moved.cryo.x=-1;moved.cryo.y=-2;
  moved.g.ship.tiles.set("-1,-2",moved.cryo);
  assert.equal(moved.g.hasCryoNeighbor(moved.rail),false,"Moving to a diagonal removes adjacency");
  const added = fresh(null), victim = target(added,"cold"), ordinary = fire(added,victim);
  add(added.g,"cryo",-1,-1);resolve(added.g);
  near(10000-victim.hp,ordinary.damage,"Adding a Cryo cannot upgrade a projectile already in flight");
});

check("One Rail pierces mixed targets with independent status checks and normal knockback", () => {
  const s = fresh(), victims = [target(s,"cold",80),target(s,"clean",170),target(s,"frozen",260)];
  const shot = fire(s,victims[0]), hits = [];
  const damageEnemy = s.g.damageEnemy;
  s.g.damageEnemy = function (enemy,...args) {hits.push(enemy.id);return damageEnemy.call(this,enemy,...args);};
  resolve(s.g);
  assert.equal(hits.length,3);assert.equal(new Set(hits).size,3,"Each target is hit once");
  for (let i=0;i<victims.length;i+=1) {
    near(10000-victims[i].hp,shot.damage*(i===1?1:1.25),"Per-target piercing damage");
    near(victims[i].vx,shot.knockback,"Ordinary Rail knockback stays unchanged");
    near(victims[i].vy,0,"Horizontal shot adds no vertical knockback");
  }
  assert.equal(shatters(s.g).length,2);
});

check("Bosses keep cold resistance and cannot earn a fake hard-freeze bonus", () => {
  const s = fresh(), boss = target(s,"clean",110,"boss");
  cryoHit(s,boss);
  near(boss.slowFactor,.8,"Cryo keeps boss at 80% speed");near(boss.freezeUntil,0,"Boss is not hard frozen");
  const before=boss.hp, shot=fire(s,boss);resolve(s.g);
  near(before-boss.hp,shot.damage*1.25,"Genuine boss chill earns one bonus");
  near(boss.vx,0,"Boss cannot receive Rail knockback");
  const fake=fresh(), victim=target(fake,"frozen",110,"boss"), ordinary=fire(fake,victim);resolve(fake.g);
  near(10000-victim.hp,ordinary.damage,"Unsupported boss freeze timer is not genuine cold");
});

check("Four-hit Freeze, immunity and stronger burn survive Rail shatter unchanged", () => {
  const s=fresh(), enemy=target(s), def=upgrade(s,"cryo",["base1","base2","deep","deep","freeze"]);
  for(let i=0;i<4;i+=1){s.g.elapsed=1+i*.1;cryoHit(s,enemy,def);}
  near(enemy.freezeUntil,s.g.elapsed+.6,"Actual four-hit proc remains 0.6s");
  near(enemy.freezeImmuneUntil,s.g.elapsed+3.6,"Freeze immunity remains 3.6s");
  enemy.burnDamage=12;enemy.burnTimer=.7;enemy.burnTickTime=.2;enemy.spreadBurn=true;
  const before=enemy.hp, status=JSON.stringify({factor:enemy.slowFactor,timer:enemy.slowTimer,
    freeze:enemy.freezeUntil,immune:enemy.freezeImmuneUntil,hits:enemy.freezeHitTimes,
    burn:enemy.burnDamage,burnTime:enemy.burnTimer,burnTick:enemy.burnTickTime,spread:enemy.spreadBurn});
  const shot=fire(s,enemy);resolve(s.g);
  near(before-enemy.hp,shot.damage*1.25,"Frozen and burning enemy receives one direct bonus");
  assert.equal(JSON.stringify({factor:enemy.slowFactor,timer:enemy.slowTimer,
    freeze:enemy.freezeUntil,immune:enemy.freezeImmuneUntil,hits:enemy.freezeHitTimes,
    burn:enemy.burnDamage,burnTime:enemy.burnTimer,burnTick:enemy.burnTickTime,spread:enemy.spreadBurn}),status);
});

check("Heavy and Magazine upgrades retain damage, recoil, burst counts and cooldowns", () => {
  for (const path of [[],["base1","base2","heavy"],["base1","base2","heavy","heavy"],
    ["base1","base2","magazine"],["base1","base2","magazine","magazine"]]) {
    const s=fresh(), enemy=target(s,"cold");
    const def=path.length?upgrade(s,"rail",path):s.g.weaponDefinitions.rail;
    s.rail.cooldown=0;
    const shots=[],spawn=s.g.spawnProjectile;
    s.g.spawnProjectile=function(...args){const projectile=spawn.apply(this,args);if(projectile&&projectile.kind==="rail")shots.push(projectile);return projectile;};
    s.g.updateWeapons(0);
    near(s.rail.cooldown,def.cooldown,"Combo does not bypass reload");
    for(let i=1;i<(def.burstCount||1);i+=1)s.g.updateWeapons(def.burstInterval);
    assert.equal(shots.length,def.burstCount||1,"Magazine keeps its normal burst count");
    assert.ok(shots.every(shot=>shot.shatter&&shot.damage===def.damage&&shot.knockback===(def.knockback||125)));
    resolve(s.g);
    near(10000-enemy.hp,def.damage*(def.burstCount||1)*1.25,"Each upgraded round gets one bonus");
  }
});

check("Delayed Magazine discharge rechecks adjacency and pool reuse resets the flag", () => {
  const s=fresh(), enemy=target(s,"cold"),def=upgrade(s,"rail",["base1","base2","magazine"]);
  s.rail.cooldown=0;s.g.updateWeapons(0);
  assert.equal(s.g.projectiles[0].shatter,true);
  s.g.detachTile("-1,-1",false);s.g.updateWeapons(def.burstInterval);
  assert.equal(s.g.projectiles.length,2);assert.equal(s.g.projectiles[1].shatter,false);
  resolve(s.g);
  const pool=s.g.projectilePool;s.g.projectilePool=[];
  for(const [friendly,kind]of [[true,"rail"],[true,"cannon"],[true,"cryo"],[false,"sniperShot"]]){
    const reused={shatter:true,hitIds:new Set([enemy.id])};s.g.projectilePool.push(reused);
    const projectile=s.g.spawnProjectile(friendly,kind,0,0,1,0,1,3,1,"#fff");
    assert.equal(projectile,reused);assert.equal(projectile.shatter,false,"Pooled flags must reset for "+kind);
    assert.equal(projectile.hitIds.size,0,"Pooled hit IDs must reset");
  }
  s.g.projectilePool=pool;
});

check("Cryo adjacency preserves unrestricted Rail aiming, including targets behind the ship", () => {
  const s=fresh(),enemy=target(s,"cold",-110);s.rail.cooldown=0;s.g.updateWeapons(0);
  assert.equal(s.g.projectiles.length,1);
  const shot=s.g.projectiles[0];assert.ok(shot.vx<0);assert.equal(shot.shatter,true);
  resolve(s.g);near(10000-enemy.hp,shot.damage*1.25,"Rear target receives normal combo damage");
});

check("A boosted killing hit still shows compact shatter and grants normal rewards once", () => {
  const s=fresh(), enemy=target(s,"cold");enemy.hp=1;
  const matter=s.g.matter;fire(s,enemy);resolve(s.g);
  assert.equal(enemy.dead,true);assert.ok(s.g.matter>matter,"Normal death reward remains active");
  assert.equal(shatters(s.g).length,1,"Killing impact receives exactly one shatter cue");
  const effect=shatters(s.g)[0];
  assert.ok(effect.radius>0&&effect.radius<=32,"Shatter stays near the impacted hull");
  near(effect.maxLife,.24,"No persistent combo aura");
});

check("Build badges match combat adjacency and placement ghosts do not promise diagonal combos", () => {
  const s=fresh(), second=add(s.g,"cryo",1,-1);
  const benefits=api.receivedSupportBenefits(0,-1,s.rail,[s.cryo,second]);
  assert.equal(benefits.length,1);assert.equal(benefits[0].type,"cryo");assert.equal(benefits[0].count,1);
  assert.match(benefits[0].label,/25%.*does not stack/);
  assert.equal(api.supportCoversCell(s.cryo,0,-2,{type:"rail"}),false,"Diagonal does not advertise coverage");
  assert.equal(api.receivedSupportBenefits(0,-1,{type:"cannon"},[s.cryo]).length,0);
  function cell(x,y) {
    const cell=bootstrap.runtime.document.createElement("button");
    cell.dataset={x:String(x),y:String(y)};cell.setAttribute("aria-label",`${x},${y}`);
    return cell;
  }
  s.g.state="building";s.g.testRange=true;s.g.matter=10000;
  s.g.ship.tiles.delete("1,-1");
  const railGhost=cell(-1,-2),diagonalGhost=cell(0,-2),railCell=cell(0,-1);
  api.preview(s.g,"rail",[railGhost,diagonalGhost,railCell]);
  api.updateBuildPreview(-1,-2);
  assert.equal(railGhost.dataset.supportBenefits,"cryo:1:false","Ghost Rail receives installed edge Cryo");
  api.updateBuildPreview(0,-2);
  assert.equal(diagonalGhost.dataset.supportBenefits,"","Diagonal Rail ghost gets no bonus badge");
  s.g.ship.tiles.delete("-1,-1");
  const cryoGhost=cell(-1,-1);
  api.preview(s.g,"cryo",[cryoGhost,railCell]);api.updateBuildPreview(-1,-1);
  assert.equal(railCell.dataset.supportBenefits,"cryo:1:false:preview","Ghost Cryo previews bonus on edge Rail");
  api.updateBuildPreview(-1,-2);
  assert.equal(railCell.dataset.supportBenefits,"","Ghost Cryo cannot promise a diagonal combo");
});

check("Crowd effect caps suppress only visuals, preserving the damage bonus", () => {
  for(const [quality,limit]of [[0,120],[1,90],[2,65]]) {
    const s=fresh(),enemy=target(s,"cold");api.save.settings.qualityTier=quality;
    s.g.effects=Array.from({length:limit-1},()=>({type:"ring"}));
    s.g.spawnCryoShatter(enemy,enemy.x,enemy.y,0);
    assert.equal(s.g.effects.length,limit,"One remaining effect slot may be used");
    s.g.spawnCryoShatter(enemy,enemy.x,enemy.y,0);
    assert.equal(s.g.effects.length,limit,"The quality-specific cap blocks further shatter effects");
    s.g.effects=Array.from({length:limit},()=>({type:"ring"}));
    const shot=fire(s,enemy);resolve(s.g);
    near(10000-enemy.hp,shot.damage*1.25,"VFX budgets cannot suppress actual combo damage");
    assert.equal(shatters(s.g).length,0);
  }
});

check("Shatter rendering stays finite, respects quality/reduced flashes and preserves state", () => {
  const state={globalAlpha:.4,globalCompositeOperation:"multiply",shadowBlur:8,
    strokeStyle:"#fff",fillStyle:"#000",lineWidth:2};
  for(const [quality,reduced,count]of [[0,false,7],[1,false,5],[2,false,3],[0,true,3]]) {
    const stack=[],calls=[],ctx=new Proxy({...state},{get(target,key){
      if(key in target)return target[key];
      if(key==="save")return()=>stack.push({...target});
      if(key==="restore")return()=>{assert.ok(stack.length);Object.assign(target,stack.pop());};
      return(...args)=>{for(const value of args)if(typeof value==="number")assert.ok(Number.isFinite(value),"Finite "+key);calls.push(key);};
    }});
    const effect={life:.2,maxLife:.24,radius:32,angle:.7},before=JSON.stringify(effect);
    const random=bootstrap.runtime.Math.random;
    bootstrap.runtime.Math.random=()=>{throw new Error("Rendering consumed combat RNG");};
    try {bootstrap.runtime.DriftColdVfx.shatter(ctx,effect,{x:200,y:300},reduced,quality);}
    finally {bootstrap.runtime.Math.random=random;}
    assert.equal(calls.filter(call=>call==="fill").length,count,"Quality controls visible ice shard count");
    assert.equal(calls.includes("arc"),false,"Shatter has no expanding ring");
    assert.equal(stack.length,0);for(const [key,value]of Object.entries(state))assert.equal(ctx[key],value);
    assert.equal(JSON.stringify(effect),before,"Rendering cannot mutate the gameplay effect");
  }
});

console.log(JSON.stringify({passed:true,source:sourcePath,checks}));
