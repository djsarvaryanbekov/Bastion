"use strict";

// Runtime contract checks for the Cryo + Missile combo. Accepts game.js or a standalone HTML.
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
  source = runtimes[0];
  coldSource = cold[0];
}

const marker = "    window.__driftBastion = {";
assert.equal(source.split(marker).length, 2, "Expected one fixture injection point");
source = source.replace(marker, `
    window.cryoMissileTest = {Game,makeTile,save,defaultSave,MODULES,upgrades:runUpgrades,
      receivesCryoCombo:receivesCryoCombo,
      activate:function(instance){game=instance;}};
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
const api = bootstrap.runtime.cryoMissileTest;
assert.equal(typeof api.Game.prototype.hasCryoNeighbor, "function", "Cryo adjacency API exists");
assert.equal(typeof api.receivesCryoCombo, "function", "Cryo combo eligibility API exists");
const fixtureSave = api.defaultSave();
fixtureSave.settings.muted = true;
fixtureSave.settings.damageNumbers = false;

const checks = [];
function check(label, run) { run(); checks.push(label); }
function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${label}: ${actual} != ${expected}`);
}
function add(g, type, x, y) {
  const tile = api.makeTile(type, x, y, type === "core", 1, true);
  tile.cooldown = 999;
  g.ship.tiles.set(`${x},${y}`, tile);
  g.applyFamilyTileStats(tile, true);
  return tile;
}
function fresh(cryoX = -1, cryoY = -1) {
  Object.assign(api.save, fixtureSave);
  const g = new api.Game();
  g.operation = null; g.elapsed = 1;
  g.enemies = []; g.enemyById.clear(); g.enemyGrid.clear();
  g.projectiles = []; g.effects = []; g.particles = []; g.ship.tiles.clear();
  add(g, "core", 0, 0);
  const missile = add(g, "missile", 0, -1);
  const cryo = cryoX === null ? null : add(g, "cryo", cryoX, cryoY);
  api.activate(g);
  return {g, missile, cryo, origin:g.gridToWorld(0, -1)};
}
function enemy(s, x, y, type = "colossus") {
  const victim = type === "boss" ? (s.g.spawnBoss(), s.g.boss) : s.g.spawnEnemy(type, x, y);
  victim.x = x; victim.y = y; victim.hp = victim.maxHp = 10000;
  victim.speed = victim.vx = victim.vy = 0; victim.fireClock = 999;
  s.g.rebuildEnemyGrid();
  return victim;
}
function upgrade(s, ids) {
  const data = {}, licenses = api.upgrades.trees.missile.branches.map(branch => "missile:" + branch.id);
  for (const id of ids) assert.ok(api.upgrades.purchase(data, "missile", id, 1e8, 1, undefined, licenses), `Purchase ${id}`);
  s.g.upgrades.missile = data.missile;
  return s.g.weaponDefinitions.missile = api.upgrades.resolve(api.MODULES.missile, data.missile);
}
function fire(s, target, def = s.g.weaponDefinitions.missile) {
  const dx = target.x - s.origin.x, dy = target.y - s.origin.y, length = Math.hypot(dx, dy);
  const before = s.g.projectiles.length;
  s.g.fireAttack(s.missile, s.origin, dx / length, dy / length, def, target, 1);
  return s.g.projectiles.slice(before);
}
function explode(s, projectile) { s.g.explodeMissile(projectile); }
function resolve(g) {
  for (let frame = 0; g.projectiles.length && frame < 240; frame += 1) g.updateProjectiles(1 / 120);
  assert.equal(g.projectiles.length, 0, "Fixture projectiles resolve");
}
function fireRail(s, rail, target) {
  const origin = s.g.gridToWorld(rail.x, rail.y), dx = target.x - origin.x, dy = target.y - origin.y;
  s.g.fireAttack(rail, origin, dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy), s.g.weaponDefinitions.rail, target, 1);
  return s.g.projectiles.at(-1);
}
function status(victim) {
  return JSON.stringify({slowFactor:victim.slowFactor,slowTimer:victim.slowTimer,
    freezeUntil:victim.freezeUntil,freezeImmuneUntil:victim.freezeImmuneUntil,
    freezeHitTimes:victim.freezeHitTimes,burnDamage:victim.burnDamage,burnTimer:victim.burnTimer,
    burnTickTime:victim.burnTickTime,spreadBurn:victim.spreadBurn});
}

check("Only Rail and Missile receive edge-adjacent Cryo", () => {
  assert.equal(api.receivesCryoCombo("rail"), true);
  assert.equal(api.receivesCryoCombo("missile"), true);
  for (const type of ["cannon", "laser", "scatter", "flak", "cryo", "ember", "mine", "arc", "pulse", "gravity", "armor"]) {
    assert.equal(api.receivesCryoCombo(type), false, `${type} must not receive Cryo`);
  }
  const s = fresh();
  assert.equal(s.g.hasCryoNeighbor(s.missile), true, "Installed Missile has edge Cryo");
  assert.equal(s.g.hasCryoNeighbor({...s.missile}), false, "Lookalike does not inherit adjacency");
  s.g.ship.tiles.delete("-1,-1");
  assert.equal(s.g.hasCryoNeighbor(s.missile), false, "Future volleys recheck current adjacency");
  for (const [x, y, expected] of [[1,-1,true], [0,-2,true], [0,0,true], [1,-2,false]]) {
    const placement = fresh(null); add(placement.g, "cryo", x, y);
    assert.equal(placement.g.hasCryoNeighbor(placement.missile), expected, `Missile adjacency ${x},${y}`);
  }
});

check("Every actual Missile discharge snapshots Cryo, and pooled projectiles clear it", () => {
  const s = fresh(), victim = enemy(s, s.origin.x + 180, s.origin.y);
  const salvo = upgrade(s, ["base1", "base2", "salvo"]);
  const shots = fire(s, victim, salvo);
  assert.equal(shots.length, salvo.shots, "Salvo retains its shot count");
  assert.ok(shots.every(shot => shot.kind === "missile" && shot.coldPayload === true), "Each discharge snapshots cold payload");
  s.g.ship.tiles.delete("-1,-1");
  shots[0].x = victim.x; shots[0].y = victim.y;
  s.g.updateProjectiles(1 / 120);
  near(victim.slowFactor, .75, "A fired payload persists through source loss and updateProjectiles");
  const later = fire(s, victim, salvo);
  assert.ok(later.every(shot => shot.coldPayload === false), "Later volleys recheck source adjacency");
  for (const [friendly, kind] of [[true,"missile"], [true,"rail"], [true,"cryo"], [true,"cannon"], [false,"enemy"], [false,"sniperShot"]]) {
    const reused = {coldPayload:true, hitIds:new Set([victim.id])};
    s.g.projectilePool.push(reused);
    const projectile = s.g.spawnProjectile(friendly, kind, 0, 0, 1, 0, 1, 3, 1, "#fff");
    assert.equal(projectile, reused); assert.equal(projectile.coldPayload, false, `Pool reset clears cold payload for ${kind}`);
    assert.equal(projectile.hitIds.size, 0, `Pool reset clears stale hit history for ${kind}`);
  }
  const reusedEffect = {coldPayload:true}; s.g.effectPool.push(reusedEffect);
  assert.equal(s.g.spawnEffect("ring", 0, 0, .2, "#fff"), reusedEffect);
  assert.equal(reusedEffect.coldPayload, false, "Effect pool reset clears cold payload");
});

check("Cold blasts apply exactly 25% slow for one second inside their existing damage radius", () => {
  const s = fresh(), def = s.g.weaponDefinitions.missile, blastRadius = 74;
  assert.equal(def.damage, 32, "Base Missile damage remains 32");
  const inside = enemy(s, s.origin.x + 10, s.origin.y);
  const edge = enemy(s, s.origin.x + blastRadius, s.origin.y);
  const outside = enemy(s, s.origin.x + blastRadius + .01, s.origin.y);
  const projectile = fire(s, inside)[0]; projectile.x = s.origin.x; projectile.y = s.origin.y;
  assert.equal(projectile.blastRadius || blastRadius, blastRadius, "Base Missile radius remains 74");
  const damageBefore = inside.hp; explode(s, projectile);
  near(inside.slowFactor, .75, "Cold slow factor"); near(inside.slowTimer, 1, "Cold slow duration");
  near(edge.slowFactor, .75, "Radius boundary receives slow"); near(edge.slowTimer, 1, "Radius boundary duration");
  near(outside.slowFactor, 1, "Outside exact radius is unaffected"); near(outside.slowTimer, 0, "Outside has no timer");
  assert.ok(inside.hp < damageBefore, "Cold payload retains ordinary blast damage");
  s.g.updateEnemies(1.01);
  near(inside.slowTimer, 0, "Cold slow expires after one second"); near(inside.slowFactor, 1, "Expired chill restores ordinary movement factor");
});

check("Cold blast never weakens or extends an active stronger slow; equal weak slow refreshes", () => {
  const s = fresh(), victim = enemy(s, s.origin.x, s.origin.y), projectile = fire(s, victim)[0];
  projectile.x = victim.x; projectile.y = victim.y;
  victim.slowFactor = .5; victim.slowTimer = 2.5; explode(s, projectile);
  near(victim.slowFactor, .5, "Direct Cryo remains stronger"); near(victim.slowTimer, 2.5, "Stronger duration is not extended");
  victim.slowFactor = .5; victim.slowTimer = .05; explode(s, projectile);
  near(victim.slowFactor, .5, "Near-expiry direct Cryo remains stronger"); near(victim.slowTimer, .05, "Near-expiry direct Cryo is not extended");
  victim.slowFactor = .5; victim.slowTimer = 0; explode(s, projectile);
  near(victim.slowFactor, .75, "Expired strong slow accepts new missile chill"); near(victim.slowTimer, 1, "Expired strong slow resets to one second");
  victim.slowFactor = .75; victim.slowTimer = .25; explode(s, projectile);
  near(victim.slowFactor, .75, "Equal slow stays weak"); near(victim.slowTimer, 1, "Equal slow refreshes to one second");
  victim.slowFactor = .75; victim.slowTimer = 2; explode(s, projectile);
  near(victim.slowTimer, 2, "Equal stronger remaining duration is retained");
  const boss = enemy(s, victim.x, victim.y, "boss"); explode(s, projectile);
  near(boss.slowFactor, .8, "Boss factor remains max(.8,.75)"); near(boss.slowTimer, 1, "Boss receives the cold duration");
});

check("Unlinked and diagonal missiles remain warm, and lethal blasts chill no dead enemy", () => {
  for (const [cryoX, cryoY, label] of [[null, null, "unlinked"], [1, -2, "diagonal"]]) {
    const s = fresh(cryoX, cryoY), victim = enemy(s, s.origin.x, s.origin.y), projectile = fire(s, victim)[0];
    assert.equal(projectile.coldPayload, false, `${label} missile payload stays warm`);
    projectile.x = victim.x; projectile.y = victim.y; explode(s, projectile);
    near(victim.slowFactor, 1, `${label} blast does not slow`); near(victim.slowTimer, 0, `${label} blast has no timer`);
  }
  const s = fresh(), victim = enemy(s, s.origin.x, s.origin.y); victim.hp = 1;
  const matter = s.g.matter, projectile = fire(s, victim)[0]; projectile.x = victim.x; projectile.y = victim.y; explode(s, projectile);
  assert.equal(victim.dead, true, "Lethal missile still kills"); assert.ok(s.g.matter > matter, "Lethal missile grants its normal payout once");
  near(victim.slowTimer, 0, "Dead enemy receives no chill timer"); near(victim.slowFactor, 1, "Dead enemy receives no chill factor");
});

check("A real Missile chill enables linked Rail Shatter, while warm or unlinked Rails stay ordinary", () => {
  const linked = fresh(0, 0), rail = add(linked.g, "rail", 1, 0), target = enemy(linked, linked.g.gridToWorld(1, 0).x + 120, linked.g.gridToWorld(1, 0).y);
  const missile = fire(linked, target)[0]; missile.x = target.x; missile.y = target.y; explode(linked, missile); missile.life = 0; linked.g.compactProjectiles();
  const shot = fireRail(linked, rail, target); resolve(linked.g);
  near(10000 - target.hp - 32, shot.damage * 1.25, "Linked Rail gains 25% against actual Missile chill");
  const warm = fresh(0, 0), warmRail = add(warm.g, "rail", 1, 0), warmTarget = enemy(warm, warm.g.gridToWorld(1, 0).x + 120, warm.g.gridToWorld(1, 0).y);
  const warmShot = fireRail(warm, warmRail, warmTarget); resolve(warm.g);
  near(10000 - warmTarget.hp, warmShot.damage, "Linked Rail stays ordinary against warm target");
  const unlinked = fresh(0, 0), unlinkedRail = add(unlinked.g, "rail", 2, 0), unlinkedTarget = enemy(unlinked, unlinked.g.gridToWorld(2, 0).x + 120, unlinked.g.gridToWorld(2, 0).y);
  unlinkedTarget.slowFactor = .75; unlinkedTarget.slowTimer = 1;
  const unlinkedShot = fireRail(unlinked, unlinkedRail, unlinkedTarget); resolve(unlinked.g);
  near(10000 - unlinkedTarget.hp, unlinkedShot.damage, "Unlinked Rail does not gain Missile chill bonus");
});

check("Linked payload does not change base, Heavy, Cluster, or Salvo blast damage", () => {
  const paths = [[], ["base1","base2","heavy"], ["base1","base2","heavy","heavy","cluster"], ["base1","base2","salvo"]];
  for (const path of paths) {
    function blastDamage(linked) {
      const s = fresh(linked ? -1 : null), def = path.length ? upgrade(s, path) : s.g.weaponDefinitions.missile;
      const victim = enemy(s, s.origin.x, s.origin.y), projectile = fire(s, victim, def)[0];
      projectile.x = victim.x; projectile.y = victim.y; explode(s, projectile);
      return 10000 - victim.hp;
    }
    near(blastDamage(true), blastDamage(false), `${path.join("/") || "base"} damage is unchanged by payload`);
  }
});

check("Actual boss contact detonates through the blast gap at varied steps without a damage bonus", () => {
  function flyIntoBoss(linked, dt, phase) {
    const s = fresh(linked ? 0 : null, linked ? 0 : null);
    const boss = enemy(s, s.origin.x + 220 + phase, s.origin.y, "boss");
    const shot = fire(s, boss)[0];
    assert.ok(shot && shot.kind === "missile", "Fixture fires a real Missile");
    for (let step = 0; step < Math.ceil(3.4 / dt) && s.g.projectiles.length; step += 1) s.g.updateProjectiles(dt);
    assert.equal(s.g.projectiles.length, 0, "Real Missile resolves during its normal lifetime");
    return {loss:10000 - boss.hp, factor:boss.slowFactor, timer:boss.slowTimer};
  }
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    for (const phase of [0, .37, .73]) {
      const cold = flyIntoBoss(true, dt, phase), warm = flyIntoBoss(false, dt, phase);
      assert.ok(cold.loss > 0, `Linked boss takes missile damage at dt=${dt}, phase=${phase}`);
      assert.ok(warm.loss > 0, `Unlinked boss takes missile damage at dt=${dt}, phase=${phase}`);
      near(cold.loss, warm.loss, `Cryo payload has no boss damage bonus at dt=${dt}, phase=${phase}`);
      near(cold.factor, .8, `Linked boss keeps Cryo-resistant factor at dt=${dt}, phase=${phase}`);
      assert.ok(cold.timer > 0 && cold.timer <= 1, `Linked boss chill duration is bounded at dt=${dt}, phase=${phase}`);
      near(warm.factor, 1, `Unlinked boss stays at normal factor at dt=${dt}, phase=${phase}`);
      near(warm.timer, 0, `Unlinked boss receives no chill at dt=${dt}, phase=${phase}`);
    }
  }
});

check("Boss hull correction moves only the primary blast and keeps its exact radius", () => {
  function inspectBossImpact(cluster) {
    const s = fresh(0, 0);
    const def = cluster ? upgrade(s, ["base1","base2","heavy","heavy","cluster"]) : s.g.weaponDefinitions.missile;
    const boss = enemy(s, s.origin.x + 220, s.origin.y, "boss");
    // This point is outside the corrected primary radius and clear of the missile's 5-radius flight path.
    const outside = enemy(s, boss.x, boss.y + 74.01);
    const calls = [], original = s.g.explodeBlast;
    s.g.explodeBlast = function(blast, radius, color, particles, type) {
      calls.push({x:blast.x, y:blast.y, radius, color, particles, type, coldPayload:blast.coldPayload});
      return original.call(this, blast, radius, color, particles, type);
    };
    const shot = fire(s, boss, def)[0];
    for (let step = 0; step < 240 && s.g.projectiles.length; step += 1) s.g.updateProjectiles(1 / 120);
    assert.equal(s.g.projectiles.length, 0, "Boss-contact projectile resolves");
    assert.ok(boss.hp < 10000, "Corrected primary blast damages boss");
    if (!cluster) {
      near(outside.hp, 10000, "Enemy outside corrected primary radius receives no damage");
      near(outside.slowFactor, 1, "Enemy outside corrected primary radius receives no slow"); near(outside.slowTimer, 0, "Outside enemy has no chill timer");
    }
    return {boss, shot, calls};
  }
  const base = inspectBossImpact(false);
  assert.equal(base.calls.length, 1, "Base Missile produces only its primary blast");
  near(Math.hypot(base.calls[0].x - base.boss.x, base.calls[0].y - base.boss.y), 72, "Primary is projected to the 72-radius boss hull");
  near(base.calls[0].radius, 74, "Corrected primary preserves its 74-radius damage area");
  const cluster = inspectBossImpact(true);
  assert.equal(cluster.calls.length, 4, "Cluster keeps its three secondary blasts plus primary");
  for (const child of cluster.calls.slice(0, 3)) {
    near(Math.hypot(child.x - cluster.shot.x, child.y - cluster.shot.y), 45, "Cluster children remain centered on original missile impact offsets");
    near(child.radius, 50, "Cluster child radius remains 50");
  }
  near(Math.hypot(cluster.calls[3].x - cluster.boss.x, cluster.calls[3].y - cluster.boss.y), 72, "Only cluster primary moves to the boss hull");
  near(cluster.calls[3].radius, 120, "Cluster primary retains its upgraded radius");
});

check("Cluster secondary cold areas use their exact radius and only slow survivors", () => {
  const s = fresh(), center = s.origin, edge = enemy(s, center.x + 50, center.y), outside = enemy(s, center.x + 50.01, center.y);
  s.g.explodeBlast({x:center.x, y:center.y, damage:1, coldPayload:true}, 50, "#8ac7ff", 0, "missile");
  near(edge.slowFactor, .75, "Cluster boundary receives chill"); near(edge.slowTimer, 1, "Cluster boundary duration");
  near(outside.slowFactor, 1, "Outside cluster radius remains warm"); near(outside.slowTimer, 0, "Outside cluster has no timer");
  const dead = enemy(s, center.x, center.y); dead.hp = .1;
  s.g.explodeBlast({x:center.x, y:center.y, damage:1, coldPayload:true}, 50, "#8ac7ff", 0, "missile");
  assert.equal(dead.dead, true, "Cluster blast kills weak enemy"); near(dead.slowTimer, 0, "Cluster blast does not chill a dead target");
});

check("Cold payload changes no Freeze, burn, reward, or direct Cryo state", () => {
  const s = fresh(), victim = enemy(s, s.origin.x, s.origin.y);
  victim.freezeUntil = 6; victim.freezeImmuneUntil = 9; victim.freezeHitTimes = [1, 1.2, 1.4];
  victim.burnDamage = 12; victim.burnTimer = .7; victim.burnTickTime = .2; victim.spreadBurn = true;
  const before = status(victim), matter = s.g.matter, projectile = fire(s, victim)[0];
  projectile.x = victim.x; projectile.y = victim.y; explode(s, projectile);
  const after = JSON.parse(status(victim)), baseline = JSON.parse(before);
  assert.equal(after.freezeUntil, baseline.freezeUntil); assert.equal(after.freezeImmuneUntil, baseline.freezeImmuneUntil);
  assert.deepEqual(after.freezeHitTimes, baseline.freezeHitTimes); assert.equal(after.burnDamage, baseline.burnDamage);
  assert.equal(after.burnTimer, baseline.burnTimer); assert.equal(after.burnTickTime, baseline.burnTickTime);
  assert.equal(after.spreadBurn, baseline.spreadBurn); assert.equal(s.g.matter, matter, "No reward on surviving blast");
  const cryo = s.cryo, origin = s.g.gridToWorld(cryo.x, cryo.y), dx = victim.x-origin.x, dy = victim.y-origin.y, length = Math.hypot(dx,dy);
  s.g.fireAttack(cryo, origin, dx/length, dy/length, s.g.weaponDefinitions.cryo, victim, 1);
  const direct = s.g.projectiles.at(-1); direct.x = victim.x; direct.y = victim.y; s.g.updateProjectiles(.001);
  near(victim.slowFactor, .5, "Direct Cryo remains factor .5"); near(victim.slowTimer, 2, "Direct Cryo remains two seconds");
});

check("Cluster child blasts propagate cold payload without changing damage, radii, or overlap behavior", () => {
  const s = fresh(), def = upgrade(s, ["base1", "base2", "heavy", "heavy", "cluster"]), center = enemy(s, s.origin.x, s.origin.y);
  const projectile = fire(s, center, def)[0]; projectile.x = center.x; projectile.y = center.y;
  assert.equal(projectile.clusterCount > 0, true, "Cluster upgrade still marks missile");
  const calls = [], original = s.g.explodeBlast;
  s.g.explodeBlast = function(blast, radius, color, particles, type) {
    calls.push({blast:{...blast}, radius, color, particles, type});
    return original.call(this, blast, radius, color, particles, type);
  };
  explode(s, projectile);
  assert.equal(calls.length, 4, "Three secondary blasts plus primary");
  assert.equal(calls.slice(0,3).every(call => call.radius === 50 && call.blast.damage === projectile.damage * .25 && call.blast.coldPayload === true), true, "Child blast contract remains intact and cold");
  assert.equal(calls[3].radius, projectile.blastRadius, "Primary radius remains unchanged");
  near(center.slowFactor, .75, "Overlapping cluster blasts do not stack slow factor"); near(center.slowTimer, 1, "Overlap does not stack slow duration");
});

check("Heavy and Salvo retain their ordinary damage, radius, homing, cooldown, and fire counts", () => {
  for (const ids of [["base1","base2","heavy"], ["base1","base2","salvo"]]) {
    const s = fresh(), def = upgrade(s, ids), victim = enemy(s, s.origin.x + 180, s.origin.y);
    const shots = fire(s, victim, def);
    assert.equal(shots.length, def.shots || 1, `${ids.join("/")} count`);
    assert.ok(shots.every(shot => shot.damage === def.damage && shot.blastRadius === (def.blastRadius || 0) && shot.targetId === victim.id && shot.coldPayload), `${ids.join("/")} keeps projectile stats`);
    s.missile.cooldown = 0; s.g.updateWeapons(0);
    near(s.missile.cooldown, def.cooldown, `${ids.join("/")} cooldown`);
  }
});

check("Cold missile blast rendering is finite, deterministic, and quality-bounded", () => {
  const initialState = {globalAlpha:.4, globalCompositeOperation:"multiply", shadowBlur:7, fillStyle:"#000", strokeStyle:"#fff", lineWidth:2};
  for (const [quality, reduced, expectedFills] of [[0,false,13], [1,false,9], [2,false,6], [0,true,6]]) {
    const stack = [], calls = [];
    const ctx = new Proxy({...initialState}, {get(target, key) {
      if (key in target) return target[key];
      if (key === "save") return () => stack.push({...target});
      if (key === "restore") return () => Object.assign(target, stack.pop());
      return (...args) => { for (const value of args) if (typeof value === "number") assert.ok(Number.isFinite(value), `Finite ${String(key)}`); calls.push(key); };
    }});
    const effect = {life:.2, maxLife:.28, maxRadius:74}, before = JSON.stringify(effect), random = bootstrap.runtime.Math.random;
    bootstrap.runtime.Math.random = () => { throw new Error("Cold blast renderer consumed combat RNG"); };
    try { bootstrap.runtime.DriftColdVfx.blast(ctx, effect, {x:200,y:300}, reduced, quality); }
    finally { bootstrap.runtime.Math.random = random; }
    assert.equal(calls.filter(call => call === "fill").length, expectedFills, "Quality controls cold blast shards");
    assert.equal(stack.length, 0, "Cold blast balances canvas state");
    for (const [key, value] of Object.entries(initialState)) assert.equal(ctx[key], value, `Cold blast restores ${key}`);
    assert.equal(JSON.stringify(effect), before, "Cold blast renderer cannot mutate gameplay effect");
  }
});

check("Checker fixtures leave the save state unchanged", () => {
  assert.equal(JSON.stringify(api.save), JSON.stringify(fixtureSave), "Runtime fixture actions do not mutate fixture save data");
});

console.log(JSON.stringify({passed:true, source:sourcePath, checks}));
